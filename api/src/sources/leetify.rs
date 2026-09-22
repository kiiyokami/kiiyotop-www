use crate::cache::Cache;
use crate::http::{env, env_opt, AppError};
use crate::model::Cs2;
use crate::sources::cached_get;
use serde_json::Value;
use std::time::Duration;

const TTL: Duration = Duration::from_secs(600);

fn f64_or_zero(v: &Value) -> f64 {
    v.as_f64().unwrap_or(0.0)
}

pub fn normalize(p: &Value) -> Cs2 {
    Cs2 {
        rating:      p["ranks"]["leetify"].as_f64(),
        premier:     p["ranks"]["premier"].as_u64(),
        faceit:      p["ranks"]["faceit"].as_u64(),
        aim:         f64_or_zero(&p["rating"]["aim"]),
        utility:     f64_or_zero(&p["rating"]["utility"]),
        positioning: f64_or_zero(&p["rating"]["positioning"]),
        // Leetify returns these two as fractions while the others arrive pre-scaled.
        opening:     f64_or_zero(&p["rating"]["opening"]) * 100.0,
        clutch:      f64_or_zero(&p["rating"]["clutch"]) * 100.0,
        hs_percent:  f64_or_zero(&p["stats"]["accuracy_head"]),
        winrate:     f64_or_zero(&p["winrate"]) * 100.0,
        matches:     p["total_matches"].as_u64().unwrap_or(0),
    }
}

pub async fn fetch(client: &reqwest::Client, cache: &Cache) -> Result<Value, AppError> {
    let id = env("STEAM_ID")?;
    let url = format!("https://api-public.cs-prod.leetify.com/v3/profile?steam64_id={id}");

    let token = env_opt("LEETIFY_API_KEY");
    let bearer = token.as_ref().map(|t| format!("Bearer {t}"));
    let headers: Vec<(&str, &str)> = match bearer.as_deref() {
        Some(v) => vec![("Authorization", v)],
        None => vec![],
    };

    cached_get(client, cache, "leetify", TTL, &url, &headers).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::json;

    #[test]
    fn normalize_reads_the_headline_ranks() {
        let c = normalize(&fixture("leetify_profile"));
        assert_eq!(c.rating, Some(1.84));
        assert_eq!(c.premier, Some(18432));
        assert_eq!(c.faceit, Some(8));
        assert_eq!(c.matches, 812);
    }

    #[test]
    fn normalize_converts_fractions_to_percentages() {
        let c = normalize(&fixture("leetify_profile"));
        assert!((c.winrate - 54.23).abs() < 0.01, "winrate was {}", c.winrate);
        assert!((c.clutch - 4.12).abs() < 0.01, "clutch was {}", c.clutch);
        assert!((c.opening - 3.38).abs() < 0.01, "opening was {}", c.opening);
    }

    #[test]
    fn normalize_leaves_the_already_scaled_ratings_alone() {
        let c = normalize(&fixture("leetify_profile"));
        assert!((c.aim - 72.4).abs() < 0.01);
        assert!((c.utility - 55.8).abs() < 0.01);
        assert!((c.positioning - 61.2).abs() < 0.01);
        assert!((c.hs_percent - 43.71).abs() < 0.01);
    }

    #[test]
    fn normalize_keeps_null_ranks_as_none() {
        let mut p = fixture("leetify_profile");
        p["ranks"]["premier"] = json!(null);
        p["ranks"]["faceit"] = json!(null);
        p["ranks"]["leetify"] = json!(null);
        let c = normalize(&p);
        assert_eq!(c.premier, None);
        assert_eq!(c.faceit, None);
        assert_eq!(c.rating, None);
    }

    #[test]
    fn normalize_survives_an_empty_response() {
        let c = normalize(&json!({}));
        assert_eq!(c.rating, None);
        assert_eq!(c.matches, 0);
        assert_eq!(c.winrate, 0.0);
    }
}
