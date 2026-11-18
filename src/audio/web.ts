import { verifiedAudioBytes } from "./binary";
import { cachedAudio } from "./cache";
import { catalogSchema, emptyState, type AudioBackend, type AudioCommand, type AudioState } from "./model";
const key = "little-days.audio.v1";
export class WebAudioBackend implements AudioBackend {
  private audio = new Audio();
  private state: AudioState = { ...emptyState };
  private objectUrl: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private serial: Promise<unknown> = Promise.resolve();
  constructor() {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const saved: AudioState = JSON.parse(raw);
        this.state = { ...emptyState, tracks: catalogSchema.parse(saved.tracks), trackId: saved.trackId,
          downloaded: Array.isArray(saved.downloaded) ? saved.downloaded : [], repeat: saved.repeat !== false,
          position: Number.isFinite(saved.position) ? saved.position : 0 };
      } catch { this.state.error = "Saved audio library could not be read."; }
    }
    this.audio.loop = this.state.repeat;
    this.audio.addEventListener("ended", () => { this.state.playing = false; this.persist(); });
    this.audio.addEventListener("error", () => { this.state.error = "Audio could not be played."; this.state.playing = false; });
    this.audio.addEventListener("waiting", () => { this.state.buffering = true; });
    this.audio.addEventListener("playing", () => { this.state.playing = true; this.state.buffering = false; });
    this.audio.addEventListener("pause", () => { this.state.playing = false; this.persist(); });
    if (navigator.mediaSession) {
      const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
        ["play", () => { void this.execute({ op: "play" }).catch(error => console.error("Media session play failed", error)); }],
        ["pause", () => { void this.execute({ op: "pause" }).catch(error => console.error("Media session pause failed", error)); }],
        ["seekto", event => { if (event.seekTime !== undefined) void this.execute({ op: "seek", position: event.seekTime }).catch(error => console.error("Media session seek failed", error)); }],
      ];
      for (const [action, handler] of actions) {
        try { navigator.mediaSession.setActionHandler(action, handler); }
        catch (error) { console.warn(`Media action ${action} is unavailable`, error); }
      }
    }
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") this.expire(); this.persist(); });
  }
  private persist() { localStorage.setItem(key, JSON.stringify(this.state)); }
  private expire() {
    if (this.state.deadline && Date.now() >= this.state.deadline) {
      this.audio.pause(); this.state.deadline = null; this.persist();
    }
  }
  async snapshot() {
    this.expire();
    if (this.audio.src) this.state.position = this.audio.currentTime;
    this.state.duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
    if (navigator.mediaSession) navigator.mediaSession.playbackState = this.state.playing ? "playing" : "paused";
    return { ...this.state };
  }
  execute(command: AudioCommand) {
    if (command.op === "download") return this.run(command);
    const result = this.serial.then(() => this.run(command));
    this.serial = result.catch(() => {});
    return result;
  }
  private async run(command: AudioCommand): Promise<AudioState> {
    this.state.error = null;
    try {
      switch (command.op) {
        case "catalog": {
          const tracks = catalogSchema.parse(command.tracks);
          for (const track of tracks) {
            const old = this.state.tracks.find(t => t.id === track.id);
            if (old && old.url !== track.url) throw new Error("Use a new track ID when changing an audio file.");
          }
          const merged = [...this.state.tracks.filter(t => !tracks.some(n => n.id === t.id)), ...tracks];
          if (merged.length > 500) throw new Error("Audio library is too large");
          this.state.tracks = merged; break;
        }
        case "play": {
          const track = this.state.tracks.find(t => t.id === (command.id ?? this.state.trackId));
          if (!track) throw new Error("Choose a track first.");
          if (this.state.trackId !== track.id || !this.audio.src || this.audio.error) {
            this.audio.pause();
            const resume = this.state.trackId === track.id ? this.state.position : 0;
            if (this.state.trackId !== track.id) this.state.deadline = null;
            const blob = await cachedAudio(track.id, "get");
            if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = blob ? URL.createObjectURL(blob) : null;
            this.audio.src = this.objectUrl ?? track.url;
            this.audio.currentTime = resume;
            this.state.trackId = track.id;
            if (navigator.mediaSession && typeof MediaMetadata !== "undefined") navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.artist });
          }
          await this.audio.play(); this.state.playing = true; break;
        }
        case "pause": this.audio.pause(); break;
        case "stop": this.audio.pause(); this.audio.currentTime = 0; this.state.deadline = null; break;
        case "seek": this.audio.currentTime = Math.max(0, Math.min(command.position, this.state.duration || 0)); break;
        case "repeat": this.audio.loop = this.state.repeat = command.enabled; break;
        case "timer":
          if (!Number.isFinite(command.minutes) || command.minutes < 0 || command.minutes > 720) throw new Error("Invalid timer");
          if (this.timer) clearTimeout(this.timer);
          this.state.deadline = command.minutes > 0 ? Date.now() + command.minutes * 60_000 : null;
          if (this.state.deadline) this.timer = setTimeout(() => this.expire(), command.minutes * 60_000);
          break;
        case "cache": {
          const track = this.state.tracks.find(item => item.id === command.id);
          if (!track) throw new Error("Choose a track first.");
          const bytes = await verifiedAudioBytes(command.data, command.sha256);
          await cachedAudio(track.id, "put", new Blob([bytes], { type: "audio/mpeg" }));
          this.state.downloaded = [...new Set([...this.state.downloaded, track.id])];
          break;
        }
        case "download": {
          const track = this.state.tracks.find(t => t.id === command.id);
          if (!track) throw new Error("Choose a track first.");
          if (this.state.downloading.includes(track.id)) return this.snapshot();
          this.state.downloading = [...this.state.downloading, track.id];
          try {
            const response = await fetch(track.url);
            if (!response.ok) throw new Error(`Download failed (${response.status})`);
            const blob = await response.blob();
            if (!blob.size || blob.size > 200 * 1024 * 1024) throw new Error("Audio must be smaller than 200 MB.");
            await cachedAudio(track.id, "put", blob);
            this.state.downloaded = [...new Set([...this.state.downloaded, track.id])];
          } finally { this.state.downloading = this.state.downloading.filter(id => id !== track.id); }
          break;
        }
        case "removeDownload":
          await cachedAudio(command.id, "delete"); this.state.downloaded = this.state.downloaded.filter(id => id !== command.id); break;
      }
      this.persist(); return this.snapshot();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
}
