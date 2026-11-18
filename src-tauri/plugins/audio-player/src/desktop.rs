use base64::Engine as _;
use rodio::{Decoder, OutputStream, OutputStreamBuilder, Sink, Source};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
};
use std::{
    collections::HashSet,
    fs::{self, File},
    io::{Read, Write},
    path::PathBuf,
    sync::mpsc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, Runtime};

type Reply = mpsc::Sender<Result<Value, String>>;
enum Message {
    Command(Value, Reply),
    Downloaded(String, Result<(), String>),
    Remote(Value),
    DeviceFailed(String),
}
pub struct DesktopAudio(mpsc::Sender<Message>);
impl DesktopAudio {
    pub fn request(&self, command: Value) -> Result<Value, String> {
        let (tx, rx) = mpsc::channel();
        self.0
            .send(Message::Command(command, tx))
            .map_err(|e| e.to_string())?;
        rx.recv_timeout(Duration::from_secs(10))
            .map_err(|e| e.to_string())?
    }
}
fn now() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
        * 1000.0
}
fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 80
        && id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
}
fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
struct Engine {
    root: PathBuf,
    state: Value,
    pending: HashSet<String>,
    wanted: bool,
    stream: Option<OutputStream>,
    sink: Option<Sink>,
    tx: mpsc::Sender<Message>,
    controls: Option<MediaControls>,
}
impl Engine {
    fn track(&self, id: &str) -> Option<&Value> {
        self.state["tracks"]
            .as_array()?
            .iter()
            .find(|t| t["id"] == id)
    }
    fn file(&self, id: &str) -> PathBuf {
        self.root.join(format!("{id}.audio"))
    }
    fn persist(&mut self) -> Result<(), String> {
        let temporary = self.root.join("state.tmp");
        fs::write(&temporary, serde_json::to_vec(&self.state).map_err(error)?).map_err(error)?;
        // Windows rename does not replace an existing destination.
        #[cfg(target_os = "windows")]
        if self.root.join("state.json").exists() {
            fs::remove_file(self.root.join("state.json")).map_err(error)?;
        }
        fs::rename(temporary, self.root.join("state.json")).map_err(error)
    }
    fn snapshot(&mut self) -> Value {
        if let Some(sink) = &self.sink {
            let duration = self.state["duration"].as_f64().unwrap_or(0.0);
            let position = sink.get_pos().as_secs_f64();
            self.state["position"] = json!(if self.state["repeat"] == true && duration > 0.0 {
                position % duration
            } else {
                position
            });
            self.state["playing"] = json!(!sink.is_paused() && !sink.empty());
        }
        let downloaded: Vec<_> = self.state["tracks"]
            .as_array()
            .into_iter()
            .flatten()
            .filter_map(|t| t["id"].as_str())
            .filter(|id| self.file(id).exists())
            .collect();
        self.state["downloaded"] = json!(downloaded);
        self.state["downloading"] = json!(self.pending);
        self.state.clone()
    }
    fn load(&mut self) -> Result<(), String> {
        let id = self.state["trackId"]
            .as_str()
            .ok_or("Choose a track first.")?
            .to_owned();
        if !self.file(&id).exists() {
            self.download(&id)?;
            self.state["buffering"] = json!(true);
            return Ok(());
        }
        let source =
            Decoder::try_from(File::open(self.file(&id)).map_err(error)?).map_err(error)?;
        self.state["duration"] = json!(source
            .total_duration()
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0));
        if self.stream.is_none() {
            let tx = self.tx.clone();
            self.stream = Some(
                OutputStreamBuilder::from_default_device()
                    .map_err(error)?
                    .with_error_callback(move |failure| {
                        let _ = tx.send(Message::DeviceFailed(failure.to_string()));
                    })
                    .open_stream()
                    .map_err(error)?,
            );
        }
        let sink = Sink::connect_new(self.stream.as_ref().unwrap().mixer());
        sink.pause();
        if self.state["repeat"] == true {
            let file = File::open(self.file(&id)).map_err(error)?;
            let length = file.metadata().map_err(error)?.len();
            sink.append(
                Decoder::builder()
                    .with_data(std::io::BufReader::new(file))
                    .with_byte_len(length)
                    .with_seekable(true)
                    .build_looped()
                    .map_err(error)?,
            )
        } else {
            sink.append(source)
        }
        let position = self.state["position"].as_f64().unwrap_or(0.0).max(0.0);
        if position > 0.0 {
            sink.try_seek(Duration::from_secs_f64(position))
                .map_err(error)?;
        }
        if self.wanted {
            sink.play();
        }
        self.sink = Some(sink);
        self.state["buffering"] = json!(false);
        Ok(())
    }
    fn download(&mut self, id: &str) -> Result<(), String> {
        let url = self
            .track(id)
            .and_then(|t| t["url"].as_str())
            .ok_or("Unknown audio track")?
            .to_owned();
        if self.pending.contains(id) || self.file(id).exists() {
            return Ok(());
        }
        if self.pending.len() >= 3 {
            return Err("Wait for current downloads to finish.".into());
        }
        self.pending.insert(id.into());
        let id = id.to_owned();
        let file = self.file(&id);
        let tx = self.tx.clone();
        std::thread::spawn(move || {
            let result = (|| -> Result<(), String> {
                let client = reqwest::blocking::Client::builder()
                    .timeout(Duration::from_secs(300))
                    .redirect(reqwest::redirect::Policy::custom(|attempt| {
                        if attempt.url().scheme() != "https" || attempt.previous().len() > 5 {
                            attempt.stop()
                        } else {
                            attempt.follow()
                        }
                    }))
                    .build()
                    .map_err(error)?;
                let response = client
                    .get(url)
                    .send()
                    .map_err(error)?
                    .error_for_status()
                    .map_err(error)?;
                let limit = 200 * 1024 * 1024;
                if response.content_length().unwrap_or(0) > limit {
                    return Err("Audio must be smaller than 200 MB.".into());
                }
                let temporary = file.with_extension("part");
                let outcome = (|| -> Result<(), String> {
                    let mut target = File::create(&temporary).map_err(error)?;
                    let size =
                        std::io::copy(&mut response.take(limit + 1), &mut target).map_err(error)?;
                    if size == 0 || size > limit {
                        return Err("Audio must be smaller than 200 MB.".into());
                    }
                    target.flush().map_err(error)?;
                    Decoder::try_from(File::open(&temporary).map_err(error)?).map_err(error)?;
                    fs::rename(&temporary, &file).map_err(error)?;
                    Ok(())
                })();
                if outcome.is_err() {
                    let _ = fs::remove_file(temporary);
                }
                outcome
            })();
            let _ = tx.send(Message::Downloaded(id, result));
        });
        Ok(())
    }
    fn execute(&mut self, command: Value) -> Result<Value, String> {
        if command["op"] != "snapshot" {
            self.state["error"] = Value::Null;
        }
        match command["op"].as_str().unwrap_or("") {
            "snapshot" => return Ok(self.snapshot()),
            "catalog" => {
                let incoming = command["tracks"].as_array().ok_or("Invalid catalog")?;
                let mut ids = HashSet::new();
                for track in incoming {
                    let id = track["id"].as_str().ok_or("Invalid track ID")?;
                    let url =
                        reqwest::Url::parse(track["url"].as_str().ok_or("Missing audio URL")?)
                            .map_err(error)?;
                    if !valid_id(id)
                        || !ids.insert(id)
                        || url.scheme() != "https"
                        || track["title"].as_str().unwrap_or("").is_empty()
                        || track["license"].as_str().unwrap_or("").is_empty()
                    {
                        return Err("Invalid catalog".into());
                    }
                    if self.track(id).is_some_and(|old| old["url"] != track["url"]) {
                        return Err("Use a new track ID when changing an audio file.".into());
                    }
                }
                let mut tracks: Vec<_> = self.state["tracks"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .filter(|t| !ids.contains(t["id"].as_str().unwrap_or("")))
                    .cloned()
                    .collect();
                tracks.extend(incoming.iter().cloned());
                if tracks.len() > 500 {
                    return Err("Audio library is too large".into());
                }
                self.state["tracks"] = json!(tracks);
            }
            "toggle" => {
                return self.execute(json!({"op": if self.wanted { "pause" } else { "play" }}))
            }
            "play" => {
                let id = command["id"]
                    .as_str()
                    .or(self.state["trackId"].as_str())
                    .ok_or("Choose a track first.")?
                    .to_owned();
                if self.track(&id).is_none() {
                    return Err("Choose a track first.".into());
                }
                if self.state["trackId"] != id {
                    self.sink = None;
                    if let Some(controls) = &mut self.controls {
                        let _ = controls.set_playback(MediaPlayback::Stopped);
                    }
                    self.state["position"] = json!(0);
                    self.state["deadline"] = Value::Null;
                }
                self.state["trackId"] = json!(id);
                self.wanted = true;
                if self.sink.as_ref().is_some_and(|s| s.empty()) {
                    self.state["position"] = json!(0);
                    self.sink = None;
                }
                if self.sink.is_none() {
                    self.load()?;
                } else {
                    self.sink.as_ref().unwrap().play();
                }
            }
            "pause" | "stop" => {
                self.wanted = false;
                if let Some(sink) = &self.sink {
                    sink.pause();
                }
                if command["op"] == "stop" {
                    self.sink = None;
                    if let Some(controls) = &mut self.controls {
                        let _ = controls.set_playback(MediaPlayback::Stopped);
                    }
                    self.state["position"] = json!(0);
                    self.state["deadline"] = Value::Null;
                }
                self.state["playing"] = json!(false);
                self.state["buffering"] = json!(false);
            }
            "seek" => {
                let position = command["position"]
                    .as_f64()
                    .filter(|v| v.is_finite() && *v >= 0.0 && *v <= 10_000_000.0)
                    .ok_or("Invalid position")?;
                if let Some(sink) = &self.sink {
                    sink.try_seek(Duration::from_secs_f64(position))
                        .map_err(error)?;
                }
                self.state["position"] = json!(position);
            }
            "repeat" => {
                self.snapshot();
                self.state["repeat"] =
                    json!(command["enabled"].as_bool().ok_or("Invalid repeat mode")?);
                if self.sink.is_some() {
                    self.sink = None;
                    self.load()?;
                }
            }
            "timer" => {
                let minutes = command["minutes"]
                    .as_f64()
                    .filter(|v| v.is_finite() && *v >= 0.0 && *v <= 720.0)
                    .ok_or("Invalid timer")?;
                self.state["deadline"] = if minutes > 0.0 {
                    json!(now() + minutes * 60000.0)
                } else {
                    Value::Null
                };
            }
            "cache" => {
                let id = command["id"]
                    .as_str()
                    .filter(|id| valid_id(id))
                    .ok_or("Unknown audio track")?;
                if self.track(id).is_none() || self.pending.contains(id) {
                    return Err("Invalid audio cache request".into());
                }
                let encoded = command["data"]
                    .as_str()
                    .filter(|value| value.len() <= 28 * 1024 * 1024)
                    .ok_or("Invalid audio cache payload")?;
                let bytes = base64::engine::general_purpose::STANDARD
                    .decode(encoded)
                    .map_err(error)?;
                if bytes.is_empty()
                    || bytes.len() > 20 * 1024 * 1024
                    || format!("{:x}", Sha256::digest(&bytes))
                        != command["sha256"].as_str().unwrap_or("")
                {
                    return Err("Audio checksum did not match.".into());
                }
                let destination = self.file(id);
                if !destination.exists() || fs::read(&destination).map_err(error)? != bytes {
                    if self.state["trackId"] == id && self.sink.is_some() {
                        return Err("Stop this track before replacing its download.".into());
                    }
                    let temporary = destination.with_extension("cache");
                    let result = (|| -> Result<(), String> {
                        fs::write(&temporary, &bytes).map_err(error)?;
                        Decoder::try_from(File::open(&temporary).map_err(error)?).map_err(error)?;
                        #[cfg(target_os = "windows")]
                        if destination.exists() {
                            fs::remove_file(&destination).map_err(error)?;
                        }
                        fs::rename(&temporary, &destination).map_err(error)?;
                        Ok(())
                    })();
                    if result.is_err() {
                        let _ = fs::remove_file(temporary);
                    }
                    result?;
                }
            }
            "download" => self.download(command["id"].as_str().ok_or("Unknown audio track")?)?,
            "removeDownload" => {
                let id = command["id"]
                    .as_str()
                    .filter(|v| valid_id(v))
                    .ok_or("Unknown audio track")?;
                if self.pending.contains(id) || (self.state["trackId"] == id && self.sink.is_some())
                {
                    return Err("Stop this track before removing its download.".into());
                }
                if self.file(id).exists() {
                    fs::remove_file(self.file(id)).map_err(error)?;
                }
            }
            _ => return Err("Unknown audio command".into()),
        }
        self.snapshot();
        self.persist()?;
        self.media();
        Ok(self.state.clone())
    }
    fn media(&mut self) {
        if self.sink.is_none() && !self.wanted {
            return;
        }
        let track = self.state["trackId"]
            .as_str()
            .and_then(|id| self.track(id))
            .cloned();
        if let Some(controls) = &mut self.controls {
            if let Some(track) = track {
                let _ = controls.set_metadata(MediaMetadata {
                    title: track["title"].as_str(),
                    artist: track["artist"].as_str(),
                    duration: self.state["duration"].as_f64().map(Duration::from_secs_f64),
                    ..Default::default()
                });
            }
            let progress = Some(MediaPosition(Duration::from_secs_f64(
                self.state["position"].as_f64().unwrap_or(0.0),
            )));
            let _ = controls.set_playback(if self.state["playing"] == true {
                MediaPlayback::Playing { progress }
            } else {
                MediaPlayback::Paused { progress }
            });
        }
    }
}
pub fn start<R: Runtime>(
    app: &tauri::AppHandle<R>,
) -> Result<DesktopAudio, Box<dyn std::error::Error>> {
    let root = app.path().app_data_dir()?.join("Audio-v1");
    fs::create_dir_all(&root)?;
    let (tx, rx) = mpsc::channel();
    let outgoing = tx.clone();
    #[cfg(target_os = "windows")]
    let hwnd = app
        .get_webview_window("main")
        .and_then(|w| w.hwnd().ok())
        .map(|v| v.0 as usize);
    #[cfg(not(target_os = "windows"))]
    let hwnd: Option<usize> = None;
    std::thread::spawn(move || {
        let mut state = json!({ "tracks": [], "trackId": null, "playing": false, "buffering": false, "position": 0, "duration": 0, "repeat": true, "deadline": null, "downloaded": [], "downloading": [], "error": null });
        match fs::read(root.join("state.json")) {
            Ok(bytes) => match serde_json::from_slice::<Value>(&bytes) {
                Ok(saved) if saved["tracks"].is_array() => state = saved,
                _ => state["error"] = json!("Saved audio library could not be read."),
            },
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => (),
            Err(e) => state["error"] = json!(e.to_string()),
        }
        state["playing"] = json!(false);
        state["buffering"] = json!(false);
        state["deadline"] = Value::Null;
        let mut controls = MediaControls::new(PlatformConfig {
            dbus_name: "little_days",
            display_name: "Little days",
            hwnd: hwnd.map(|v| v as *mut std::ffi::c_void),
        })
        .map_err(|failure| eprintln!("System media controls unavailable: {failure:?}"))
        .ok();
        let mut attached = controls.is_some();
        let events = outgoing.clone();
        if let Some(controls) = &mut controls {
            let result = controls.attach(move |event| {
                let command = match event {
                    MediaControlEvent::Play => json!({"op":"play"}),
                    MediaControlEvent::Toggle => json!({"op":"toggle"}),
                    MediaControlEvent::Pause => json!({"op":"pause"}),
                    MediaControlEvent::Stop => json!({"op":"stop"}),
                    MediaControlEvent::SetPosition(position) => {
                        json!({"op":"seek", "position":position.0.as_secs_f64()})
                    }
                    _ => return,
                };
                let _ = events.send(Message::Remote(command));
            });
            if let Err(failure) = result {
                eprintln!("Could not attach system media controls: {failure:?}");
                attached = false;
            }
        }
        state["systemControls"] = json!(attached);
        let mut engine = Engine {
            root,
            state,
            pending: HashSet::new(),
            wanted: false,
            stream: None,
            sink: None,
            tx: outgoing,
            controls,
        };
        let mut ticks = 0;
        loop {
            match rx.recv_timeout(Duration::from_millis(200)) {
                Ok(Message::Command(command, reply)) => {
                    let result = engine.execute(command);
                    if let Err(ref e) = result {
                        engine.state["error"] = json!(e);
                    }
                    let _ = reply.send(result);
                }
                Ok(Message::DeviceFailed(failure)) => {
                    engine.wanted = false;
                    engine.sink = None;
                    engine.stream = None;
                    engine.state["playing"] = json!(false);
                    engine.state["error"] = json!(failure);
                }
                Ok(Message::Remote(command)) => {
                    if let Err(e) = engine.execute(command) {
                        engine.state["error"] = json!(e);
                    }
                }
                Ok(Message::Downloaded(id, result)) => {
                    engine.pending.remove(&id);
                    if let Err(e) = result {
                        engine.state["error"] = json!(e);
                        if engine.state["trackId"] == id {
                            engine.state["buffering"] = json!(false);
                        }
                    } else if engine.state["trackId"] == id && engine.wanted {
                        if let Err(e) = engine.load() {
                            engine.state["error"] = json!(e);
                            engine.state["buffering"] = json!(false);
                        }
                    }
                    let _ = engine.persist();
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
                Err(mpsc::RecvTimeoutError::Timeout) => (),
            }
            if engine.state["deadline"]
                .as_f64()
                .is_some_and(|deadline| now() >= deadline)
            {
                let _ = engine.execute(json!({"op":"pause"}));
                engine.state["deadline"] = Value::Null;
                let _ = engine.persist();
            }
            ticks += 1;
            if ticks % 5 == 0 {
                engine.snapshot();
                engine.media();
            }
            if ticks % 25 == 0 {
                if let Err(e) = engine.persist() {
                    engine.state["error"] = json!(e);
                }
            }
        }
    });
    Ok(DesktopAudio(tx))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn engine() -> Engine {
        static COUNTER: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
        let root = std::env::temp_dir().join(format!(
            "little-days-audio-test-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
        ));
        fs::create_dir_all(&root).unwrap();
        let (tx, _) = mpsc::channel();
        Engine {
            root,
            state: json!({"tracks":[],"trackId":null,"position":0,"duration":0,"repeat":true,"deadline":null}),
            pending: HashSet::new(),
            wanted: false,
            stream: None,
            sink: None,
            tx,
            controls: None,
        }
    }
    #[test]
    fn rejects_unsafe_sources_and_keeps_existing_catalog_on_conflict() {
        let mut engine = engine();
        let track = json!({"id":"moon","title":"Moon","artist":"Author","url":"https://example.com/moon.mp3","license":"Permission","category":"sleep","lyrics":""});
        engine
            .execute(json!({"op":"catalog","tracks":[track.clone()]}))
            .unwrap();
        let mut changed = track.clone();
        changed["url"] = json!("https://example.com/replaced.mp3");
        assert!(engine
            .execute(json!({"op":"catalog","tracks":[changed]}))
            .is_err());
        assert_eq!(engine.state["tracks"][0]["url"], track["url"]);
        let mut escaped = track.clone();
        escaped["id"] = json!("../outside");
        assert!(engine
            .execute(json!({"op":"catalog","tracks":[escaped]}))
            .is_err());
        let mut local = track;
        local["id"] = json!("private");
        local["url"] = json!("file:///private/audio");
        assert!(engine
            .execute(json!({"op":"catalog","tracks":[local]}))
            .is_err());
        fs::remove_dir_all(engine.root).unwrap();
    }
    #[test]
    fn validates_timers_and_persists_deadlines_without_loading_audio() {
        let mut engine = engine();
        assert!(engine.execute(json!({"op":"timer","minutes":-1})).is_err());
        assert!(engine
            .execute(json!({"op":"seek","position":1e300}))
            .is_err());
        engine.execute(json!({"op":"timer","minutes":15})).unwrap();
        assert!(engine.state["deadline"].as_f64().unwrap() > now() + 899_000.0);
        engine.execute(json!({"op":"timer","minutes":0})).unwrap();
        let persisted: Value =
            serde_json::from_slice(&fs::read(engine.root.join("state.json")).unwrap()).unwrap();
        assert!(persisted["deadline"].is_null());
        fs::remove_dir_all(engine.root).unwrap();
    }
    #[test]
    fn packaged_recordings_decode_and_cache_with_the_catalog_checksums() {
        let mut engine = engine();
        let public = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../public");
        let catalog: Value =
            serde_json::from_slice(&fs::read(public.join("audio/catalog.json")).unwrap()).unwrap();
        for resource in catalog["resources"].as_array().unwrap() {
            engine
                .execute(json!({"op":"catalog","tracks":[resource]}))
                .unwrap();
            let bytes = fs::read(public.join(resource["assetPath"].as_str().unwrap())).unwrap();
            engine.execute(json!({"op":"cache","id":resource["id"],"data":base64::engine::general_purpose::STANDARD.encode(&bytes),"sha256":resource["sha256"]})).unwrap();
            assert_eq!(
                fs::read(engine.file(resource["id"].as_str().unwrap())).unwrap(),
                bytes
            );
        }
        fs::remove_dir_all(engine.root).unwrap();
    }
    #[test]
    #[ignore = "requires a local audio output device"]
    fn cached_audio_decodes_loops_and_seeks_on_native_output() {
        let mut engine = engine();
        engine.execute(json!({"op":"catalog","tracks":[{"id":"native","title":"Native test","artist":"Test","url":"https://example.com/test.wav","license":"Original fixture","category":"sleep","lyrics":""}]})).unwrap();
        let samples = 800u32;
        let mut wav = Vec::new();
        wav.extend_from_slice(b"RIFF");
        wav.extend_from_slice(&(36 + samples * 2).to_le_bytes());
        wav.extend_from_slice(b"WAVEfmt ");
        wav.extend_from_slice(&16u32.to_le_bytes());
        wav.extend_from_slice(&1u16.to_le_bytes());
        wav.extend_from_slice(&1u16.to_le_bytes());
        wav.extend_from_slice(&8000u32.to_le_bytes());
        wav.extend_from_slice(&16000u32.to_le_bytes());
        wav.extend_from_slice(&2u16.to_le_bytes());
        wav.extend_from_slice(&16u16.to_le_bytes());
        wav.extend_from_slice(b"data");
        wav.extend_from_slice(&(samples * 2).to_le_bytes());
        wav.resize(wav.len() + samples as usize * 2, 0);
        let digest = format!("{:x}", Sha256::digest(&wav));
        let encoded = base64::engine::general_purpose::STANDARD.encode(&wav);
        assert!(engine
            .execute(json!({"op":"cache","id":"native","data":encoded,"sha256":"0".repeat(64)}))
            .is_err());
        assert!(!engine.file("native").exists());
        engine
            .execute(json!({"op":"cache","id":"native","data":encoded,"sha256":digest}))
            .unwrap();
        engine.execute(json!({"op":"play","id":"native"})).unwrap();
        std::thread::sleep(Duration::from_millis(300));
        let state = engine.snapshot();
        assert_eq!(state["playing"], true);
        assert!(state["duration"].as_f64().unwrap() > 0.0);
        assert!(state["position"].as_f64().unwrap() < 0.11);
        engine.execute(json!({"op":"pause"})).unwrap();
        engine
            .execute(json!({"op":"seek","position":0.04}))
            .unwrap();
        engine.execute(json!({"op":"stop"})).unwrap();
        assert_eq!(engine.snapshot()["playing"], false);
        fs::remove_dir_all(engine.root).unwrap();
    }
}
