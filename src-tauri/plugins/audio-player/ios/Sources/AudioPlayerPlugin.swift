import Tauri
import Foundation
struct AudioArguments: Decodable { let command: AudioRequest }
class AudioPlayerPlugin: Plugin {
    @objc func snapshot(_ invoke: Invoke) {
        DispatchQueue.main.async { invoke.resolve(AudioRuntime.shared.snapshot()) }
    }
    @objc func execute(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(AudioArguments.self)
        DispatchQueue.main.async {
            do { try AudioRuntime.shared.execute(args.command); invoke.resolve(AudioRuntime.shared.snapshot()) }
            catch { invoke.reject(error.localizedDescription) }
        }
    }
}
@_cdecl("init_plugin_audio_player")
public func initPlugin() -> Plugin { AudioPlayerPlugin() }
