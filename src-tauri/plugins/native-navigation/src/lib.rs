use tauri::{plugin::TauriPlugin, Runtime};

tauri::ios_plugin_binding!(init_plugin_native_navigation);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("native-navigation")
        .setup(|_app, api| {
            api.register_ios_plugin(init_plugin_native_navigation)?;
            Ok(())
        })
        .js_init_script("window.__DDS_NATIVE_NAVIGATION__ = true;".to_owned())
        .build()
}
