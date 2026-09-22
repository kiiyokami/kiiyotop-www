use crate::cache::Cache;
use crate::http::AppError;
use crate::model::{Maimai, Now, Snapshot};
use crate::sources::{discord, github, lastfm, leetify, osu, steam, vndb};
use axum::{extract::State, Json};
use serde_json::Value;

#[derive(Clone)]
pub struct AppState {
    pub client: reqwest::Client,
    pub cache:  Cache,
    /// Loaded once at startup. `None` if `api/maimai.toml` is missing or malformed.
    pub maimai: Option<Maimai>,
}

type Fetched<T> = Result<T, AppError>;

/// Pure assembly, so the degradation behaviour is testable with no network.
/// A failed source becomes `None` and serializes as `null`.
#[allow(clippy::type_complexity)]
#[allow(clippy::too_many_arguments)]
pub fn assemble(
    discord_raw: Fetched<Value>,
    lastfm_raw:  Fetched<(Value, Value, Value, Vec<String>)>,
    steam_raw:   Fetched<(Value, Value, Value, Value)>,
    leetify_raw: Fetched<Value>,
    osu_raw:     Fetched<(Value, Value)>,
    maimai:      Option<Maimai>,
    vndb_raw:    Fetched<(Value, Value, Value, Value)>,
    github_raw:  Fetched<(Value, Value)>,
) -> Snapshot {
    let lastfm_ok = lastfm_raw.ok();
    let steam_ok  = steam_raw.ok();

    let now = Now {
        discord:   discord_raw.ok().and_then(|v| discord::normalize(&v)),
        listening: lastfm_ok.as_ref().and_then(|(recent, ..)| lastfm::now_playing(recent)),
        playing:   steam_ok.as_ref().and_then(|(summary, ..)| steam::playing(summary)),
    };

    Snapshot {
        now,
        lastfm: lastfm_ok.map(|(recent, artists, tracks, genres)|
            lastfm::normalize(&recent, &artists, &tracks, genres)),
        steam: steam_ok.and_then(|(summary, level, friends, recent)|
            steam::normalize(&summary, &level, &friends, &recent)),
        cs2:    leetify_raw.ok().map(|v| leetify::normalize(&v)),
        osu:    osu_raw.ok().and_then(|(user, best)| osu::normalize(&user, &best)),
        maimai,
        vndb:   vndb_raw.ok().map(|(reading, all, finished, wishlist)|
            vndb::normalize(&reading, &all, &finished, &wishlist)),
        github: github_raw.ok().map(|(user, repos)| github::normalize(&user, &repos)),
    }
}

pub async fn handler(State(s): State<AppState>) -> Json<Snapshot> {
    let (discord_raw, lastfm_raw, steam_raw, leetify_raw, osu_raw, vndb_raw, github_raw) = tokio::join!(
        discord::fetch(&s.client, &s.cache),
        lastfm::fetch(&s.client, &s.cache),
        steam::fetch(&s.client, &s.cache),
        leetify::fetch(&s.client, &s.cache),
        osu::fetch(&s.client, &s.cache),
        vndb::fetch(&s.client, &s.cache),
        github::fetch(&s.client, &s.cache),
    );

    for (name, failure) in [
        ("discord", discord_raw.as_ref().err()),
        ("lastfm",  lastfm_raw.as_ref().err()),
        ("steam",   steam_raw.as_ref().err()),
        ("leetify", leetify_raw.as_ref().err()),
        ("osu",     osu_raw.as_ref().err()),
        ("vndb",    vndb_raw.as_ref().err()),
        ("github",  github_raw.as_ref().err()),
    ] {
        if let Some(e) = failure {
            tracing::warn!(source = name, error = %e, "source failed, serving null");
        }
    }

    Json(assemble(
        discord_raw, lastfm_raw, steam_raw, leetify_raw, osu_raw,
        s.maimai.clone(),
        vndb_raw, github_raw,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::AppError;
    use serde_json::json;

    fn err<T>() -> Result<T, AppError> {
        Err(AppError("upstream down".into()))
    }

    #[test]
    fn every_source_failing_still_produces_a_snapshot() {
        let snap = assemble(err(), err(), err(), err(), err(), None, err(), err());
        assert!(snap.maimai.is_none());
        assert!(snap.lastfm.is_none());
        assert!(snap.steam.is_none());
        assert!(snap.cs2.is_none());
        assert!(snap.osu.is_none());
        assert!(snap.vndb.is_none());
        assert!(snap.github.is_none());
        assert!(snap.now.discord.is_none());
        assert!(snap.now.listening.is_none());
        assert!(snap.now.playing.is_none());
    }

    #[test]
    fn one_source_failing_does_not_affect_the_others() {
        let lanyard = json!({ "success": true, "data": {
            "discord_user": { "username": "kiiyo", "global_name": null },
            "discord_status": "online", "activities": [], "spotify": null
        }});
        let snap = assemble(
            Ok(lanyard), err(), err(), err(), err(), None, err(), err(),
        );
        assert_eq!(snap.now.discord.unwrap().name, "kiiyo");
        assert!(snap.lastfm.is_none(), "the failed sources stay null");
    }

    #[test]
    fn the_live_track_lands_in_now_and_the_list_in_lastfm() {
        let recent = json!({ "recenttracks": {
            "track": [ {
                "name": "Live", "artist": { "#text": "A" }, "image": [], "@attr": { "nowplaying": "true" }
            } ],
            "@attr": { "user": "u", "total": "5" }
        }});
        let empty = json!({});
        let snap = assemble(
            err(),
            Ok((recent, empty.clone(), empty.clone(), vec![])),
            err(), err(), err(), None, err(), err(),
        );
        assert_eq!(snap.now.listening.unwrap().name, "Live");
        assert_eq!(snap.lastfm.unwrap().total_scrobbles, 5);
    }

    #[test]
    fn maimai_passes_through_untouched_and_never_reaches_the_stage() {
        let m = Maimai {
            rating: 2000, average: 133.3, dan: "八段".into(), class: "B5".into(),
            stars: 248, plays: 1079, url: "https://example.invalid/p".into(),
        };
        let snap = assemble(err(), err(), err(), err(), err(), Some(m), err(), err());
        assert_eq!(snap.maimai.unwrap().dan, "八段");
        // The stage carries live state only. maimai is a standing record.
        assert!(snap.now.discord.is_none());
        assert!(snap.now.listening.is_none());
        assert!(snap.now.playing.is_none());
    }
}
