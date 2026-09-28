pub mod discord;
pub mod github;
pub mod lastfm;
pub mod leetify;
pub mod osu;
pub mod steam;
pub mod vndb;

use crate::cache::Cache;
use crate::http::{get_json, post_json, AppError};
use serde_json::Value;
use std::time::Duration;

/// Shared by every source: return the cached value if it is still within its
/// TTL, otherwise fetch it fresh and store the result before returning it.
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
    let fresh = get_json(client, url, headers).await?;
    cache.put(key, fresh.clone()).await;
    Ok(fresh)
}

/// The POST twin of `cached_get`, for APIs that take their query in the body
/// (GitHub GraphQL). The key must identify the query, since the body is not
/// part of it. `validate` runs before caching, because GraphQL reports
/// failures inside a 200 body that must not be served for a whole TTL.
#[allow(clippy::too_many_arguments)]
pub(crate) async fn cached_post(
    client: &reqwest::Client,
    cache: &Cache,
    key: &str,
    ttl: Duration,
    url: &str,
    headers: &[(&str, &str)],
    body: &Value,
    validate: fn(&Value) -> Result<(), AppError>,
) -> Result<Value, AppError> {
    if let Some(hit) = cache.get(key, ttl).await {
        return Ok(hit);
    }
    let fresh = post_json(client, url, headers, body).await?;
    validate(&fresh)?;
    cache.put(key, fresh.clone()).await;
    Ok(fresh)
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
    async fn cached_post_serves_the_second_call_from_the_cache() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/q"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({"n": 1})))
            .expect(1)
            .mount(&server)
            .await;

        let client = reqwest::Client::new();
        let cache = Cache::new();
        let url = format!("{}/q", server.uri());
        let body = serde_json::json!({"query": "x"});
        let ttl = Duration::from_secs(60);

        let first = cached_post(&client, &cache, "k", ttl, &url, &[], &body, |_| Ok(())).await.unwrap();
        let second = cached_post(&client, &cache, "k", ttl, &url, &[], &body, |_| Ok(())).await.unwrap();

        assert_eq!(first, second);
        // MockServer verifies `.expect(1)` when it drops: a second request fails the test.
    }

    #[tokio::test]
    async fn cached_post_does_not_cache_a_body_the_validator_rejects() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/q"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({"errors": ["boom"]})))
            .expect(2)
            .mount(&server)
            .await;

        let client = reqwest::Client::new();
        let cache = Cache::new();
        let url = format!("{}/q", server.uri());
        let body = serde_json::json!({});
        let ttl = Duration::from_secs(60);
        let reject = |_: &Value| Err(AppError("bad body".into()));

        assert!(cached_post(&client, &cache, "k", ttl, &url, &[], &body, reject).await.is_err());
        assert!(cached_post(&client, &cache, "k", ttl, &url, &[], &body, reject).await.is_err());
        // `.expect(2)`: the second call went to the network, not the cache.
    }
}
