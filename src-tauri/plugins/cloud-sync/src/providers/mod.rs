use super::*;
use std::{future::Future, pin::Pin};

type CloudResult<'a, T> = Pin<Box<dyn Future<Output = Result<T, String>> + Send + 'a>>;

// Providers exchange immutable snapshots; merging and conflict policy stay in the sync engine.
pub(super) trait CloudProvider<R: Runtime>: Send + Sync {
    fn status<'a>(&self, cloud: &'a Cloud<R>) -> CloudResult<'a, Value>;
    fn pull<'a>(&self, cloud: &'a Cloud<R>, account: &'a str) -> CloudResult<'a, Value>;
    fn push<'a>(&self, cloud: &'a Cloud<R>, account: &'a str, name: &'a str, content: &'a str) -> CloudResult<'a, Value>;
    fn begin_auth<'a>(&self, _cloud: &'a Cloud<R>) -> CloudResult<'a, Value> {
        Box::pin(async { Err("This provider uses the system account".into()) })
    }
    fn poll_auth<'a>(&self, _cloud: &'a Cloud<R>) -> CloudResult<'a, bool> {
        Box::pin(async { Err("This provider uses the system account".into()) })
    }
    fn disconnect<'a>(&self, _cloud: &'a Cloud<R>) -> CloudResult<'a, ()> {
        Box::pin(async { Err("Manage this account in system settings".into()) })
    }
}

mod alipan;
mod icloud;

pub(super) fn get<R: Runtime>(id: &str) -> Result<&'static dyn CloudProvider<R>, String> {
    match id {
        "alipan" => Ok(&alipan::Alipan),
        "icloud" => Ok(&icloud::ICloud),
        _ => Err("Unknown cloud provider".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn registry_rejects_unknown_providers() {
        assert!(get::<tauri::Wry>("alipan").is_ok());
        assert!(get::<tauri::Wry>("icloud").is_ok());
        assert!(get::<tauri::Wry>("other").is_err());
        assert!(get::<tauri::Wry>("").is_err());
    }
}
