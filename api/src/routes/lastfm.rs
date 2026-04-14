use axum::{Json, extract::{Query, State}};
use serde::Deserialize;
use serde_json::Value;
use super::{AppState, AppError, env, proxy};

pub async fn recent(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key  = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    let url  = format!(
        "https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user={user}&api_key={key}&limit=6&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

pub async fn top_artists(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key  = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    let url  = format!(
        "https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user={user}&api_key={key}&limit=5&period=1month&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

pub async fn top_tracks(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key  = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    let url  = format!(
        "https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user={user}&api_key={key}&limit=5&period=1month&format=json"
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

#[derive(Deserialize)]
pub struct ArtistQuery {
    pub artist: String,
}

pub async fn artist_tags(
    State(s): State<AppState>,
    Query(q): Query<ArtistQuery>,
) -> Result<Json<Value>, AppError> {
    let key = env("LASTFM_API_KEY")?;
    let url = format!(
        "https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist={}&api_key={key}&format=json",
        urlencoding::encode(&q.artist)
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}
