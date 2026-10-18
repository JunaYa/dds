use super::*;
impl<R: Runtime> Cloud<R> {
    async fn files(&self, token: &Credential, parent: &str) -> Result<Vec<Value>, String> {
        let mut items = Vec::new();
        let mut marker = String::new();
        let mut markers = std::collections::HashSet::new();
        loop {
            let page = self.api(token,"/adrive/v1.0/openFile/list",json!({"drive_id":token.drive,"parent_file_id":parent,"limit":100,"marker":marker,"fields":"*"})).await?;
            items.extend(page["items"].as_array().ok_or("Invalid cloud listing")?.iter().cloned());
            if items.len() > 5000 { return Err("Sync directory contains too many files".into()); }
            marker = page["next_marker"].as_str().unwrap_or("").into();
            if marker.is_empty() { break; }
            if !markers.insert(marker.clone()) { return Err("Invalid cloud pagination".into()); }
        }
        Ok(items)
    }
    async fn folder(&self, token: &Credential) -> Result<String, String> {
        let find = |items: Vec<Value>| -> Result<Option<String>, String> {
            let matching: Vec<_> = items.into_iter().filter(|item| item["name"] == "Little-days-sync-v1" && item["type"] == "folder").collect();
            if matching.len() > 1 { return Err("Multiple Little days sync folders found".into()); }
            matching.first().map(|v| text(v,"file_id").map(str::to_owned)).transpose()
        };
        if let Some(id) = find(self.files(token,&token.parent).await?)? { return Ok(id); }
        let created = self.api(token,"/adrive/v1.0/openFile/create",json!({"drive_id":token.drive,"parent_file_id":token.parent,"name":"Little-days-sync-v1","type":"folder","check_name_mode":"refuse"})).await;
        match created {
            Ok(v) => Ok(text(&v,"file_id")?.into()),
            Err(error) => find(self.files(token,&token.parent).await?)?.ok_or(error),
        }
    }
    async fn download(&self, token: &Credential, file: &Value) -> Result<String, String> {
        let url = self.api(token,"/adrive/v1.0/openFile/getDownloadUrl",json!({"drive_id":token.drive,"file_id":text(file,"file_id")?})).await?;
        let address = signed_url(text(&url,"url")?)?;
        // Never forward OAuth credentials to a signed object-storage URL.
        let response = self.client.get(address).header("Range",format!("bytes=0-{}",MAX_BYTES)).send().await.map_err(|_| "Cloud download failed")?;
        if !response.status().is_success() { return Err("Cloud download failed".into()); }
        let bytes = bounded(response,MAX_BYTES).await?;
        let hash = format!("{:x}",Sha256::digest(&bytes));
        if !text(file,"name")?.starts_with(&format!("{hash}-")) { return Err("Cloud file checksum does not match".into()); }
        String::from_utf8(bytes).map_err(|_| "Invalid cloud file encoding".into())
    }
    pub(super) async fn ali_pull(&self, token: &Credential) -> Result<Value, String> {
        let folder = self.folder(token).await?;
        let files = self.files(token,&folder).await?;
        let mut snapshots = Vec::new();
        let mut total = 0;
        let mut seen = std::collections::HashSet::new();
        for file in files {
            let name = file["name"].as_str().unwrap_or("");
            if !snapshot_name(name) || file["type"] != "file" || file["status"].as_str().is_some_and(|s| s != "available") { continue; }
            if !seen.insert(name[..64].to_owned()) { continue; }
            if snapshots.len() >= 1000 { return Err("Sync history requires maintenance; no data was removed".into()); }
            let content = self.download(token,&file).await?;
            total += content.len();
            if total > 100 * 1024 * 1024 { return Err("Sync history exceeds download limit".into()); }
            snapshots.push(content);
        }
        Ok(json!({"account":token.account,"snapshots":snapshots}))
    }
    pub(super) async fn ali_push(&self, token: &Credential, hash_name: &str, content: &str) -> Result<(), String> {
        let folder = self.folder(token).await?;
        let hash = &hash_name[..64];
        for file in self.files(token,&folder).await? {
            if file["name"].as_str().is_some_and(|n| snapshot_name(n) && n.starts_with(hash)) && file["status"].as_str().is_none_or(|s| s == "available") {
                if self.download(token,&file).await? == content { return Ok(()); }
            }
        }
        let name = format!("{hash}-{}.json",uuid::Uuid::new_v4());
        let created = self.api(token,"/adrive/v1.0/openFile/create",json!({"drive_id":token.drive,"parent_file_id":folder,"name":name,"type":"file","check_name_mode":"refuse","size":content.len(),"part_info_list":[{"part_number":1}]})).await?;
        let url = signed_url(text(&created["part_info_list"][0],"upload_url")?)?;
        let response = self.client.put(url).body(content.to_owned()).send().await.map_err(|_| "Cloud upload failed")?;
        if !response.status().is_success() { return Err("Cloud upload failed".into()); }
        self.api(token,"/adrive/v1.0/openFile/complete",json!({"drive_id":token.drive,"file_id":text(&created,"file_id")?,"upload_id":text(&created,"upload_id")?})).await?;
        Ok(())
    }
}
fn snapshot_name(name: &str) -> bool {
    name.len() == 106 && name.as_bytes()[..64].iter().all(u8::is_ascii_hexdigit) && name.as_bytes()[64] == b'-' && name.ends_with(".json") && uuid::Uuid::parse_str(&name[65..101]).is_ok()
}
fn signed_url(value: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(value).map_err(|_| "Invalid cloud URL")?;
    let host = url.host_str().ok_or("Invalid cloud URL")?;
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.port().is_some() ||
        !(host.ends_with(".aliyuncs.com") || host.ends_with(".alipan.com") || host.ends_with(".aliyundrive.com")) {
        return Err("Unexpected cloud storage URL".into());
    }
    Ok(url)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn rejects_untrusted_signed_urls() {
        for value in ["http://oss.aliyuncs.com/a", "https://aliyuncs.com.evil.test/a", "https://localhost/a", "https://x.aliyuncs.com:444/a", "https://user@x.aliyuncs.com/a"] { assert!(signed_url(value).is_err()); }
        assert!(signed_url("https://bucket.oss-cn-hangzhou.aliyuncs.com/path?signature=x").is_ok());
    }
    #[test] fn validates_snapshot_names() {
        let name = format!("{}-{}.json","a".repeat(64),uuid::Uuid::new_v4());
        assert!(snapshot_name(&name)); assert!(!snapshot_name("../../data.json"));
    }
}
