mod config;

fn main() {
    println!("cargo:rerun-if-env-changed=LITTLE_DAYS_ALIPAN_CLIENT_ID");
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../cloud-sync.config.local.json");
    println!("cargo:rerun-if-changed={}", path.display());
    let config = match std::fs::read_to_string(&path) {
        Ok(text) => Some(config::parse(&text).expect("Check cloud-sync.config.local.json")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
        Err(e) => panic!("Could not read cloud configuration: {e}"),
    };
    let client_id = std::env::var("LITTLE_DAYS_ALIPAN_CLIENT_ID").unwrap_or_else(|_| {
        config.map(|c| c.providers.alipan.client_id).unwrap_or_default()
    });
    config::validate_client_id(&client_id).expect("Check LITTLE_DAYS_ALIPAN_CLIENT_ID");
    println!("cargo:rustc-env=LITTLE_DAYS_ALIPAN_CLIENT_ID={client_id}");
    tauri_plugin::Builder::new(&["status", "begin_auth", "poll_auth", "disconnect", "pull", "push"])
        .ios_path("ios").android_path("android").build();
}
