use crate::cache::Cache;
use crate::http::{env, AppError};
use crate::model::Presence;
use crate::sources::cached_get;
use serde_json::Value;
use std::time::Duration;

const TTL: Duration = Duration::from_secs(30);

fn activity_of(data: &Value) -> Option<String> {
    if let Some(s) = data["spotify"].as_object() {
        let song = s.get("song")?.as_str()?;
        let artist = s.get("artist")?.as_str().unwrap_or_default();
        return Some(format!("{song}, {artist}"));
    }
    let activities = data["activities"].as_array()?;
    if let Some(game) = activities.iter().find(|a| a["type"].as_u64() == Some(0)) {
        return game["name"].as_str().map(str::to_string);
    }
    activities
        .iter()
        .find(|a| a["type"].as_u64() == Some(4))
        .and_then(|a| a["state"].as_str())
        .map(str::to_string)
}

pub fn normalize(lanyard: &Value) -> Option<Presence> {
    if lanyard["success"].as_bool() != Some(true) {
        return None;
    }
    let data = &lanyard["data"];
    let user = &data["discord_user"];

    let name = user["global_name"]
        .as_str()
        .or_else(|| user["username"].as_str())
        .unwrap_or_default()
        .to_string();

    // Clamped to the four values the frontend's dot colour mapping expects.
    let status = data["discord_status"]
        .as_str()
        .filter(|s| matches!(*s, "online" | "idle" | "dnd"))
        .unwrap_or("offline")
        .to_string();

    Some(Presence {
        name,
        status,
        activity: activity_of(data),
    })
}

pub async fn fetch(client: &reqwest::Client, cache: &Cache) -> Result<Value, AppError> {
    let id = env("DISCORD_USER_ID")?;
    let url = format!("https://api.lanyard.rest/v1/users/{id}");
    cached_get(client, cache, "discord", TTL, &url, &[]).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::json;

    #[test]
    fn normalize_prefers_the_global_name() {
        let p = normalize(&fixture("lanyard")).unwrap();
        assert_eq!(p.name, "Kiiyo");
        assert_eq!(p.status, "online");
    }

    #[test]
    fn normalize_falls_back_to_the_username() {
        let mut l = fixture("lanyard");
        l["data"]["discord_user"]["global_name"] = json!(null);
        assert_eq!(normalize(&l).unwrap().name, "kiiyo");
    }

    #[test]
    fn a_playing_activity_wins_over_a_custom_status() {
        assert_eq!(normalize(&fixture("lanyard")).unwrap().activity.as_deref(), Some("Counter-Strike 2"));
    }

    #[test]
    fn spotify_wins_over_a_playing_activity() {
        let mut l = fixture("lanyard");
        l["data"]["spotify"] = json!({ "song": "Song", "artist": "Artist", "album_art_url": "x" });
        assert_eq!(normalize(&l).unwrap().activity.as_deref(), Some("Song, Artist"));
    }

    #[test]
    fn a_custom_status_is_used_when_nothing_else_is_running() {
        let mut l = fixture("lanyard");
        l["data"]["activities"] = json!([ { "type": 4, "name": "Custom Status", "state": "wonderful everyday" } ]);
        assert_eq!(normalize(&l).unwrap().activity.as_deref(), Some("wonderful everyday"));
    }

    #[test]
    fn normalize_is_none_when_lanyard_reports_failure() {
        assert_eq!(normalize(&json!({ "success": false })), None);
    }

    #[test]
    fn an_unknown_status_becomes_offline() {
        let mut l = fixture("lanyard");
        l["data"]["discord_status"] = json!("something_new");
        assert_eq!(normalize(&l).unwrap().status, "offline");
    }
}
