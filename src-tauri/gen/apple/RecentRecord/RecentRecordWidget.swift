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
        let baby = data.children.first { $0.id == (configuration.baby?.id ?? data.currentChild) }
        let type = data.types.first { $0.id == (configuration.recordType?.id ?? data.types.first?.id) }
        let time = baby.flatMap { data.latest[$0.id] }.flatMap { times in type.flatMap { times[$0.id] } }
        return RecentEntry(baby: baby, type: type, time: time.map(Date.init(timeIntervalSince1970:)), locale: Locale(identifier: data.locale))
    }
    func timeline(for configuration: RecentRecordIntent, in context: Context) async -> Timeline<RecentEntry> {
        Timeline(entries: [await snapshot(for: configuration, in: context)], policy: .never)
    }
}

@main
struct RecentRecordWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: RecentRecordSnapshot.kind, intent: RecentRecordIntent.self, provider: RecentProvider()) { entry in
            Group {
                if let baby = entry.baby, let type = entry.type {
                    Button(intent: OpenRecentRecord(child: baby.id, recordType: type.id)) {
                        content(entry).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                } else {
                    content(entry)
                }
            }
            .environment(\.locale, entry.locale)
            .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("最近记录")
        .description("查看宝宝最近一次记录，轻点添加新记录。")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
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
