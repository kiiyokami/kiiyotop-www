pub mod discord;
pub mod lastfm;
pub mod leetify;
pub mod now;
pub mod osu;
pub mod steam;

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::Value;

#[derive(Clone)]
pub struct AppState {
    pub client: reqwest::Client,
}

pub async fn proxy(
    client: &reqwest::Client,
    url: &str,
    headers: &[(&str, &str)],
) -> Result<Value, AppError> {
    let mut req = client.get(url);
    for (k, v) in headers {
        req = req.header(*k, *v);
    }
    let resp = req.send().await.map_err(|e| AppError(e.to_string()))?;
    let json = resp.json::<Value>().await.map_err(|e| AppError(e.to_string()))?;
    Ok(json)
}

pub fn env(key: &str) -> Result<String, AppError> {
    std::env::var(key).map_err(|_| AppError(format!("missing env var: {key}")))
}

// ── Error type ─────────────────────────────────────────────────────────────

pub struct AppError(pub String);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = Json(serde_json::json!({ "error": self.0 }));
        (StatusCode::BAD_GATEWAY, body).into_response()
    }
}
