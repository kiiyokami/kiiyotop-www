use serde::Serialize;

#[derive(Serialize, Debug, PartialEq, Default)]
pub struct Snapshot {
    pub now:    Now,
    pub lastfm: Option<Lastfm>,
    pub steam:  Option<Steam>,
    pub cs2:    Option<Cs2>,
    pub osu:    Option<Osu>,
    pub vndb:   Option<Vndb>,
    pub github: Option<Github>,
}

#[derive(Serialize, Debug, PartialEq, Default)]
pub struct Now {
    pub discord:   Option<Presence>,
    pub listening: Option<Track>,
    pub playing:   Option<PlayingGame>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Presence {
    pub name:     String,
    /// One of: online, idle, dnd, offline.
    pub status:   String,
    pub activity: Option<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Track {
    pub name:   String,
    pub artist: String,
    pub art:    Option<String>,
    pub live:   bool,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct PlayingGame {
    pub name:   String,
    pub app_id: Option<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Lastfm {
    pub total_scrobbles: u64,
    pub recent:          Vec<Track>,
    pub top_artists:     Vec<TopArtist>,
    pub top_tracks:      Vec<TopTrack>,
    pub genres:          Vec<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct TopArtist {
    pub name:      String,
    pub playcount: u64,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct TopTrack {
    pub name:      String,
    pub artist:    String,
    pub playcount: u64,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Steam {
    pub persona: String,
    pub avatar:  String,
    /// One of: offline, online, busy, away, snooze.
    pub state:   String,
    pub level:   u64,
    pub friends: u64,
    pub recent:  Vec<RecentGame>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct RecentGame {
    pub app_id:         u64,
    pub name:           String,
    pub minutes_2weeks: u64,
    pub minutes_total:  u64,
    pub thumb:          String,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Cs2 {
    pub rating:      Option<f64>,
    pub premier:     Option<u64>,
    pub faceit:      Option<u64>,
    pub aim:         f64,
    pub utility:     f64,
    pub positioning: f64,
    pub opening:     f64,
    pub clutch:      f64,
    pub hs_percent:  f64,
    pub winrate:     f64,
    pub matches:     u64,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Osu {
    pub username:     String,
    pub pp:           u64,
    pub rank:         u64,
    pub country_rank: u64,
    pub accuracy:     f64,
    pub level:        u64,
    pub playcount:    u64,
    pub ss:           u64,
    pub s:            u64,
    pub a:            u64,
    pub best:         Vec<OsuScore>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct OsuScore {
    pub title:   String,
    pub artist:  String,
    pub version: String,
    pub pp:      u64,
    /// One of: XH, X, SH, S, A, B, C, D.
    pub rank:    String,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Vndb {
    pub reading:       Vec<VnEntry>,
    pub rated:         Vec<RatedVn>,
    pub finished:      u64,
    pub finished_more: bool,
    pub wishlist:      u64,
    pub wishlist_more: bool,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct VnEntry {
    pub title:     String,
    pub developer: Option<String>,
    pub image:     Option<String>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct RatedVn {
    pub title: String,
    pub image: Option<String>,
    /// VNDB stores votes out of 100; this is the displayed value out of 10.
    pub score: f64,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Github {
    pub repos:     u64,
    pub followers: u64,
    pub languages: Vec<String>,
    pub recent:    Vec<Repo>,
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Repo {
    pub name:        String,
    pub description: Option<String>,
    pub language:    Option<String>,
    pub stars:       u64,
    pub url:         String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn an_empty_snapshot_serializes_every_source_as_null() {
        let snap = Snapshot::default();
        let value = serde_json::to_value(&snap).unwrap();
        assert_eq!(value, json!({
            "now": { "discord": null, "listening": null, "playing": null },
            "lastfm": null,
            "steam":  null,
            "cs2":    null,
            "osu":    null,
            "vndb":   null,
            "github": null
        }));
    }

    #[test]
    fn a_track_serializes_with_snake_case_keys() {
        let track = Track {
            name: "Song".into(),
            artist: "Artist".into(),
            art: None,
            live: true,
        };
        assert_eq!(serde_json::to_value(&track).unwrap(), json!({
            "name": "Song", "artist": "Artist", "art": null, "live": true
        }));
    }
}
