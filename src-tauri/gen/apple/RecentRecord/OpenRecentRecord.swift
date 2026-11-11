import AppIntents
import Foundation

@available(iOS 17.0, *)
struct OpenRecentRecord: AppIntent {
    static var title: LocalizedStringResource = "添加记录"
    static var openAppWhenRun = true
    static var isDiscoverable = false

    @Parameter(title: "宝宝") var child: String
    @Parameter(title: "记录类型") var recordType: String

    init() {}
    init(child: String, recordType: String) {
        self.child = child
        self.recordType = recordType
    }

    @MainActor func perform() async throws -> some IntentResult {
        let request = RecentRecordRequest(id: UUID().uuidString, child: child, type: recordType)
        try request.enqueue()
        return .result()
    }
}
