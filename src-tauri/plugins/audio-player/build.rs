fn main() {
    tauri_plugin::Builder::new(&["execute", "snapshot"])
        .ios_path("ios")
        .android_path("android")
        .build();
}
