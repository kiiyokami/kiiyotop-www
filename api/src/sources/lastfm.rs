use crate::cache::Cache;
use crate::http::{env, AppError};
use crate::model::{Lastfm, TopArtist, Track};
use crate::sources::cached_get;
use serde_json::Value;
use std::time::Duration;

const RECENT_TTL: Duration = Duration::from_secs(30);
const SLOW_TTL: Duration = Duration::from_secs(600);

/// Last.fm serves this image hash when a track has no cover art.
const PLACEHOLDER_ART: &str = "2a96cbd8b46e442fc41c2b86b821562f";

fn art_of(track: &Value) -> Option<String> {
    let url = track["image"]
        .as_array()?
        .iter()
        .find(|i| i["size"] == "medium")
        .and_then(|i| i["#text"].as_str())
        .filter(|s| !s.is_empty())?;
    if url.contains(PLACEHOLDER_ART) {
        return None;
    }
    Some(url.to_string())
}

fn track_of(track: &Value) -> Track {
    Track {
        name: track["name"].as_str().unwrap_or_default().to_string(),
        artist: track["artist"]["#text"].as_str().unwrap_or_default().to_string(),
        art: art_of(track),
        live: track["@attr"]["nowplaying"].as_str() == Some("true"),
        played_at: track["date"]["uts"].as_str().and_then(|s| s.parse().ok()),
    }
}

/// Last.fm returns every count as a string.
fn count(v: &Value) -> u64 {
    v.as_str().and_then(|s| s.parse().ok()).unwrap_or(0)
}

pub fn now_playing(recent: &Value) -> Option<Track> {
    let first = recent["recenttracks"]["track"].as_array()?.first()?;
    let track = track_of(first);
    if track.live { Some(track) } else { None }
}

pub fn normalize(recent: &Value, artists: &Value) -> Lastfm {
    let all: Vec<Track> = recent["recenttracks"]["track"]
        .as_array()
        .map(|a| a.iter().map(track_of).collect())
        .unwrap_or_default();

    Lastfm {
        total_scrobbles: count(&recent["recenttracks"]["@attr"]["total"]),
        recent: all,
        top_artists: artists["topartists"]["artist"]
            .as_array()
            .map(|a| a.iter().take(5).map(|x| TopArtist {
                name: x["name"].as_str().unwrap_or_default().to_string(),
                playcount: count(&x["playcount"]),
            }).collect())
            .unwrap_or_default(),
    }
}

pub async fn fetch(
    client: &reqwest::Client,
    cache: &Cache,
) -> Result<(Value, Value), AppError> {
    let key = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    let base = "https://ws.audioscrobbler.com/2.0/";

    let recent_url = format!("{base}?method=user.getrecenttracks&user={user}&api_key={key}&limit=6&format=json");
    let artists_url = format!("{base}?method=user.gettopartists&user={user}&api_key={key}&limit=5&period=1month&format=json");

    let (recent, artists) = tokio::join!(
        cached_get(client, cache, "lastfm:recent", RECENT_TTL, &recent_url, &[]),
        cached_get(client, cache, "lastfm:artists", SLOW_TTL, &artists_url, &[]),
    );
    Ok((recent?, artists?))
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;

    #[test]
    fn now_playing_returns_the_live_track_with_its_art() {
        let track = now_playing(&fixture("lastfm_recent")).unwrap();
        assert_eq!(track.name, "Live Song");
        assert_eq!(track.artist, "Live Artist");
        assert_eq!(track.art.as_deref(), Some("https://example.test/m.png"));
        assert!(track.live);
    }

    #[test]
    fn tracks_carry_when_they_were_played_and_live_ones_do_not() {
        let l = normalize(&fixture("lastfm_recent"), &fixture("lastfm_top_artists"));
        let past = l.recent.iter().find(|t| t.name == "Past Song").unwrap();
        assert_eq!(past.played_at, Some(1790000000));
        let live = l.recent.iter().find(|t| t.live).unwrap();
        assert_eq!(live.played_at, None, "a now-playing track has no scrobble time yet");
    }

    #[test]
    fn now_playing_is_none_when_the_first_track_is_not_live() {
        let mut recent = fixture("lastfm_recent");
        recent["recenttracks"]["track"].as_array_mut().unwrap().remove(0);
        assert_eq!(now_playing(&recent), None);
    }

    #[test]
    fn now_playing_is_none_for_an_empty_response() {
        assert_eq!(now_playing(&serde_json::json!({})), None);
    }

    #[test]
    fn normalize_parses_the_string_total_into_a_number() {
        let l = normalize(
            &fixture("lastfm_recent"),
            &fixture("lastfm_top_artists"),
        );
        assert_eq!(l.total_scrobbles, 48213);
    }

    #[test]
    fn normalize_drops_the_lastfm_placeholder_image() {
        let l = normalize(
            &fixture("lastfm_recent"),
            &fixture("lastfm_top_artists"),
        );
        let past = l.recent.iter().find(|t| t.name == "Past Song").unwrap();
        assert_eq!(past.art, None, "the known placeholder hash must not become an <img> src");
    }

    #[test]
    fn normalize_parses_string_playcounts() {
        let l = normalize(
            &fixture("lastfm_recent"),
            &fixture("lastfm_top_artists"),
        );
        assert_eq!(l.top_artists[0], crate::model::TopArtist {
            name: "Artist One".into(), playcount: 412,
        });
    }

    #[test]
    fn normalize_survives_a_completely_empty_response() {
        let empty = serde_json::json!({});
        let l = normalize(&empty, &empty);
        assert_eq!(l.total_scrobbles, 0);
        assert!(l.recent.is_empty());
        assert!(l.top_artists.is_empty());
    }
}
