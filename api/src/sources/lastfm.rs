use crate::cache::Cache;
use crate::http::{env, AppError};
use crate::model::{Lastfm, TopArtist, TopTrack, Track};
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

pub fn normalize(recent: &Value, artists: &Value, tracks: &Value, genres: Vec<String>) -> Lastfm {
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
        top_tracks: tracks["toptracks"]["track"]
            .as_array()
            .map(|a| a.iter().take(5).map(|x| TopTrack {
                name: x["name"].as_str().unwrap_or_default().to_string(),
                artist: x["artist"]["name"].as_str().unwrap_or_default().to_string(),
                playcount: count(&x["playcount"]),
            }).collect())
            .unwrap_or_default(),
        genres,
    }
}

pub async fn fetch(
    client: &reqwest::Client,
    cache: &Cache,
) -> Result<(Value, Value, Value, Vec<String>), AppError> {
    let key = env("LASTFM_API_KEY")?;
    let user = env("LASTFM_USER")?;
    let base = "https://ws.audioscrobbler.com/2.0/";

    let recent_url = format!("{base}?method=user.getrecenttracks&user={user}&api_key={key}&limit=6&format=json");
    let artists_url = format!("{base}?method=user.gettopartists&user={user}&api_key={key}&limit=5&period=1month&format=json");
    let tracks_url = format!("{base}?method=user.gettoptracks&user={user}&api_key={key}&limit=5&period=1month&format=json");

    let (recent, artists, tracks) = tokio::join!(
        cached_get(client, cache, "lastfm:recent", RECENT_TTL, &recent_url, &[]),
        cached_get(client, cache, "lastfm:artists", SLOW_TTL, &artists_url, &[]),
        cached_get(client, cache, "lastfm:tracks", SLOW_TTL, &tracks_url, &[]),
    );
    let (recent, artists, tracks) = (recent?, artists?, tracks?);

    let genres = top_genres(client, cache, &key, &artists).await;
    Ok((recent, artists, tracks, genres))
}

/// Genres are derived from the tags of the top three artists, which is what the
/// old frontend did. Tag lookups are best effort: a failure yields fewer genres
/// rather than failing the whole source.
async fn top_genres(
    client: &reqwest::Client,
    cache: &Cache,
    key: &str,
    artists: &Value,
) -> Vec<String> {
    let names: Vec<String> = artists["topartists"]["artist"]
        .as_array()
        .map(|a| a.iter().take(3)
            .filter_map(|x| x["name"].as_str().map(str::to_string))
            .collect())
        .unwrap_or_default();

    let mut counts: std::collections::HashMap<String, u64> = std::collections::HashMap::new();
    for name in names {
        let url = format!(
            "https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist={}&api_key={key}&format=json",
            urlencoding::encode(&name)
        );
        let cache_key = format!("lastfm:tags:{name}");
        let Ok(tags) = cached_get(client, cache, &cache_key, SLOW_TTL, &url, &[]).await else { continue };
        let Some(list) = tags["toptags"]["tag"].as_array() else { continue };
        for tag in list.iter().take(5) {
            if let Some(t) = tag["name"].as_str() {
                *counts.entry(t.to_lowercase()).or_insert(0) += 1;
            }
        }
    }

    let mut ranked: Vec<(String, u64)> = counts.into_iter().collect();
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    ranked.into_iter().take(6).map(|(t, _)| t).collect()
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
            &fixture("lastfm_top_tracks"),
            vec![],
        );
        assert_eq!(l.total_scrobbles, 48213);
    }

    #[test]
    fn normalize_drops_the_lastfm_placeholder_image() {
        let l = normalize(
            &fixture("lastfm_recent"),
            &fixture("lastfm_top_artists"),
            &fixture("lastfm_top_tracks"),
            vec![],
        );
        let past = l.recent.iter().find(|t| t.name == "Past Song").unwrap();
        assert_eq!(past.art, None, "the known placeholder hash must not become an <img> src");
    }

    #[test]
    fn normalize_parses_string_playcounts() {
        let l = normalize(
            &fixture("lastfm_recent"),
            &fixture("lastfm_top_artists"),
            &fixture("lastfm_top_tracks"),
            vec!["shoegaze".into()],
        );
        assert_eq!(l.top_artists[0], crate::model::TopArtist {
            name: "Artist One".into(), playcount: 412,
        });
        assert_eq!(l.top_tracks[0], crate::model::TopTrack {
            name: "Track One".into(), artist: "Artist One".into(), playcount: 51,
        });
        assert_eq!(l.genres, vec!["shoegaze".to_string()]);
    }

    #[test]
    fn normalize_survives_a_completely_empty_response() {
        let empty = serde_json::json!({});
        let l = normalize(&empty, &empty, &empty, vec![]);
        assert_eq!(l.total_scrobbles, 0);
        assert!(l.recent.is_empty());
        assert!(l.top_artists.is_empty());
        assert!(l.top_tracks.is_empty());
    }
}
