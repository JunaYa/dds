use tauri::{plugin::TauriPlugin, Runtime};
#[cfg(target_os = "ios")]
use tauri::{plugin::PluginHandle, Manager};

#[cfg(target_os = "ios")]
struct NavigationHandle<R: Runtime>(PluginHandle<R>);
#[cfg(target_os = "ios")]
pub fn capture_backup<R: Runtime>(app: &tauri::AppHandle<R>, url: String) -> Result<(), String> {
    app.state::<NavigationHandle<R>>().0.run_mobile_plugin::<serde_json::Value>("captureBackup", serde_json::json!({ "url": url })).map(|_| ()).map_err(|e| e.to_string())
}


#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_native_navigation);

#[cfg(target_os = "ios")]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("native-navigation")
        .setup(|app, api| {
            let handle = api.register_ios_plugin(init_plugin_native_navigation)?;
            app.manage(NavigationHandle(handle));
            Ok(())
        })
        .js_init_script("window.__DDS_NATIVE_NAVIGATION__ = true;".to_owned())
        .build()
}

#[cfg(target_os = "android")]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("native-navigation")
        .setup(|_, api| {
            api.register_android_plugin("com.dds.app", "RecentRecordPlugin")?;
            Ok(())
        })
        .build()
}
