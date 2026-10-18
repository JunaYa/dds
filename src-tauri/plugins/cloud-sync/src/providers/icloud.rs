use super::*;

pub(super) struct ICloud;
impl<R: Runtime> CloudProvider<R> for ICloud {
    fn status<'a>(&self, cloud: &'a Cloud<R>) -> CloudResult<'a, Value> {
        Box::pin(cloud.icloud("cloudStatus", json!({})))
    }
    fn pull<'a>(&self, cloud: &'a Cloud<R>, account: &'a str) -> CloudResult<'a, Value> {
        Box::pin(cloud.icloud("cloudPull", json!({"account":account})))
    }
    fn push<'a>(&self, cloud: &'a Cloud<R>, account: &'a str, name: &'a str, content: &'a str) -> CloudResult<'a, Value> {
        Box::pin(cloud.icloud("cloudPush", json!({"account":account,"name":name,"content":content})))
    }
}
