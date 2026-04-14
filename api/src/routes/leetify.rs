use axum::{Json, extract::State};
use serde_json::Value;
use super::{AppState, AppError, env, proxy};

pub async fn profile(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let steam_id = env("STEAM_ID")?;
    let api_key  = std::env::var("LEETIFY_API_KEY").unwrap_or_default();
    let url = format!(
        "https://api-public.cs-prod.leetify.com/v3/profile?steam64_id={steam_id}"
    );
    let headers: Vec<(&str, String)> = if api_key.is_empty() {
        vec![]
    } else {
        vec![("Authorization", format!("Bearer {api_key}"))]
    };
    let header_refs: Vec<(&str, &str)> = headers.iter().map(|(k, v)| (*k, v.as_str())).collect();
    Ok(Json(proxy(&s.client, &url, &header_refs).await?))
}
