use crate::cache::Cache;
use crate::http::{env, post_json, AppError};
use crate::model::{RatedVn, VnEntry, Vndb};
use serde_json::{json, Value};
use std::time::Duration;

const TTL: Duration = Duration::from_secs(900);
const ENDPOINT: &str = "https://api.vndb.org/kana/ulist";

// VNDB's built-in label ids.
const LABEL_READING: u64 = 1;
const LABEL_FINISHED: u64 = 2;
const LABEL_WISHLIST: u64 = 5;

/// Covers VNDB voters rate below 0.5 on both scales (its "Safe" and "Tame"
/// buckets). An unrated cover is withheld too: the page is shown at work.
fn safe_cover(image: &Value) -> Option<String> {
    let sexual = image["sexual"].as_f64()?;
    let violence = image["violence"].as_f64()?;
    if sexual < 0.5 && violence < 0.5 {
        image["url"].as_str().map(str::to_string)
    } else {
        None
    }
}

fn count_of(v: &Value) -> (u64, bool) {
    let n = v["results"].as_array().map(|a| a.len() as u64).unwrap_or(0);
    (n, v["more"].as_bool().unwrap_or(false))
}

pub fn normalize(reading: &Value, all: &Value, finished: &Value, wishlist: &Value) -> Vndb {
    let (finished_n, finished_more) = count_of(finished);
    let (wishlist_n, wishlist_more) = count_of(wishlist);

    let mut rated: Vec<RatedVn> = all["results"]
        .as_array()
        .map(|entries| entries.iter().filter_map(|e| {
            let vote = e["vote"].as_f64()?;
            Some(RatedVn {
                title: e["vn"]["title"].as_str().unwrap_or_default().to_string(),
                image: safe_cover(&e["vn"]["image"]),
                // VNDB stores votes out of 100, displayed out of 10.
                score: vote / 10.0,
            })
        }).collect())
        .unwrap_or_default();

    rated.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    rated.truncate(7);

    Vndb {
        reading: reading["results"].as_array().map(|entries| entries.iter().map(|e| VnEntry {
            title:     e["vn"]["title"].as_str().unwrap_or_default().to_string(),
            developer: e["vn"]["developers"][0]["name"].as_str().map(str::to_string),
            image:     safe_cover(&e["vn"]["image"]),
        }).collect()).unwrap_or_default(),
        rated,
        finished: finished_n,
        finished_more,
        wishlist: wishlist_n,
        wishlist_more,
    }
}

pub async fn fetch(
    client: &reqwest::Client,
    cache: &Cache,
) -> Result<(Value, Value, Value, Value), AppError> {
    let keys = ["vndb:reading", "vndb:all", "vndb:finished", "vndb:wishlist"];
    let mut hits = Vec::new();
    for k in keys {
        match cache.get(k, TTL).await {
            Some(v) => hits.push(v),
            None => { hits.clear(); break; }
        }
    }
    if hits.len() == 4 {
        let mut it = hits.into_iter();
        return Ok((it.next().unwrap(), it.next().unwrap(), it.next().unwrap(), it.next().unwrap()));
    }

    let user = env("VNDB_USER_ID")?;
    let body = |extra: Value| {
        let mut b = json!({ "user": user });
        if let (Some(o), Some(e)) = (b.as_object_mut(), extra.as_object()) {
            for (k, v) in e { o.insert(k.clone(), v.clone()); }
        }
        b
    };

    let reading_body = body(json!({
        "filters": ["label", "=", LABEL_READING],
        "fields": "vn{id,title,image{url,sexual,violence},developers{name}}",
        "results": 3
    }));
    let all_body = body(json!({
        "fields": "vn{id,title,image{url,sexual,violence}},vote", "results": 100
    }));
    let finished_body = body(json!({
        "filters": ["label", "=", LABEL_FINISHED], "results": 100
    }));
    let wishlist_body = body(json!({
        "filters": ["label", "=", LABEL_WISHLIST], "results": 100
    }));

    let (reading, all, finished, wishlist) = tokio::join!(
        post_json(client, ENDPOINT, &[], &reading_body),
        post_json(client, ENDPOINT, &[], &all_body),
        post_json(client, ENDPOINT, &[], &finished_body),
        post_json(client, ENDPOINT, &[], &wishlist_body),
    );
    let (reading, all, finished, wishlist) = (reading?, all?, finished?, wishlist?);

    cache.put("vndb:reading", reading.clone()).await;
    cache.put("vndb:all", all.clone()).await;
    cache.put("vndb:finished", finished.clone()).await;
    cache.put("vndb:wishlist", wishlist.clone()).await;
    Ok((reading, all, finished, wishlist))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::{json, Value};

    fn counted(n: usize, more: bool) -> Value {
        json!({ "results": vec![json!({}); n], "more": more })
    }

    #[test]
    fn normalize_reads_the_reading_list_with_developer_and_cover() {
        let v = normalize(
            &fixture("vndb_reading"), &fixture("vndb_all"),
            &counted(12, false), &counted(30, false),
        );
        assert_eq!(v.reading.len(), 1);
        assert_eq!(v.reading[0].title, "Subarashiki Hibi");
        assert_eq!(v.reading[0].developer.as_deref(), Some("KeroQ"));
        assert_eq!(v.reading[0].image.as_deref(), Some("https://example.test/cover.jpg"));
    }

    fn reading_with_image(image: Value) -> Value {
        json!({ "results": [ { "vn": { "title": "T", "image": image } } ] })
    }

    #[test]
    fn normalize_withholds_a_cover_flagged_sexual_or_violent() {
        // The page is shown at work: anything VNDB voters flag goes blank.
        for image in [
            json!({ "url": "https://example.test/x.jpg", "sexual": 1.2, "violence": 0 }),
            json!({ "url": "https://example.test/x.jpg", "sexual": 0, "violence": 1.0 }),
        ] {
            let v = normalize(&reading_with_image(image), &json!({}), &json!({}), &json!({}));
            assert_eq!(v.reading[0].image, None);
        }
    }

    #[test]
    fn normalize_withholds_a_cover_with_no_rating() {
        let image = json!({ "url": "https://example.test/x.jpg" });
        let v = normalize(&reading_with_image(image), &json!({}), &json!({}), &json!({}));
        assert_eq!(v.reading[0].image, None);
    }

    #[test]
    fn normalize_keeps_a_cover_rated_safe_by_most_voters() {
        let image = json!({ "url": "https://example.test/x.jpg", "sexual": 0.2, "violence": 0.1 });
        let v = normalize(&reading_with_image(image), &json!({}), &json!({}), &json!({}));
        assert_eq!(v.reading[0].image.as_deref(), Some("https://example.test/x.jpg"));
    }

    #[test]
    fn normalize_withholds_unsafe_covers_in_the_rated_list_too() {
        let all = json!({ "results": [ { "vote": 90, "vn": { "title": "R", "image": { "url": "https://example.test/r.jpg", "sexual": 2, "violence": 0 } } } ] });
        let v = normalize(&json!({}), &all, &json!({}), &json!({}));
        assert_eq!(v.rated[0].image, None);
    }

    #[test]
    fn normalize_keeps_only_voted_entries_sorted_high_to_low() {
        let v = normalize(
            &fixture("vndb_reading"), &fixture("vndb_all"),
            &counted(0, false), &counted(0, false),
        );
        assert_eq!(v.rated.len(), 2, "the unvoted entry is excluded");
        assert_eq!(v.rated[0].title, "Highest Rated");
        assert_eq!(v.rated[1].title, "Middle");
    }

    #[test]
    fn normalize_converts_votes_from_hundred_to_ten() {
        let v = normalize(
            &fixture("vndb_reading"), &fixture("vndb_all"),
            &counted(0, false), &counted(0, false),
        );
        assert!((v.rated[0].score - 9.5).abs() < 0.001, "95/100 displays as 9.5");
    }

    #[test]
    fn normalize_carries_the_more_flags_through() {
        let v = normalize(
            &fixture("vndb_reading"), &fixture("vndb_all"),
            &counted(100, true), &counted(4, false),
        );
        assert_eq!(v.finished, 100);
        assert!(v.finished_more, "100 results with more:true means the count is a floor");
        assert_eq!(v.wishlist, 4);
        assert!(!v.wishlist_more);
    }

    #[test]
    fn normalize_survives_empty_responses() {
        let empty = json!({});
        let v = normalize(&empty, &empty, &empty, &empty);
        assert!(v.reading.is_empty());
        assert!(v.rated.is_empty());
        assert_eq!(v.finished, 0);
    }
}
