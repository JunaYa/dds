import AppIntents
import Foundation

#if !AUDIO_WIDGET_EXTENSION
@_silgen_name("dds_audio_widget_command")
private func audioWidgetCommand(_ op: UnsafePointer<CChar>, _ id: UnsafePointer<CChar>) -> Bool
#endif

struct AudioWidgetTrack: Identifiable, Decodable {
    let id: String
    let title: String
    let category: String
}
struct AudioWidgetSnapshot: Decodable {
    var title: String = "Little days"
    var playing: Bool = false
    var tracks: [AudioWidgetTrack] = []
    var trackId: String?
    static func read() -> Self {
        let bundle = Bundle.main.bundleIdentifier ?? "com.dds.app.RecentRecord"
        let app = bundle.hasSuffix(".RecentRecord") ? String(bundle.dropLast(".RecentRecord".count)) : bundle
        guard let root = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group." + app),
              let data = try? Data(contentsOf: root.appendingPathComponent("Audio-v1/widget.json")),
              let value = try? JSONDecoder().decode(Self.self, from: data) else { return Self() }
        return value
    }
}
@available(iOS 17.0, *)
struct AudioChoice: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "音频"
    static var defaultQuery = AudioChoiceQuery()
    let id: String
    let title: String
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(title)") }
}
@available(iOS 17.0, *)
struct AudioChoiceQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [AudioChoice] {
        try await suggestedEntities().filter { identifiers.contains($0.id) }
    }
    func suggestedEntities() async throws -> [AudioChoice] {
        AudioWidgetSnapshot.read().tracks.map { AudioChoice(id: $0.id, title: $0.title) }
    }
}
@available(iOS 17.0, *)
struct AudioWidgetConfiguration: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "选择音频"
    @Parameter(title: "音频") var track: AudioChoice?
}
@available(iOS 17.0, *)
struct ControlAudio: AudioPlaybackIntent {
    static var title: LocalizedStringResource = "控制播放"
    static var openAppWhenRun = false
    static var isDiscoverable = false
    @Parameter(title: "操作") var operation: String
    @Parameter(title: "音频") var trackId: String
    init() {}
    init(operation: String, trackId: String) { self.operation = operation; self.trackId = trackId }
    @MainActor func perform() async throws -> some IntentResult {
        #if !AUDIO_WIDGET_EXTENSION
        let success = operation.withCString { op in trackId.withCString { id in audioWidgetCommand(op, id) } }
        if !success { throw AudioIntentFailure() }
        #endif
        return .result()
    }
}
private struct AudioIntentFailure: LocalizedError {
    var errorDescription: String? { "无法播放，请打开 Little days 检查音频或网络连接。" }
}

@available(iOS 17.0, *)
struct OpenAudioApp: AppIntent {
    static var title: LocalizedStringResource = "打开音频库"
    static var openAppWhenRun = true
    @MainActor func perform() async throws -> some IntentResult { .result() }
}
