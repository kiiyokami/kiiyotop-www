pub mod discord;
pub mod github;
pub mod lastfm;
pub mod leetify;
pub mod maimai;
pub mod osu;
pub mod steam;
pub mod vndb;

use crate::cache::Cache;
use crate::http::{get_json, AppError};
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

#[cfg(test)]
pub(crate) fn fixture(name: &str) -> Value {
    let path = format!("{}/tests/fixtures/{name}.json", env!("CARGO_MANIFEST_DIR"));
    let text = std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("reading {path}: {e}"));
    serde_json::from_str(&text).unwrap()
}
