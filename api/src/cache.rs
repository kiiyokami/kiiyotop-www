use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

struct Entry {
    value: Value,
    stored_at: Instant,
}

/// Freshness is decided by the reader, not the entry, so each source can hold
/// its own TTL against one shared store.
#[derive(Clone)]
pub struct Cache {
    inner: Arc<Mutex<HashMap<String, Entry>>>,
}

impl Cache {
    pub fn new() -> Self {
        Cache { inner: Arc::new(Mutex::new(HashMap::new())) }
    }

    pub async fn get(&self, key: &str, ttl: Duration) -> Option<Value> {
        let map = self.inner.lock().await;
        let entry = map.get(key)?;
        if entry.stored_at.elapsed() >= ttl {
            return None;
        }
        Some(entry.value.clone())
    }

    pub async fn put(&self, key: &str, value: Value) {
        let mut map = self.inner.lock().await;
        map.insert(key.to_string(), Entry { value, stored_at: Instant::now() });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::time::Duration;

    #[tokio::test]
    async fn returns_none_for_a_key_never_written() {
        let cache = Cache::new();
        assert_eq!(cache.get("absent", Duration::from_secs(60)).await, None);
    }

    #[tokio::test]
    async fn returns_the_value_within_ttl() {
        let cache = Cache::new();
        cache.put("k", json!({"a": 1})).await;
        assert_eq!(cache.get("k", Duration::from_secs(60)).await, Some(json!({"a": 1})));
    }

    #[tokio::test]
    async fn returns_none_once_the_entry_is_older_than_ttl() {
        let cache = Cache::new();
        cache.put("k", json!({"a": 1})).await;
        assert_eq!(cache.get("k", Duration::ZERO).await, None);
    }

    #[tokio::test]
    async fn a_second_put_replaces_the_first() {
        let cache = Cache::new();
        cache.put("k", json!(1)).await;
        cache.put("k", json!(2)).await;
        assert_eq!(cache.get("k", Duration::from_secs(60)).await, Some(json!(2)));
    }

    #[tokio::test]
    async fn keys_do_not_collide() {
        let cache = Cache::new();
        cache.put("a", json!(1)).await;
        cache.put("b", json!(2)).await;
        assert_eq!(cache.get("a", Duration::from_secs(60)).await, Some(json!(1)));
        assert_eq!(cache.get("b", Duration::from_secs(60)).await, Some(json!(2)));
    }
}
