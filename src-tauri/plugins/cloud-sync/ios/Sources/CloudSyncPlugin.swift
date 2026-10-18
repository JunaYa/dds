import Foundation
import Security
import CryptoKit
import Tauri

struct SecretArgs: Decodable { let value: String? }
struct CloudArgs: Decodable { let account: String; let name: String?; let content: String? }
struct CloudFailure: LocalizedError { let message: String; var errorDescription: String? { message } }
class CloudSyncPlugin: Plugin {
    private let work = DispatchQueue(label: "little-days.cloud", qos: .utility)
    private var queries: [UUID: NSMetadataQuery] = [:]
    private let maxBytes = 20 * 1024 * 1024
    private var key: [String: Any] { [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "Little days cloud sync", kSecAttrAccount as String: "alipan"] }
    @objc public func readSecret(_ invoke: Invoke) throws {
        var query = key; query[kSecReturnData as String] = true
        var value: CFTypeRef?
        let result = SecItemCopyMatching(query as CFDictionary, &value)
        if result == errSecItemNotFound { invoke.resolve([:]); return }
        guard result == errSecSuccess, let data = value as? Data, let text = String(data: data, encoding: .utf8) else { invoke.reject("Secure storage is unavailable"); return }
        invoke.resolve(["value":text])
    }
    @objc public func writeSecret(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(SecretArgs.self)
        guard let value = args.value else {
            let status = SecItemDelete(key as CFDictionary)
            if status == errSecSuccess || status == errSecItemNotFound { invoke.resolve() } else { invoke.reject("Could not remove credentials") }; return
        }
        let attributes: [String: Any] = [kSecValueData as String: Data(value.utf8), kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        var result = SecItemUpdate(key as CFDictionary, attributes as CFDictionary)
        if result == errSecItemNotFound { result = SecItemAdd(key.merging(attributes) { _, new in new } as CFDictionary, nil) }
        if result == errSecSuccess { invoke.resolve() } else { invoke.reject("Could not save credentials") }
    }
    private func account() throws -> String {
        guard let token = FileManager.default.ubiquityIdentityToken else { throw CloudFailure(message: "Sign in to iCloud and enable iCloud Drive") }
        let data = try NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: false)
        return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
    private func directory(_ expected: String? = nil) throws -> URL {
        let current = try account()
        if let expected = expected, expected != current { throw CloudFailure(message: "Cloud account changed. Reconnect to continue") }
        guard let root = FileManager.default.url(forUbiquityContainerIdentifier: nil) else { throw CloudFailure(message: "iCloud container is not configured or unavailable") }
        let url = root.appendingPathComponent("Documents/Little-days-sync-v1", isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
    @objc public func cloudStatus(_ invoke: Invoke) throws {
        work.async {
            do { _ = try self.directory(); invoke.resolve(["configured":true,"connected":true,"account":try self.account()]) }
            catch { invoke.reject(error.localizedDescription) }
        }
    }
    @objc public func cloudPush(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(CloudArgs.self)
        work.async {
            do {
                guard let name = args.name, let content = args.content, content.utf8.count <= self.maxBytes,
                    name == SHA256.hash(data: Data(content.utf8)).map({ String(format: "%02x", $0) }).joined() + ".json" else { throw CloudFailure(message: "Invalid sync file") }
                let url = try self.directory(args.account).appendingPathComponent(name)
                var coordinationError: NSError?, writeError: Error?
                NSFileCoordinator().coordinate(writingItemAt: url, options: [], error: &coordinationError) { target in
                    do {
                        guard try self.account() == args.account else { throw CloudFailure(message: "Cloud account changed") }
                        if FileManager.default.fileExists(atPath: target.path) {
                            guard try Data(contentsOf: target) == Data(content.utf8) else { throw CloudFailure(message: "Cloud checksum mismatch") }
                        } else { try Data(content.utf8).write(to: target, options: .atomic) }
                    } catch { writeError = error }
                }
                if let error = coordinationError ?? writeError as NSError? { throw error }
                invoke.resolve(["name":name])
            } catch { invoke.reject(error.localizedDescription) }
        }
    }
    @objc public func cloudPull(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(CloudArgs.self)
        work.async {
            do {
                let directory = try self.directory(args.account)
                DispatchQueue.main.async { self.discover(directory, account: args.account, invoke: invoke) }
            } catch { invoke.reject(error.localizedDescription) }
        }
    }
    private func discover(_ directory: URL, account: String, invoke: Invoke) {
        let id = UUID(), query = NSMetadataQuery()
        query.searchScopes = [NSMetadataQueryUbiquitousDocumentsScope]
        query.predicate = NSPredicate(format: "%K BEGINSWITH %@", NSMetadataItemPathKey, directory.path + "/")
        queries[id] = query
        var observer: NSObjectProtocol?
        observer = NotificationCenter.default.addObserver(forName: .NSMetadataQueryDidFinishGathering, object: query, queue: .main) { [weak self] _ in
            guard let self = self, self.queries.removeValue(forKey: id) != nil else { return }
            query.disableUpdates()
            let urls = query.results.compactMap { ($0 as? NSMetadataItem)?.value(forAttribute: NSMetadataItemURLKey) as? URL }
            query.stop(); if let observer = observer { NotificationCenter.default.removeObserver(observer) }
            self.work.async {
                do { invoke.resolve(["account":account,"snapshots":try self.read(urls, directory: directory, account: account)]) }
                catch { invoke.reject(error.localizedDescription) }
            }
        }
        query.start()
        DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
            guard self?.queries.removeValue(forKey: id) != nil else { return }
            query.stop(); if let observer = observer { NotificationCenter.default.removeObserver(observer) }
            invoke.reject("iCloud discovery timed out. Try again when online")
        }
    }
    private func read(_ urls: [URL], directory: URL, account expected: String) throws -> [String] {
        // Include locally-created files not yet indexed by the metadata service.
        let local = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        let files = Set(urls + local).filter { $0.pathExtension == "json" }
        guard files.count <= 1000 else { throw CloudFailure(message: "Sync history requires maintenance") }
        var result: [String] = [], total = 0
        for url in files {
            guard url.deletingLastPathComponent().standardizedFileURL == directory.standardizedFileURL else { continue }
            let values = try url.resourceValues(forKeys: [.ubiquitousItemDownloadingStatusKey, .isRegularFileKey, .fileSizeKey])
            guard values.isRegularFile == true, (values.fileSize ?? maxBytes + 1) <= maxBytes else { throw CloudFailure(message: "Invalid cloud file") }
            if let status = values.ubiquitousItemDownloadingStatus, status != .current {
                try FileManager.default.startDownloadingUbiquitousItem(at: url)
                throw CloudFailure(message: "iCloud is downloading changes. Sync will retry")
            }
            var coordinationError: NSError?, readError: Error?, data: Data?
            NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { target in
                do { data = try Data(contentsOf: target) } catch { readError = error }
            }
            if let error = coordinationError ?? readError as NSError? { throw error }
            guard let data = data, data.count <= maxBytes, let content = String(data: data, encoding: .utf8),
                url.lastPathComponent == SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() + ".json" else { throw CloudFailure(message: "Cloud checksum mismatch") }
            total += data.count
            guard total <= 100 * 1024 * 1024 else { throw CloudFailure(message: "Sync history exceeds download limit") }
            result.append(content)
        }
        guard try account() == expected else { throw CloudFailure(message: "Cloud account changed. Reconnect to continue") }
        return result
    }
}
@_cdecl("init_plugin_cloud_sync")
func initPlugin() -> Plugin { CloudSyncPlugin() }
