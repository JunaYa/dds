use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{Manager, Runtime, State, plugin::TauriPlugin};
use tokio::sync::Mutex;
mod alipan;
mod alipan_auth;
mod providers;
const MAX_BYTES: usize = 20 * 1024 * 1024;
const API: &str = "https://openapi.alipan.com";
fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() }
fn client_id() -> Result<&'static str, String> {
    option_env!("LITTLE_DAYS_ALIPAN_CLIENT_ID").filter(|s| !s.is_empty()).ok_or("Alipan application is not configured".into())
}
#[derive(Clone, Serialize, Deserialize)]
struct Credential { access_token: String, expires_at: u64, account: String, drive: String, parent: String }
struct Pending { sid: String, verifier: String, expires: u64 }
struct Cloud<R: Runtime> {
    client: reqwest::Client,
    pending: Mutex<Option<Pending>>,
    operations: Mutex<()>,
    #[cfg(any(target_os = "ios", target_os = "android"))]
    native: tauri::plugin::PluginHandle<R>,
    marker: std::marker::PhantomData<fn() -> R>,
}
impl<R: Runtime> Cloud<R> {
    fn secret(&self) -> Result<Option<String>, String> {
        #[cfg(any(target_os = "ios", target_os = "android"))]
        { let value: Value = self.native.run_mobile_plugin("readSecret", json!({})).map_err(|_| "Secure storage is unavailable")?; Ok(value["value"].as_str().map(str::to_owned)) }
        #[cfg(not(any(target_os = "ios", target_os = "android")))]
        { match keyring::Entry::new("Little days cloud sync", "alipan").map_err(|_| "Secure storage is unavailable")?.get_password() {
            Ok(value) => Ok(Some(value)), Err(keyring::Error::NoEntry) => Ok(None), Err(_) => Err("Secure storage is unavailable".into())
        } }
    }
    fn save_secret(&self, value: Option<String>) -> Result<(), String> {
        #[cfg(any(target_os = "ios", target_os = "android"))]
        { self.native.run_mobile_plugin::<Value>("writeSecret", json!({"value":value})).map_err(|_| "Could not save secure credentials")?; Ok(()) }
        #[cfg(not(any(target_os = "ios", target_os = "android")))]
        { let entry = keyring::Entry::new("Little days cloud sync", "alipan").map_err(|_| "Secure storage is unavailable")?;
          match value { Some(value) => entry.set_password(&value).map_err(|_| "Could not save secure credentials".into()), None => match entry.delete_credential() { Ok(()) | Err(keyring::Error::NoEntry) => Ok(()), Err(_) => Err("Could not remove secure credentials".into()) } }
        }
    }
    fn credentials(&self, account: Option<&str>) -> Result<Credential, String> {
        let token: Credential = serde_json::from_str(&self.secret()?.ok_or("Connect Alipan first")?).map_err(|_| "Reconnect Alipan")?;
        if token.expires_at <= now() + 60 { return Err("Alipan authorization expired. Reconnect to continue".into()); }
        if account.is_some_and(|a| a != token.account) { return Err("Cloud account changed. Reconnect to continue".into()); }
        Ok(token)
    }
    async fn json(&self, request: reqwest::RequestBuilder) -> Result<Value, String> {
        let response = request.send().await.map_err(|_| "Cloud network request failed")?;
        if !response.status().is_success() { return Err(format!("Cloud request failed ({})", response.status().as_u16())); }
        let text = bounded(response, 2 * 1024 * 1024).await?;
        serde_json::from_slice(&text).map_err(|_| "Invalid cloud response".into())
    }
    async fn api(&self, token: &Credential, path: &str, body: Value) -> Result<Value, String> {
        self.json(self.client.post(format!("{API}{path}")).bearer_auth(&token.access_token).json(&body)).await
    }
    #[cfg(target_os = "ios")]
    async fn icloud(&self, method: &str, args: Value) -> Result<Value, String> {
        self.native.run_mobile_plugin(method, args).map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "ios"))]
    async fn icloud(&self, _method: &str, _args: Value) -> Result<Value, String> { Err("iCloud is available only on iOS".into()) }
}
async fn bounded(mut response: reqwest::Response, limit: usize) -> Result<Vec<u8>, String> {
    if response.content_length().is_some_and(|size| size > limit as u64) { return Err("Cloud file is too large".into()); }
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "Cloud download failed")? {
        if bytes.len() + chunk.len() > limit { return Err("Cloud file is too large".into()); }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}
fn text<'a>(v: &'a Value, name: &str) -> Result<&'a str, String> { v[name].as_str().filter(|s| !s.is_empty()).ok_or(format!("Missing cloud field: {name}")) }
#[tauri::command]
async fn status<R: Runtime>(_app: tauri::AppHandle<R>, cloud: State<'_, Cloud<R>>, provider: String) -> Result<Value, String> {
    providers::get::<R>(&provider)?.status(&cloud).await
}
#[tauri::command]
async fn begin_auth<R: Runtime>(_app: tauri::AppHandle<R>, cloud: State<'_, Cloud<R>>, provider: String) -> Result<Value, String> {
    let adapter = providers::get::<R>(&provider)?;
    let _guard = cloud.operations.lock().await;
    adapter.begin_auth(&cloud).await
}
#[tauri::command]
async fn poll_auth<R: Runtime>(_app: tauri::AppHandle<R>, cloud: State<'_, Cloud<R>>, provider: String) -> Result<bool, String> {
    let adapter = providers::get::<R>(&provider)?;
    let _guard = cloud.operations.lock().await;
    adapter.poll_auth(&cloud).await
}
#[tauri::command]
async fn disconnect<R: Runtime>(_app: tauri::AppHandle<R>, cloud: State<'_, Cloud<R>>, provider: String) -> Result<(), String> {
    let adapter = providers::get::<R>(&provider)?;
    let _guard = cloud.operations.lock().await;
    adapter.disconnect(&cloud).await
}
#[tauri::command]
async fn pull<R: Runtime>(_app: tauri::AppHandle<R>, cloud: State<'_, Cloud<R>>, provider: String, account: String) -> Result<Value, String> {
    let adapter = providers::get::<R>(&provider)?;
    let _guard = cloud.operations.lock().await;
    adapter.pull(&cloud, &account).await
}
#[tauri::command]
async fn push<R: Runtime>(_app: tauri::AppHandle<R>, cloud: State<'_, Cloud<R>>, provider: String, account: String, content: String) -> Result<Value, String> {
    let adapter = providers::get::<R>(&provider)?;
    if content.len() > MAX_BYTES { return Err("Sync data exceeds 20 MB".into()); }
    let parsed: Value = serde_json::from_str(&content).map_err(|_| "Invalid sync data")?;
    if parsed["version"] != 1 || !parsed["entries"].is_array() || !parsed["clock"].is_object() { return Err("Invalid sync data".into()); }
    let name = format!("{:x}.json",Sha256::digest(content.as_bytes()));
    let _guard = cloud.operations.lock().await;
    adapter.push(&cloud, &account, &name, &content).await
}
#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_cloud_sync);
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    tauri::plugin::Builder::new("cloud-sync")
        .setup(|app, _api| {
            #[cfg(target_os = "ios")]
            let native = _api.register_ios_plugin(init_plugin_cloud_sync)?;
            #[cfg(target_os = "android")]
            let native = _api.register_android_plugin("com.dds.cloudsync", "CloudSyncPlugin")?;
            app.manage(Cloud::<R> { client: reqwest::Client::builder().timeout(Duration::from_secs(30)).redirect(reqwest::redirect::Policy::none()).build()?, pending: Mutex::new(None), operations: Mutex::new(()),
                #[cfg(any(target_os = "ios", target_os = "android"))] native,
                marker: std::marker::PhantomData });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![status, begin_auth, poll_auth, disconnect, pull, push]).build()
}

#[cfg(test)]
#[path = "../config.rs"]
mod config_tests;
