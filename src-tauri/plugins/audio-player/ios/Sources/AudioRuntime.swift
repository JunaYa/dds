import AVFoundation
import MediaPlayer
import Foundation
import WidgetKit

public struct AudioTrack: Codable {
    public let id: String
    public let title: String
    public let artist: String
    public let category: String
    public let url: String
    public let sourcePage: String?
    public let license: String
    public let lyrics: String
}
public struct AudioRequest: Decodable {
    public var op: String
    public var id: String?
    public var tracks: [AudioTrack]?
    public var position: Double?
    public var enabled: Bool?
    public var minutes: Double?
    public init(op: String, id: String? = nil) { self.op = op; self.id = id }
}
private struct AudioSaved: Codable {
    var tracks: [AudioTrack] = []
    var trackId: String?
    var position: Double = 0
    var repeating = true
    var deadline: Double?
}
private struct AudioFailure: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}
public final class AudioRuntime {
    public static let shared = AudioRuntime()
    private let player = AVQueuePlayer()
    private var looper: AVPlayerLooper?
    private var activeItem: AVPlayerItem?
    private var saved = AudioSaved()
    private var failure: String?
    private var downloading: Set<String> = []
    private var observer: Any?
    private var playbackObserver: NSKeyValueObservation?
    private var itemObserver: NSKeyValueObservation?
    private var tick: Timer?
    private var count = 0
    private var resumeAfterInterruption = false
    private var wantsPlayback = false
    private var knownDuration: Double = 0
    private var group: String { "group." + (Bundle.main.bundleIdentifier ?? "com.dds.app") }
    private lazy var root: URL = {
        let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
            ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Audio-v1", isDirectory: true)
    }()
    private var stateFile: URL { root.appendingPathComponent("state.json") }
    private func mediaFile(_ id: String) -> URL {
        let pathExtension = saved.tracks.first(where: { $0.id == id }).flatMap { URL(string: $0.url)?.pathExtension.lowercased() } ?? "mp3"
        let allowed = ["mp3", "m4a", "aac", "wav", "caf", "aiff", "aif", "flac", "ogg", "opus"]
        return root.appendingPathComponent(id + "." + (allowed.contains(pathExtension) ? pathExtension : "mp3"))
    }
    private func validID(_ id: String) -> Bool { id.range(of: "^[a-zA-Z0-9_-]{1,80}$", options: .regularExpression) != nil }
    private init() {
        do {
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            try FileManager.default.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: root.path)
            if FileManager.default.fileExists(atPath: stateFile.path) {
                saved = try JSONDecoder().decode(AudioSaved.self, from: Data(contentsOf: stateFile))
            }
            saved.deadline = nil
        } catch { failure = error.localizedDescription }
        player.actionAtItemEnd = .advance
        playbackObserver = player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
            DispatchQueue.main.async { self?.persist(); self?.nowPlaying() }
        }
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 1, preferredTimescale: 600), queue: .main) { [weak self] _ in
            guard let self = self else { return }
            self.count += 1
            if self.count % 5 == 0 { self.persist(reloadWidget: false) }
            self.nowPlaying()
        }
        tick = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.expire() }
        NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: nil, queue: .main) { [weak self] note in
            guard let self = self, !self.saved.repeating, let item = note.object as? AVPlayerItem, item === self.activeItem else { return }
            self.player.pause(); self.player.removeAllItems(); self.activeItem = nil
            self.saved.position = 0; self.wantsPlayback = false
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            self.persist(); self.nowPlaying()
        }
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in self?.remote("play"); return .success }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            DispatchQueue.main.async { guard let self = self else { return }; self.remote(self.wantsPlayback ? "pause" : "play") }
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in self?.remote("pause"); return .success }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            DispatchQueue.main.async { self?.player.seek(to: CMTime(seconds: event.positionTime, preferredTimescale: 600)) }
            return .success
        }
        NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] note in
            if (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt) == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue { self?.remote("pause") }
        }
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let self = self, let kind = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt else { return }
            if kind == AVAudioSession.InterruptionType.began.rawValue {
                self.resumeAfterInterruption = self.wantsPlayback; self.player.pause(); self.persist()
            } else {
                let options = (note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt) ?? 0
                if self.resumeAfterInterruption && options & AVAudioSession.InterruptionOptions.shouldResume.rawValue != 0 {
                    self.resumeAfterInterruption = false; self.remote("play")
                }
            }
        }
    }
    private func remote(_ op: String) {
        DispatchQueue.main.async {
            do { try self.execute(AudioRequest(op: op)) }
            catch { self.failure = error.localizedDescription; self.persist() }
        }
    }
    private func finite(_ n: Double) -> Double { n.isFinite ? max(0, n) : 0 }
    public func snapshot() -> [String: Any] {
        expire()
        let tracks = (try? JSONSerialization.jsonObject(with: JSONEncoder().encode(saved.tracks))) as? [[String: Any]] ?? []
        return ["tracks": tracks, "trackId": saved.trackId as Any? ?? NSNull(), "playing": player.timeControlStatus == .playing,
                "buffering": player.timeControlStatus == .waitingToPlayAtSpecifiedRate,
                "position": player.currentItem == nil ? saved.position : finite(player.currentTime().seconds),
                "duration": max(knownDuration, finite(player.currentItem?.duration.seconds ?? 0)), "repeat": saved.repeating,
                "deadline": saved.deadline as Any? ?? NSNull(), "downloaded": saved.tracks.filter { FileManager.default.fileExists(atPath: mediaFile($0.id).path) }.map(\.id),
                "downloading": Array(downloading), "error": failure as Any? ?? NSNull()]
    }
    public func execute(_ request: AudioRequest) throws {
        expire()
        failure = nil
        switch request.op {
        case "catalog":
            let tracks = request.tracks ?? []
            guard tracks.count <= 500, Set(tracks.map(\.id)).count == tracks.count,
                tracks.allSatisfy({ validID($0.id) && URL(string: $0.url)?.scheme == "https" && !$0.title.isEmpty && !$0.license.isEmpty }) else { throw AudioFailure(message: "Invalid audio catalog") }
            for track in tracks {
                if let old = saved.tracks.first(where: { $0.id == track.id }), old.url != track.url { throw AudioFailure(message: "Use a new track ID when changing an audio file.") }
            }
            guard saved.tracks.filter({ old in !tracks.contains { $0.id == old.id } }).count + tracks.count <= 500 else { throw AudioFailure(message: "Audio library is too large") }
            saved.tracks.removeAll { old in tracks.contains { $0.id == old.id } }; saved.tracks += tracks
        case "play":
            let id = request.id ?? saved.trackId
            guard let track = saved.tracks.first(where: { $0.id == id }) else { throw AudioFailure(message: "Choose a track first.") }
            if saved.trackId != track.id || player.currentItem == nil || player.currentItem?.status == .failed || looper?.status == .failed {
                let position = saved.trackId == track.id ? saved.position : 0
                if saved.trackId != track.id { saved.deadline = nil }
                player.pause(); looper = nil; player.removeAllItems()
                let file = mediaFile(track.id)
                let url = FileManager.default.fileExists(atPath: file.path) ? file : URL(string: track.url)!
                knownDuration = 0
                let asset = AVURLAsset(url: url, options: [AVURLAssetPreferPreciseDurationAndTimingKey: true])
                let item = AVPlayerItem(asset: asset)
                player.automaticallyWaitsToMinimizeStalling = !url.isFileURL
                Task {
                    do {
                        let duration = try await asset.load(.duration).seconds
                        await MainActor.run {
                            if self.saved.trackId == track.id { self.knownDuration = duration.isFinite ? max(0, duration) : 0 }
                        }
                    } catch {
                        await MainActor.run { if self.saved.trackId == track.id { self.failure = error.localizedDescription } }
                    }
                }
                if saved.repeating { looper = AVPlayerLooper(player: player, templateItem: item) } else { player.insert(item, after: nil) }
                activeItem = player.currentItem
                saved.trackId = track.id; saved.position = position
                if position > 0 { player.seek(to: CMTime(seconds: position, preferredTimescale: 600)) }
                itemObserver = player.currentItem?.observe(\.status, options: [.new]) { [weak self] item, _ in
                    if item.status == .failed { DispatchQueue.main.async { self?.failure = item.error?.localizedDescription ?? "Audio could not be played."; self?.persist() } }
                }
            }
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default); try session.setActive(true)
            wantsPlayback = true; player.play()
        case "pause":
            if let id = request.id, id != saved.trackId { break }
            wantsPlayback = false; resumeAfterInterruption = false; player.pause()
        case "stop":
            wantsPlayback = false; resumeAfterInterruption = false; player.pause(); looper = nil; player.removeAllItems(); activeItem = nil; saved.position = 0; saved.deadline = nil
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        case "seek":
            let position = request.position ?? 0
            guard position.isFinite, position >= 0 else { throw AudioFailure(message: "Invalid position") }
            player.seek(to: CMTime(seconds: position, preferredTimescale: 600))
        case "repeat":
            let wasPlaying = wantsPlayback
            if player.currentItem != nil { saved.position = finite(player.currentTime().seconds) }; saved.repeating = request.enabled ?? false
            player.pause(); looper = nil; player.removeAllItems()
            if wasPlaying { try execute(AudioRequest(op: "play")) }
        case "timer":
            let minutes = request.minutes ?? 0
            guard minutes.isFinite, minutes >= 0, minutes <= 720 else { throw AudioFailure(message: "Invalid timer") }
            saved.deadline = minutes > 0 ? Date().timeIntervalSince1970 * 1000 + minutes * 60000 : nil
        case "download":
            guard let id = request.id, let track = saved.tracks.first(where: { $0.id == id }) else { throw AudioFailure(message: "Unknown audio track") }
            download(track)
        case "removeDownload":
            guard let id = request.id, validID(id), !downloading.contains(id), !(id == saved.trackId && player.currentItem != nil) else { throw AudioFailure(message: "Stop this track before removing its download.") }
            let file = mediaFile(id)
            if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
        default: throw AudioFailure(message: "Unknown audio command")
        }
        persist(); nowPlaying()
    }
    private func download(_ track: AudioTrack) {
        guard !downloading.contains(track.id) else { return }
        downloading.insert(track.id)
        let destination = mediaFile(track.id)
        URLSession.shared.downloadTask(with: URL(string: track.url)!) { [weak self] temporary, response, error in
            var message: String?
            do {
                if let error = error { throw error }
                guard let temporary = temporary, let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode),
                    response?.url?.scheme == "https" else { throw AudioFailure(message: "Download failed") }
                let size = try FileManager.default.attributesOfItem(atPath: temporary.path)[.size] as? NSNumber
                guard let size = size, size.int64Value > 0, size.int64Value <= 200 * 1024 * 1024 else { throw AudioFailure(message: "Audio must be smaller than 200 MB.") }
                if FileManager.default.fileExists(atPath: destination.path) { _ = try FileManager.default.replaceItemAt(destination, withItemAt: temporary) }
                else { try FileManager.default.moveItem(at: temporary, to: destination) }
            } catch { message = error.localizedDescription }
            let result = message
            DispatchQueue.main.async { self?.downloading.remove(track.id); self?.failure = result; self?.persist() }
        }.resume()
    }
    private func expire() {
        if let deadline = saved.deadline, Date().timeIntervalSince1970 * 1000 >= deadline {
            wantsPlayback = false; player.pause(); saved.deadline = nil; resumeAfterInterruption = false
            do { try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
            catch { failure = error.localizedDescription }
            persist(); nowPlaying()
        }
    }
    private func persist(reloadWidget: Bool = true) {
        if player.currentItem != nil { saved.position = finite(player.currentTime().seconds) }
        do {
            try JSONEncoder().encode(saved).write(to: stateFile, options: .atomic)
            let widget: [String: Any] = ["title": saved.tracks.first(where: { $0.id == saved.trackId })?.title ?? "Little days", "playing": player.timeControlStatus == .playing,
                "tracks": saved.tracks.map { ["id": $0.id, "title": $0.title, "category": $0.category] }, "trackId": saved.trackId as Any? ?? NSNull()]
            try JSONSerialization.data(withJSONObject: widget).write(to: root.appendingPathComponent("widget.json"), options: .atomic)
            if reloadWidget {
                WidgetCenter.shared.reloadTimelines(ofKind: "LittleDaysSleepAudio")
                WidgetCenter.shared.reloadTimelines(ofKind: "LittleDaysSongsAudio")
            }
        } catch { failure = error.localizedDescription }
    }
    private func nowPlaying() {
        guard player.currentItem != nil || wantsPlayback else { return }
        guard let track = saved.tracks.first(where: { $0.id == saved.trackId }) else { return }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [MPMediaItemPropertyTitle: track.title, MPMediaItemPropertyArtist: track.artist,
            MPMediaItemPropertyPlaybackDuration: max(knownDuration, finite(player.currentItem?.duration.seconds ?? 0)),
            MPNowPlayingInfoPropertyElapsedPlaybackTime: finite(player.currentTime().seconds), MPNowPlayingInfoPropertyPlaybackRate: player.timeControlStatus == .playing ? player.rate : 0]
    }
}

@_cdecl("dds_audio_widget_command")
public func audioWidgetCommand(_ op: UnsafePointer<CChar>, _ id: UnsafePointer<CChar>) -> Bool {
    do {
        let identifier = String(cString: id)
        try AudioRuntime.shared.execute(AudioRequest(op: String(cString: op), id: identifier.isEmpty ? nil : identifier))
        return true
    } catch { return false }
}
