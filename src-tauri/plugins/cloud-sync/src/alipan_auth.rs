use super::*;

pub(super) async fn begin_auth<R: Runtime>(cloud: &Cloud<R>) -> Result<Value, String> {
    let verifier = format!("{}{}", uuid::Uuid::new_v4().simple(), uuid::Uuid::new_v4().simple());
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let value = cloud.json(cloud.client.post(format!("{API}/oauth/authorize/qrcode")).json(&json!({"client_id":client_id()?,"scopes":["user:base","file:all:read","file:all:write"],"code_challenge":challenge,"code_challenge_method":"S256","style":"folder"}))).await?;
    let sid = text(&value, "sid")?.to_owned();
    if !sid.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_') { return Err("Invalid authorization response".into()); }
    *cloud.pending.lock().await = Some(Pending { sid: sid.clone(), verifier, expires: now() + 180 });
    Ok(json!({"url":format!("{API}/oauth/qrcode/{sid}"),"expiresAt":now()+180}))
}
pub(super) async fn poll_auth<R: Runtime>(cloud: &Cloud<R>) -> Result<bool, String> {
    let mut pending = cloud.pending.lock().await;
    let p = pending.as_ref().ok_or("Start authorization first")?;
    if p.expires < now() { *pending = None; return Err("Authorization code expired".into()); }
    let value = cloud.json(cloud.client.get(format!("{API}/oauth/qrcode/{}/status",p.sid))).await?;
    match value["status"].as_str() {
        Some("WaitLogin" | "ScanSuccess") => return Ok(false),
        Some("LoginSuccess") => (),
        _ => { *pending = None; return Err("Authorization expired or cancelled".into()); }
    }
    let token = cloud.json(cloud.client.post(format!("{API}/oauth/access_token")).json(&json!({"client_id":client_id()?,"grant_type":"authorization_code","code":text(&value,"authCode")?,"code_verifier":p.verifier}))).await?;
    *pending = None;
    let mut credential = Credential { access_token: text(&token,"access_token")?.to_owned(), expires_at: now() + token["expires_in"].as_u64().ok_or("Invalid token expiry")?, account: String::new(), drive: String::new(), parent: "root".into() };
    let drive = cloud.api(&credential, "/adrive/v1.0/user/getDriveInfo", json!({})).await?;
    credential.account = text(&drive,"user_id")?.into();
    credential.drive = text(&drive,"default_drive_id")?.into();
    credential.parent = drive["folder_id"].as_str().unwrap_or("root").into();
    cloud.save_secret(Some(serde_json::to_string(&credential).map_err(|_| "Could not save authorization")?))?;
    Ok(true)
}
pub(super) async fn disconnect<R: Runtime>(cloud: &Cloud<R>) -> Result<(), String> {
    *cloud.pending.lock().await = None;
    cloud.save_secret(None)
}
