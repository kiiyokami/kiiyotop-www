use axum::{Json, extract::State};
use serde_json::{Value, json};
use super::{AppState, AppError, env, proxy};

pub async fn snapshot(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let (discord, lastfm_recent, lastfm_artists, steam_summary, steam_level, steam_recent, leetify, osu_user) = tokio::join!(
        fetch_discord(&s),
        fetch_lastfm_recent(&s),
        fetch_lastfm_artists(&s),
        fetch_steam_summary(&s),
        fetch_steam_level(&s),
        fetch_steam_recent(&s),
        fetch_leetify(&s),
        fetch_osu(&s),
    );

    let now_playing = lastfm_recent.ok().and_then(|v| {
        v["recenttracks"]["track"]
            .as_array()?
            .first()
            .and_then(|t| {
                if t["@attr"]["nowplaying"].as_str() == Some("true") {
                    Some(json!({
                        "name":   t["name"],
                        "artist": t["artist"]["#text"],
                        "album":  t["album"]["#text"],
                    }))
                } else {
                    None
                }
            })
    });

    let top_artist = lastfm_artists.ok().and_then(|v| {
        v["topartists"]["artist"]
            .as_array()?
            .first()
            .and_then(|a| a["name"].as_str().map(|s| s.to_string()))
    });

    // Steam: pull the first player object and level
    let (player, level) = {
        let p = steam_summary.ok().and_then(|v| {
            v["response"]["players"]
                .as_array()?
                .first()
                .cloned()
        });
        let lvl = steam_level.ok()
            .and_then(|v| v["response"]["player_level"].as_u64());
        (p, lvl)
    };

    let recent_games = steam_recent.ok()
        .and_then(|v| v["response"]["games"].as_array().cloned())
        .unwrap_or_default();

    // Leetify: just the headline numbers
    let leetify_snap = leetify.ok().map(|v| json!({
        "rating":  v["ranks"]["leetify"],
        "premier": v["ranks"]["premier"],
        "faceit":  v["ranks"]["faceit"],
    }));

    let osu_snap = osu_user.ok().and_then(|v| {
        let u = v.as_array()?.first()?;
        Some(json!({
            "username": u["username"],
            "pp":       u["pp_raw"],
            "rank":     u["pp_rank"],
            "country_rank": u["pp_country_rank"],
        }))
    });

    Ok(Json(json!({
        "discord": discord.ok(),
        "lastfm":  { "now_playing": now_playing, "top_artist": top_artist },
        "steam":   { "summary": player, "level": level, "recent": recent_games },
        "leetify": leetify_snap,
        "osu":     osu_snap,
    })))
}

// ── Private fetch helpers ──────────────────────────────────────────────────

async fn fetch_discord(s: &AppState) -> Result<Value, AppError> {
    let user_id = env("DISCORD_USER_ID")?;
    proxy(&s.client, &format!("https://api.lanyard.rest/v1/users/{user_id}"), &[]).await
}

async fn fetch_lastfm_recent(s: &AppState) -> Result<Value, AppError> {
    let key  = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    proxy(&s.client,
        &format!("https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user={user}&api_key={key}&limit=1&format=json"),
        &[]).await
}

async fn fetch_lastfm_artists(s: &AppState) -> Result<Value, AppError> {
    let key  = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    proxy(&s.client,
        &format!("https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user={user}&api_key={key}&limit=1&period=1month&format=json"),
        &[]).await
}

async fn fetch_steam_summary(s: &AppState) -> Result<Value, AppError> {
    let key = env("STEAM_API_KEY")?;
    let id  = env("STEAM_ID")?;
    proxy(&s.client,
        &format!("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={key}&steamids={id}&format=json"),
        &[]).await
}

async fn fetch_steam_level(s: &AppState) -> Result<Value, AppError> {
    let key = env("STEAM_API_KEY")?;
    let id  = env("STEAM_ID")?;
    proxy(&s.client,
        &format!("https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key={key}&steamid={id}&format=json"),
        &[]).await
}

async fn fetch_steam_recent(s: &AppState) -> Result<Value, AppError> {
    let key = env("STEAM_API_KEY")?;
    let id  = env("STEAM_ID")?;
    proxy(&s.client,
        &format!("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key={key}&steamid={id}&count=4&format=json"),
        &[]).await
}

async fn fetch_leetify(s: &AppState) -> Result<Value, AppError> {
    let id      = env("STEAM_ID")?;
    let api_key = std::env::var("LEETIFY_API_KEY").unwrap_or_default();
    let url     = format!("https://api-public.cs-prod.leetify.com/v3/profile?steam64_id={id}");
    let headers: Vec<(&str, String)> = if api_key.is_empty() {
        vec![]
    } else {
        vec![("Authorization", format!("Bearer {api_key}"))]
    };
    let header_refs: Vec<(&str, &str)> = headers.iter().map(|(k, v)| (*k, v.as_str())).collect();
    proxy(&s.client, &url, &header_refs).await
}

async fn fetch_osu(s: &AppState) -> Result<Value, AppError> {
    let key  = env("OSU_API_KEY")?;
    let user = env("OSU_USER")?;
    proxy(&s.client,
        &format!("https://osu.ppy.sh/api/get_user?k={key}&u={}&m=0", urlencoding::encode(&user)),
        &[]).await
}
