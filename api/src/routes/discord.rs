use axum::{Json, extract::State};
use serde_json::Value;
use super::{AppState, AppError, env, proxy};

pub async fn lanyard(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let user_id = env("DISCORD_USER_ID")?;
    let url = format!("https://api.lanyard.rest/v1/users/{user_id}");
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}
