// swift-tools-version:5.3
import PackageDescription
let package = Package(name: "tauri-plugin-cloud-sync", platforms: [.iOS(.v13)],
  products: [.library(name: "tauri-plugin-cloud-sync", type: .static, targets: ["tauri-plugin-cloud-sync"])],
  dependencies: [.package(name: "Tauri", path: "../.tauri/tauri-api")],
  targets: [.target(name: "tauri-plugin-cloud-sync", dependencies: [.byName(name: "Tauri")], path: "Sources")])
