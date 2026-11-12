import AppIntents
import SwiftUI
import WidgetKit

struct Baby: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "宝宝"
    static var defaultQuery = BabyQuery()
    let id: String
    let name: String
    var displayRepresentation: DisplayRepresentation { .init(title: "\(name)") }
}

struct BabyQuery: EntityQuery {
    func suggestedEntities() async throws -> [Baby] {
        try RecentRecordSnapshot.read().children.map { Baby(id: $0.id, name: $0.name) }
    }
    func entities(for identifiers: [String]) async throws -> [Baby] {
        try await suggestedEntities().filter { identifiers.contains($0.id) }
    }
    func defaultResult() async -> Baby? {
        guard let data = try? RecentRecordSnapshot.read(),
              let child = data.children.first(where: { $0.id == data.currentChild }) ?? data.children.first else { return nil }
        return Baby(id: child.id, name: child.name)
    }
}

struct CareType: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "记录类型"
    static var defaultQuery = CareTypeQuery()
    let id: String
    let name: String
    var displayRepresentation: DisplayRepresentation { .init(title: "\(name)") }
}

struct CareTypeQuery: EntityQuery {
    func suggestedEntities() async throws -> [CareType] {
        try RecentRecordSnapshot.read().types.map { CareType(id: $0.id, name: $0.name) }
    }
    func entities(for identifiers: [String]) async throws -> [CareType] {
        try await suggestedEntities().filter { identifiers.contains($0.id) }
    }
    func defaultResult() async -> CareType? { try? await suggestedEntities().first }
}

struct RecentRecordIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "最近记录"
    @Parameter(title: "宝宝") var baby: Baby?
    @Parameter(title: "记录类型") var recordType: CareType?
}

struct RecentEntry: TimelineEntry {
    let date = Date()
    var baby: RecentRecordSnapshot.Choice?
    var type: RecentRecordSnapshot.Choice?
    var time: Date?
    var locale = Locale.current
}

struct RecentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> RecentEntry {
        RecentEntry(baby: .init(id: "", name: "宝宝"), type: .init(id: "", name: "喂养"), time: Date())
    }
    func snapshot(for configuration: RecentRecordIntent, in context: Context) async -> RecentEntry {
        guard let data = try? RecentRecordSnapshot.read() else { return RecentEntry() }
        return Self.entry(data: data, child: configuration.baby?.id, recordType: configuration.recordType?.id)
    }
    static func entry(data: RecentRecordSnapshot, child: String?, recordType: String?) -> RecentEntry {
        let baby = data.children.first { $0.id == (child ?? data.currentChild) }
        let type = data.types.first { $0.id == (recordType ?? data.types.first?.id) }
        let time = baby.flatMap { data.latest[$0.id] }.flatMap { times in type.flatMap { times[$0.id] } }
        return RecentEntry(baby: baby, type: type, time: time.map(Date.init(timeIntervalSince1970:)), locale: Locale(identifier: data.locale))
    }
    func timeline(for configuration: RecentRecordIntent, in context: Context) async -> Timeline<RecentEntry> {
        Timeline(entries: [await snapshot(for: configuration, in: context)], policy: .never)
    }
}

struct BabyRecordIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "选择宝宝"
    @Parameter(title: "宝宝") var baby: Baby?
}

struct FixedRecentProvider: AppIntentTimelineProvider {
    let recordType: String
    func placeholder(in context: Context) -> RecentEntry {
        RecentEntry(baby: .init(id: "", name: "宝宝"),
                    type: .init(id: recordType, name: recordType == "feed" ? "喂奶" : "睡眠"), time: Date())
    }
    func snapshot(for configuration: BabyRecordIntent, in context: Context) async -> RecentEntry {
        guard let data = try? RecentRecordSnapshot.read() else { return RecentEntry() }
        return RecentProvider.entry(data: data, child: configuration.baby?.id, recordType: recordType)
    }
    func timeline(for configuration: BabyRecordIntent, in context: Context) async -> Timeline<RecentEntry> {
        Timeline(entries: [await snapshot(for: configuration, in: context)], policy: .never)
    }
}

struct RecentRecordView: View {
    let entry: RecentEntry
    var body: some View {
        Group {
            if let baby = entry.baby, let type = entry.type {
                Button(intent: OpenRecentRecord(child: baby.id, recordType: type.id)) {
                    content(entry).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            } else { content(entry) }
        }
        .environment(\.locale, entry.locale)
        .containerBackground(.background, for: .widget)
    }

    private func content(_ entry: RecentEntry) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(entry.baby?.name ?? "Little days", systemImage: "book.closed").font(.subheadline)
            Spacer()
            if let type = entry.type, entry.baby != nil {
                Text(type.name).font(.headline)
                if let time = entry.time {
                    Text(time, style: .time).font(.title.bold()).monospacedDigit()
                    Text(time, style: .date).font(.caption).foregroundStyle(.secondary)
                } else { Text(entry.locale.identifier.hasPrefix("zh") ? "暂无记录" : "No records yet").font(.subheadline) }
            } else { Text(entry.locale.identifier.hasPrefix("zh") ? "打开应用选择宝宝和记录类型" : "Open the app to set up records").font(.subheadline) }
        }
        .lineLimit(2)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(16)
    }
}

struct FeedingRecordWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: RecentRecordSnapshot.feedingKind, intent: BabyRecordIntent.self,
                               provider: FixedRecentProvider(recordType: "feed")) { entry in
            RecentRecordView(entry: entry)
        }
        .configurationDisplayName("喂奶")
        .description("查看最近一次喂奶时间，轻点添加喂奶记录。")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

struct SleepRecordWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: RecentRecordSnapshot.sleepKind, intent: BabyRecordIntent.self,
                               provider: FixedRecentProvider(recordType: "sleep")) { entry in
            RecentRecordView(entry: entry)
        }
        .configurationDisplayName("睡眠")
        .description("查看最近一次睡眠时间，轻点添加睡眠记录。")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

struct RecentRecordWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: RecentRecordSnapshot.kind, intent: RecentRecordIntent.self, provider: RecentProvider()) { entry in
            RecentRecordView(entry: entry)
        }
        .configurationDisplayName("其他记录")
        .description("选择任意记录类型，包括应用中创建的自定义类型；可添加多个独立小组件。")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

@main
struct RecordWidgets: WidgetBundle {
    var body: some Widget {
        FeedingRecordWidget()
        SleepRecordWidget()
        RecentRecordWidget()
    }
}
