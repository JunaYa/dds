import AppIntents
import Foundation

@available(iOS 16.4, *)
struct RecordBottleIntent: AppIntent {
    static var title: LocalizedStringResource = "记录奶量"
    static var description = IntentDescription("打开应用，确认宝宝和奶量后保存。")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "奶量（毫升）", inclusiveRange: (1, 2000))
    var amount: Double

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard amount.isFinite, amount > 0, amount <= 2000 else {
            throw $amount.needsValueError("请输入 1 至 2000 毫升。")
        }
        try SiriInbox.enqueue(kind: "feed", amount: amount)
        return .result(dialog: "请在应用中确认宝宝和奶量，然后保存。")
    }
}

@available(iOS 16.4, *)
enum SiriDiaper: String, AppEnum {
    case wet = "Wet", dirty = "Dirty", mixed = "Mixed", dry = "Dry"
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "尿布类型"
    static var caseDisplayRepresentations: [SiriDiaper: DisplayRepresentation] = [
        .wet: "尿湿", .dirty: "便便", .mixed: "尿便都有", .dry: "干爽"
    ]
}

@available(iOS 16.4, *)
struct RecordDiaperIntent: AppIntent {
    static var title: LocalizedStringResource = "记录换尿布"
    static var description = IntentDescription("打开应用，确认宝宝和尿布类型后保存。")
    static var openAppWhenRun: Bool = true
    @Parameter(title: "尿布类型") var kind: SiriDiaper
    func perform() async throws -> some IntentResult & ProvidesDialog {
        try SiriInbox.enqueue(kind: "diaper", diaper: kind.rawValue)
        return .result(dialog: "请在应用中确认宝宝和尿布类型，然后保存。")
    }
}

@available(iOS 16.4, *)
struct RecordShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: RecordBottleIntent(), phrases: ["用\(.applicationName)记录奶量"], shortTitle: "记录奶量", systemImageName: "waterbottle")
        AppShortcut(intent: RecordDiaperIntent(), phrases: ["用\(.applicationName)记录换尿布"], shortTitle: "记录换尿布", systemImageName: "drop")
    }
}
