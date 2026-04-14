use axum::{Json, extract::State};
use serde_json::Value;
use super::{AppState, AppError, env, proxy};

pub async fn summary(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key      = env("STEAM_API_KEY")?;
    let steam_id = env("STEAM_ID")?;
    let url = format!(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={key}&steamids={steam_id}&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

pub async fn recent(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key      = env("STEAM_API_KEY")?;
    let steam_id = env("STEAM_ID")?;
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key={key}&steamid={steam_id}&count=4&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

pub async fn level(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key      = env("STEAM_API_KEY")?;
    let steam_id = env("STEAM_ID")?;
    let url = format!(
        "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key={key}&steamid={steam_id}&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

pub async fn friends(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key      = env("STEAM_API_KEY")?;
    let steam_id = env("STEAM_ID")?;
    let url = format!(
        "https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key={key}&steamid={steam_id}&relationship=friend&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}
