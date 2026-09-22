use crate::cache::Cache;
use crate::http::{env, AppError};
use crate::model::{PlayingGame, RecentGame, Steam};
use crate::sources::cached_get;
use serde_json::Value;
use std::time::Duration;

const SUMMARY_TTL: Duration = Duration::from_secs(60);
const SLOW_TTL: Duration = Duration::from_secs(600);

fn player(summary: &Value) -> Option<&Value> {
    summary["response"]["players"].as_array()?.first()
}

fn state_name(code: u64) -> &'static str {
    match code {
        1 => "online",
        2 => "busy",
        3 => "away",
        4 => "snooze",
        _ => "offline",
    }
}

pub fn playing(summary: &Value) -> Option<PlayingGame> {
    let p = player(summary)?;
    let name = p["gameextrainfo"].as_str()?;
    Some(PlayingGame {
        name: name.to_string(),
        app_id: p["gameid"].as_str().map(str::to_string),
    })
}

pub fn normalize(summary: &Value, level: &Value, friends: &Value, recent: &Value) -> Option<Steam> {
    let p = player(summary)?;
    Some(Steam {
        persona: p["personaname"].as_str().unwrap_or_default().to_string(),
        avatar: p["avatarmedium"].as_str().unwrap_or_default().to_string(),
        state: state_name(p["personastate"].as_u64().unwrap_or(0)).to_string(),
        level: level["response"]["player_level"].as_u64().unwrap_or(0),
        friends: friends["friendslist"]["friends"].as_array().map(|a| a.len() as u64).unwrap_or(0),
        recent: recent["response"]["games"].as_array().map(|games| games.iter().map(|g| {
            let app_id = g["appid"].as_u64().unwrap_or(0);
            RecentGame {
                app_id,
                name: g["name"].as_str().unwrap_or_default().to_string(),
                minutes_2weeks: g["playtime_2weeks"].as_u64().unwrap_or(0),
                minutes_total: g["playtime_forever"].as_u64().unwrap_or(0),
                thumb: format!("https://media.steampowered.com/steam/apps/{app_id}/header.jpg"),
            }
        }).collect()).unwrap_or_default(),
    })
}

pub async fn fetch(
    client: &reqwest::Client,
    cache: &Cache,
) -> Result<(Value, Value, Value, Value), AppError> {
    let key = env("STEAM_API_KEY")?;
    let id = env("STEAM_ID")?;

    let summary_url = format!(
        "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key={key}&steamids={id}&format=json"
    );
    let level_url = format!(
        "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key={key}&steamid={id}&format=json"
    );
    let friends_url = format!(
        "https://api.steampowered.com/ISteamUser/GetFriendList/v0001/?key={key}&steamid={id}&relationship=friend&format=json"
    );
    let recent_url = format!(
        "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key={key}&steamid={id}&count=4&format=json"
    );

    let (summary, level, friends, recent) = tokio::join!(
        cached_get(client, cache, "steam:summary", SUMMARY_TTL, &summary_url, &[]),
        cached_get(client, cache, "steam:level", SLOW_TTL, &level_url, &[]),
        cached_get(client, cache, "steam:friends", SLOW_TTL, &friends_url, &[]),
        cached_get(client, cache, "steam:recent", SLOW_TTL, &recent_url, &[]),
    );
    Ok((summary?, level?, friends?, recent?))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::json;

    #[test]
    fn playing_returns_the_current_game() {
        let g = playing(&fixture("steam_summary")).unwrap();
        assert_eq!(g.name, "Counter-Strike 2");
        assert_eq!(g.app_id.as_deref(), Some("730"));
    }

    #[test]
    fn playing_is_none_when_no_game_is_running() {
        let mut s = fixture("steam_summary");
        s["response"]["players"][0].as_object_mut().unwrap().remove("gameextrainfo");
        assert_eq!(playing(&s), None);
    }

    #[test]
    fn normalize_maps_the_persona_state_number_to_a_name() {
        let s = normalize(
            &fixture("steam_summary"),
            &json!({ "response": { "player_level": 21 } }),
            &json!({ "friendslist": { "friends": [ {}, {}, {} ] } }),
            &fixture("steam_recent"),
        ).unwrap();
        assert_eq!(s.state, "online");
        assert_eq!(s.level, 21);
        assert_eq!(s.friends, 3);
        assert_eq!(s.persona, "kiiyo");
    }

    #[test]
    fn normalize_maps_every_known_persona_state() {
        for (code, name) in [(0, "offline"), (1, "online"), (2, "busy"), (3, "away"), (4, "snooze")] {
            let mut sum = fixture("steam_summary");
            sum["response"]["players"][0]["personastate"] = json!(code);
            let s = normalize(&sum, &json!({}), &json!({}), &json!({})).unwrap();
            assert_eq!(s.state, name, "persona state {code}");
        }
    }

    #[test]
    fn normalize_falls_back_to_offline_for_an_unknown_state() {
        let mut sum = fixture("steam_summary");
        sum["response"]["players"][0]["personastate"] = json!(99);
        assert_eq!(normalize(&sum, &json!({}), &json!({}), &json!({})).unwrap().state, "offline");
    }

    #[test]
    fn normalize_builds_the_header_thumbnail_url_from_the_appid() {
        let s = normalize(
            &fixture("steam_summary"), &json!({}), &json!({}), &fixture("steam_recent"),
        ).unwrap();
        assert_eq!(s.recent[0].thumb,
            "https://media.steampowered.com/steam/apps/730/header.jpg");
        assert_eq!(s.recent[0].minutes_2weeks, 630);
        assert_eq!(s.recent[0].minutes_total, 74400);
    }

    #[test]
    fn normalize_is_none_without_a_player() {
        assert_eq!(normalize(&json!({}), &json!({}), &json!({}), &json!({})), None);
    }
}
