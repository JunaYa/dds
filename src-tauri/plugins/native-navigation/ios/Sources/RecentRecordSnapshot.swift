import Foundation

struct RecentRecordSnapshot: Codable {
    struct Choice: Codable {
        let id: String
        let name: String
    }
    let children: [Choice]
    let types: [Choice]
    let latest: [String: [String: Double]]
    let currentChild: String
    let locale: String

    static let kind = "RecentRecord"
    static let feedingKind = "RecentRecord.feed"
    static let sleepKind = "RecentRecord.sleep"
    static let kinds = [feedingKind, sleepKind, kind]
    static func file() throws -> URL {
        guard let bundle = Bundle.main.bundleIdentifier else { throw CocoaError(.fileNoSuchFile) }
        let suffix = ".RecentRecord"
        let app = bundle.hasSuffix(suffix) ? String(bundle.dropLast(suffix.count)) : bundle
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group." + app) else {
            throw CocoaError(.fileWriteNoPermission)
        }
        return dir.appendingPathComponent("recent-record-v1.json")
    }
    static func read() throws -> Self {
        try JSONDecoder().decode(Self.self, from: Data(contentsOf: file()))
    }
}

struct RecentRecordRequest: Codable {
    let id: String
    let child: String
    let type: String

    private static func directory() throws -> URL {
        try RecentRecordSnapshot.file().deletingLastPathComponent().appendingPathComponent("widget-requests", isDirectory: true)
    }
    func enqueue() throws {
        let dir = try Self.directory()
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try JSONEncoder().encode(self).write(to: dir.appendingPathComponent(id), options: .atomic)
        NotificationCenter.default.post(name: .init("little-days-widget-request"), object: nil)
    }
    static func next() throws -> Self? {
        let dir = try directory()
        guard FileManager.default.fileExists(atPath: dir.path) else { return nil }
        let files = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil, options: .skipsHiddenFiles)
        guard let file = files.first else { return nil }
        return try JSONDecoder().decode(Self.self, from: Data(contentsOf: file))
    }
    static func dismiss(_ id: String) throws {
        guard UUID(uuidString: id) != nil else { throw CocoaError(.fileReadInvalidFileName) }
        let file = try directory().appendingPathComponent(id)
        if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
    }
}
