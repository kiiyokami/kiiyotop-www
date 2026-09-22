use crate::cache::Cache;
use crate::http::{env, get_json, AppError};
use crate::model::{Osu, OsuScore};
use serde_json::{json, Value};
use std::time::Duration;

const TTL: Duration = Duration::from_secs(600);

/// osu!'s v1 API returns every numeric field as a string.
fn num(v: &Value) -> f64 {
    v.as_str().and_then(|s| s.parse().ok()).unwrap_or(0.0)
}

fn text(v: &Value) -> String {
    v.as_str().unwrap_or_default().to_string()
}

pub fn normalize(user: &Value, best: &Value) -> Option<Osu> {
    let u = user.as_array()?.first()?;
    Some(Osu {
        username:     text(&u["username"]),
        pp:           num(&u["pp_raw"]).round() as u64,
        rank:         num(&u["pp_rank"]) as u64,
        country_rank: num(&u["pp_country_rank"]) as u64,
        accuracy:     num(&u["accuracy"]),
        level:        num(&u["level"]).floor() as u64,
        playcount:    num(&u["playcount"]) as u64,
        ss:           num(&u["count_rank_ss"]) as u64,
        s:            num(&u["count_rank_s"]) as u64,
        a:            num(&u["count_rank_a"]) as u64,
        best: best.as_array().map(|scores| scores.iter().take(5).map(|s| OsuScore {
            title:   text(&s["title"]),
            artist:  text(&s["artist"]),
            version: text(&s["version"]),
            pp:      num(&s["pp"]).round() as u64,
            rank:    text(&s["rank"]),
        }).collect()).unwrap_or_default(),
    })
}

pub async fn fetch(client: &reqwest::Client, cache: &Cache) -> Result<(Value, Value), AppError> {
    if let (Some(u), Some(b)) = (cache.get("osu:user", TTL).await, cache.get("osu:best", TTL).await) {
        return Ok((u, b));
    }

    let key  = env("OSU_API_KEY")?;
    let user = env("OSU_USER")?;
    let enc  = urlencoding::encode(&user).into_owned();

    let user_url = format!("https://osu.ppy.sh/api/get_user?k={key}&u={enc}&m=0");
    let user_json = get_json(client, &user_url, &[]).await?;
    let best_url = format!("https://osu.ppy.sh/api/get_user_best?k={key}&u={enc}&m=0&limit=5");
    let scores = get_json(client, &best_url, &[]).await?;
    let scores = scores.as_array().cloned().unwrap_or_default();

    // get_user_best carries no song title, so each score needs its beatmap.
    // Enrichment is per score and best effort: a failed lookup leaves the
    // score with empty metadata rather than dropping it.
    let mut handles = Vec::new();
    for score in &scores {
        let beatmap_id = score["beatmap_id"].as_str().unwrap_or("0").to_string();
        let url = format!("https://osu.ppy.sh/api/get_beatmaps?k={key}&b={beatmap_id}");
        let c = client.clone();
        handles.push(tokio::spawn(async move {
            c.get(&url).send().await.ok()?
                .json::<Value>().await.ok()?
                .as_array()?.first().cloned()
        }));
    }

    let mut enriched = Vec::new();
    for (score, handle) in scores.iter().zip(handles) {
        let map = handle.await.unwrap_or(None);
        let mut entry = score.clone();
        if let (Some(obj), Some(m)) = (entry.as_object_mut(), map) {
            obj.insert("title".into(),   m["title"].clone());
            obj.insert("artist".into(),  m["artist"].clone());
            obj.insert("version".into(), m["version"].clone());
        }
        enriched.push(entry);
    }
    let best_json = json!(enriched);

    cache.put("osu:user", user_json.clone()).await;
    cache.put("osu:best", best_json.clone()).await;
    Ok((user_json, best_json))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::json;

    #[test]
    fn normalize_parses_the_stringly_typed_numbers() {
        let o = normalize(&fixture("osu_user"), &fixture("osu_best")).unwrap();
        assert_eq!(o.username, "-Flux");
        assert_eq!(o.pp, 4821, "pp rounds to the nearest whole number");
        assert_eq!(o.rank, 84213);
        assert_eq!(o.country_rank, 1204);
        assert_eq!(o.playcount, 51204);
        assert_eq!(o.ss, 12);
        assert_eq!(o.s, 184);
        assert_eq!(o.a, 912);
        assert!((o.accuracy - 97.8412).abs() < 0.0001);
    }

    #[test]
    fn normalize_floors_the_level() {
        let o = normalize(&fixture("osu_user"), &fixture("osu_best")).unwrap();
        assert_eq!(o.level, 99, "99.6 floors to level 99, it would round to 100");
    }

    #[test]
    fn normalize_reads_the_enriched_beatmap_metadata() {
        let o = normalize(&fixture("osu_user"), &fixture("osu_best")).unwrap();
        assert_eq!(o.best.len(), 2);
        assert_eq!(o.best[0], crate::model::OsuScore {
            title: "Map Title".into(), artist: "Map Artist".into(),
            version: "Insane".into(), pp: 413, rank: "SH".into(),
        });
    }

    #[test]
    fn normalize_is_none_for_an_empty_user_array() {
        assert_eq!(normalize(&json!([]), &json!([])), None);
    }

    #[test]
    fn normalize_tolerates_scores_missing_beatmap_metadata() {
        let best = json!([ { "beatmap_id": "9", "pp": "10.5", "rank": "B" } ]);
        let o = normalize(&fixture("osu_user"), &best).unwrap();
        assert_eq!(o.best[0].title, "");
        assert_eq!(o.best[0].pp, 11);
    }
}
