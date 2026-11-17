use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};
#[cfg(desktop)]
mod desktop;
#[cfg(desktop)]
use tauri::Manager;
#[cfg(desktop)]
struct DesktopSlot(std::sync::Mutex<Option<desktop::DesktopAudio>>);
#[cfg(desktop)]
fn desktop_request<R: Runtime>(
    app: &tauri::AppHandle<R>,
    command: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let slot = app.state::<DesktopSlot>();
    let mut audio = slot.0.lock().map_err(|e| e.to_string())?;
    // Windows media controls require the main window, which is absent during plugin setup.
    if audio.is_none() {
        *audio = Some(desktop::start(app).map_err(|e| e.to_string())?);
    }
    audio
        .as_ref()
        .ok_or("Audio runtime unavailable")?
        .request(command)
}
#[cfg(mobile)]
use tauri::{plugin::PluginHandle, Manager};
#[cfg(mobile)]
struct AudioHandle<R: Runtime>(PluginHandle<R>);
#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_audio_player);

#[tauri::command]
async fn snapshot<R: Runtime>(_app: tauri::AppHandle<R>) -> Result<serde_json::Value, String> {
    #[cfg(mobile)]
    {
        _app.state::<AudioHandle<R>>()
            .0
            .run_mobile_plugin("snapshot", serde_json::json!({}))
            .map_err(|e| e.to_string())
    }
    #[cfg(not(mobile))]
    {
        desktop_request(&_app, serde_json::json!({"op":"snapshot"}))
    }
}
#[tauri::command]
async fn execute<R: Runtime>(
    _app: tauri::AppHandle<R>,
    command: serde_json::Value,
) -> Result<serde_json::Value, String> {
    #[cfg(mobile)]
    {
        _app.state::<AudioHandle<R>>()
            .0
            .run_mobile_plugin("execute", serde_json::json!({"command": command}))
            .map_err(|e| e.to_string())
    }
    #[cfg(not(mobile))]
    {
        desktop_request(&_app, command)
    }
}
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("audio-player")
        .invoke_handler(tauri::generate_handler![snapshot, execute])
        .setup(|_app, _api| {
            #[cfg(target_os = "ios")]
            let handle = _api.register_ios_plugin(init_plugin_audio_player)?;
            #[cfg(target_os = "android")]
            let handle = _api.register_android_plugin("com.dds.audio", "AudioPlayerPlugin")?;
            #[cfg(mobile)]
            _app.manage(AudioHandle(handle));
            #[cfg(desktop)]
            _app.manage(DesktopSlot(std::sync::Mutex::new(None)));
            Ok(())
        })
        .build()
}
