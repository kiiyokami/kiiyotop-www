pub mod discord;
pub mod lastfm;
pub mod leetify;
pub mod osu;
pub mod steam;
pub mod vndb;

use crate::cache::Cache;
use crate::http::{get_json, AppError};
use serde_json::Value;
use std::time::Duration;

/// How long a value may outlive its TTL and still stand in for a failing upstream.
pub(crate) const MAX_STALE: Duration = Duration::from_secs(24 * 3600);

/// Shared by every source: return the cached value if it is still within its
/// TTL, otherwise fetch it fresh and store the result before returning it. If
/// the fetch fails, the last good value (up to `MAX_STALE` old) is served
/// instead, so one upstream blip does not blank a window.
pub(crate) async fn cached_get(
    client: &reqwest::Client,
    cache: &Cache,
    key: &str,
    ttl: Duration,
    url: &str,
    headers: &[(&str, &str)],
) -> Result<Value, AppError> {
    if let Some(hit) = cache.get(key, ttl).await {
        return Ok(hit);
    }
    match get_json(client, url, headers).await {
        Ok(fresh) => {
            cache.put(key, fresh.clone()).await;
            Ok(fresh)
        }
        Err(e) => match cache.get_stale(key, MAX_STALE).await {
            Some(old) => {
                tracing::warn!(key, error = %e, "upstream failed, serving the last good value");
                Ok(old)
            }
            None => Err(e),
        },
    }
}

/// For sources that cache several keys as one unit (osu, vndb): the last good
/// value of every key, or nothing if any is missing.
pub(crate) async fn stale_all<const N: usize>(cache: &Cache, keys: [&str; N]) -> Option<Vec<Value>> {
    let mut out = Vec::with_capacity(N);
    for k in keys {
        out.push(cache.get_stale(k, MAX_STALE).await?);
    }
    Some(out)
}

#[cfg(test)]
pub(crate) fn fixture(name: &str) -> Value {
    let path = format!("{}/tests/fixtures/{name}.json", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("reading {path}: {e}"));
    serde_json::from_str(&text).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn cached_get_serves_the_last_good_value_when_the_upstream_fails() {
        let server = MockServer::start().await;
        Mock::given(method("GET")).and(path("/x"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({"n": 1})))
            .up_to_n_times(1).mount(&server).await;
        Mock::given(method("GET")).and(path("/x"))
            .respond_with(ResponseTemplate::new(500)).mount(&server).await;

        let client = reqwest::Client::new();
        let cache = Cache::new();
        let url = format!("{}/x", server.uri());
        let ttl = Duration::from_millis(1);

        let first = cached_get(&client, &cache, "k", ttl, &url, &[]).await.unwrap();
        std::thread::sleep(Duration::from_millis(10));
        let second = cached_get(&client, &cache, "k", ttl, &url, &[]).await;
        assert_eq!(second.unwrap(), first, "expired and failing: the stale value stands in");
    }

    #[tokio::test]
    async fn cached_get_still_errors_when_there_is_nothing_stale() {
        let server = MockServer::start().await;
        Mock::given(method("GET")).respond_with(ResponseTemplate::new(500)).mount(&server).await;
        let url = format!("{}/x", server.uri());
        let r = cached_get(&reqwest::Client::new(), &Cache::new(), "k", Duration::from_secs(5), &url, &[]).await;
        assert!(r.is_err());
    }
}
