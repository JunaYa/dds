use super::*;

pub(super) struct Alipan;
impl<R: Runtime> CloudProvider<R> for Alipan {
    fn status<'a>(&self, cloud: &'a Cloud<R>) -> CloudResult<'a, Value> {
        Box::pin(async move {
            if client_id().is_err() { return Ok(json!({"configured":false,"connected":false})); }
            match cloud.credentials(None) {
                Ok(c) => Ok(json!({"configured":true,"connected":true,"account":c.account,"expiresAt":c.expires_at})),
                Err(_) => Ok(json!({"configured":true,"connected":false})),
            }
        })
    }
    fn begin_auth<'a>(&self, cloud: &'a Cloud<R>) -> CloudResult<'a, Value> {
        Box::pin(alipan_auth::begin_auth(cloud))
    }
    fn poll_auth<'a>(&self, cloud: &'a Cloud<R>) -> CloudResult<'a, bool> {
        Box::pin(alipan_auth::poll_auth(cloud))
    }
    fn disconnect<'a>(&self, cloud: &'a Cloud<R>) -> CloudResult<'a, ()> {
        Box::pin(alipan_auth::disconnect(cloud))
    }
    fn pull<'a>(&self, cloud: &'a Cloud<R>, account: &'a str) -> CloudResult<'a, Value> {
        Box::pin(async move { cloud.ali_pull(&cloud.credentials(Some(account))?).await })
    }
    fn push<'a>(&self, cloud: &'a Cloud<R>, account: &'a str, name: &'a str, content: &'a str) -> CloudResult<'a, Value> {
        Box::pin(async move {
            cloud.ali_push(&cloud.credentials(Some(account))?, name, content).await?;
            Ok(json!({"name":name}))
        })
    }
}
