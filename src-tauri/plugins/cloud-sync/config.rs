use serde::Deserialize;

#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct AlipanConfig {
    #[serde(default)]
    pub client_id: String,
}
#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ICloudConfig {
    #[serde(default)]
    pub container_id: String,
}
#[derive(Default, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Providers {
    #[serde(default)]
    pub alipan: AlipanConfig,
    #[serde(default)]
    pub icloud: ICloudConfig,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub version: u32,
    pub providers: Providers,
}
pub fn parse(text: &str) -> Result<Config, String> {
    let config: Config = serde_json::from_str(text).map_err(|e| format!("Invalid cloud configuration: {e}"))?;
    if config.version != 1 { return Err("Unsupported cloud configuration version".into()); }
    validate_client_id(&config.providers.alipan.client_id)?;
    let container = &config.providers.icloud.container_id;
    if !container.is_empty() && (!container.starts_with("iCloud.") || container.len() <= 7 || !container.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'.' || c == b'-')) {
        return Err("Invalid iCloud container ID".into());
    }
    Ok(config)
}
pub fn validate_client_id(id: &str) -> Result<(), String> {
    if id.len() > 256 || !id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_' || c == b'.') {
        return Err("Invalid Alipan App ID".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_unconfigured_and_configured_providers() {
        assert!(parse(r#"{"version":1,"providers":{}}"#).is_ok());
        let c = parse(r#"{"version":1,"providers":{"alipan":{"clientId":"test-id"},"icloud":{"containerId":"iCloud.com.example.app"}}}"#).unwrap();
        assert_eq!(c.providers.alipan.client_id, "test-id");
    }
    #[test]
    fn rejects_typos_secrets_and_invalid_values() {
        for value in [
            r#"{"version":2,"providers":{}}"#,
            r#"{"version":1,"providers":{"alipan":{"clientSecret":"secret"}}}"#,
            r#"{"version":1,"providers":{"unknown":{}}}"#,
            r#"{"version":1,"providers":{"icloud":{"containerId":"wrong"}}}"#,
            r#"{"version":1,"providers":{"alipan":{"clientId":"abc\ndef"}}}"#,
        ] { assert!(parse(value).is_err()); }
    }
}
