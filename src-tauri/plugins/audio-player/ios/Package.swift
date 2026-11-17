// swift-tools-version:5.7
import PackageDescription
let package = Package(
    name: "tauri-plugin-audio-player",
    platforms: [.iOS(.v16)],
    products: [.library(name: "tauri-plugin-audio-player", type: .static, targets: ["tauri-plugin-audio-player"])],
    dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
    targets: [.target(name: "tauri-plugin-audio-player", dependencies: [.byName(name: "Tauri")], path: "Sources")]
)
