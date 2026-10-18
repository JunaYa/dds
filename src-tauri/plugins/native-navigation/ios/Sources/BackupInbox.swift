import Foundation
import Tauri

struct CaptureBackupOptions: Decodable { let url: String }
struct DismissBackupOptions: Decodable { let id: String }
struct SharedBackupItem: Codable {
    let id: String
    let name: String
    let text: String?
    let error: String?
}

// Files are retained until the user imports or dismisses them, including after relaunch.
enum BackupInbox {
    private static let maxBytes = 20 * 1024 * 1024
    private static let lock = NSLock()
    private static func directory() throws -> URL {
        let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let folder = base.appendingPathComponent("BackupInbox", isDirectory: true)
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder
    }
    private static func files() throws -> [URL] {
        try FileManager.default.contentsOfDirectory(at: directory(), includingPropertiesForKeys: [.creationDateKey])
            .filter { $0.pathExtension == "json" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
    }
    static func capture(_ raw: String) throws {
        lock.lock(); defer { lock.unlock() }
        guard let url = URL(string: raw), url.isFileURL else { return }
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        let entries = try files()
        // Reserve a small error entry if several files arrive before the user responds.
        guard entries.count < 6 else { return }
        var text: String?
        var failure: String?
        do {
            guard entries.count < 5 else { throw NSError(domain: "BackupInbox", code: 1, userInfo: [NSLocalizedDescriptionKey: "Import queue is full. Share this file again after handling the pending files."]) }
            guard ["json", "calibabybackup", "littledaysbackup"].contains(url.pathExtension.lowercased()) else {
                throw NSError(domain: "BackupInbox", code: 2, userInfo: [NSLocalizedDescriptionKey: "Unsupported backup file type."])
            }
            let info = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            guard info.isRegularFile == true, (info.fileSize ?? maxBytes + 1) <= maxBytes else {
                throw NSError(domain: "BackupInbox", code: 3, userInfo: [NSLocalizedDescriptionKey: "Backup is too large (maximum 20 MB)."])
            }
            let handle = try FileHandle(forReadingFrom: url)
            defer { try? handle.close() }
            let data = try handle.read(upToCount: maxBytes + 1) ?? Data()
            guard data.count <= maxBytes, let value = String(data: data, encoding: .utf8) else {
                throw NSError(domain: "BackupInbox", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not read this backup."])
            }
            text = value
        } catch { failure = error.localizedDescription }
        let id = String(format: "%020.0f", Date().timeIntervalSince1970 * 1000) + "-" + UUID().uuidString
        let item = SharedBackupItem(id: id, name: url.lastPathComponent, text: text, error: failure)
        try JSONEncoder().encode(item).write(to: directory().appendingPathComponent(id + ".json"), options: .atomic)
    }
    static func next() throws -> SharedBackupItem? {
        lock.lock(); defer { lock.unlock() }
        guard let file = try files().first else { return nil }
        return try JSONDecoder().decode(SharedBackupItem.self, from: Data(contentsOf: file))
    }
    static func dismiss(_ id: String) throws {
        lock.lock(); defer { lock.unlock() }
        guard let file = try files().first(where: { $0.deletingPathExtension().lastPathComponent == id }) else { return }
        try FileManager.default.removeItem(at: file)
    }
}
