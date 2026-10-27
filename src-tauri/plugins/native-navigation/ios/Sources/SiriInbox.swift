import Foundation

struct SiriRequest: Codable {
    let id: String
    let kind: String
    let amount: Double?
    let diaper: String?
    let time: Date
}

// Compiled into both the host app and the plugin; only complete atomic files are visible.
enum SiriInbox {
    private static func directory() throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let folder = base.appendingPathComponent("SiriInbox", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }
    private static func files() throws -> [URL] {
        try FileManager.default.contentsOfDirectory(at: directory(), includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
    }
    static func enqueue(kind: String, amount: Double? = nil, diaper: String? = nil) throws {
        guard try files().count < 20 else { throw CocoaError(.fileWriteOutOfSpace) }
        let item = SiriRequest(id: UUID().uuidString, kind: kind, amount: amount, diaper: diaper, time: Date())
        try JSONEncoder().encode(item).write(to: directory().appendingPathComponent(item.id + ".json"), options: .atomic)
    }
    static func next() throws -> SiriRequest? {
        guard let file = try files().first else { return nil }
        return try JSONDecoder().decode(SiriRequest.self, from: Data(contentsOf: file))
    }
    static func dismiss(_ id: String) throws {
        guard UUID(uuidString: id) != nil else { throw CocoaError(.fileReadInvalidFileName) }
        let url = try directory().appendingPathComponent(id + ".json")
        if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    }
}
