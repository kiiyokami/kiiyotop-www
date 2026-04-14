use axum::{Json, extract::State};
use serde_json::{Value, json};
use super::{AppState, AppError, env, proxy};

pub async fn user(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key  = env("OSU_API_KEY")?;
    let user = env("OSU_USER")?;
    let url  = format!(
        "https://osu.ppy.sh/api/get_user?k={key}&u={}&m=0",
        urlencoding::encode(&user)
    );
    Ok(Json(proxy(&s.client, &url, &[]).await?))
}

pub async fn best(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let key  = env("OSU_API_KEY")?;
    let user = env("OSU_USER")?;

    let scores_url = format!(
        "https://osu.ppy.sh/api/get_user_best?k={key}&u={}&m=0&limit=5",
        urlencoding::encode(&user)
    );
    let scores = proxy(&s.client, &scores_url, &[]).await?;
    let scores = scores.as_array().cloned().unwrap_or_default();

    let enriched = {
        let mut handles = Vec::new();
        for score in &scores {
            let beatmap_id = score["beatmap_id"].as_str().unwrap_or("0").to_string();
            let url = format!("https://osu.ppy.sh/api/get_beatmaps?k={key}&b={beatmap_id}");
            let client = s.client.clone();
            handles.push(tokio::spawn(async move {
                client.get(&url).send().await
                    .ok()?
                    .json::<Value>().await.ok()?
                    .as_array()?
                    .first()
                    .cloned()
            }));
        }
        let mut results = Vec::new();
        for (score, handle) in scores.iter().zip(handles) {
            let map = handle.await.unwrap_or(None);
            let mut entry = score.clone();
            if let (Some(obj), Some(m)) = (entry.as_object_mut(), map) {
                obj.insert("title".into(),   m["title"].clone());
                obj.insert("artist".into(),  m["artist"].clone());
                obj.insert("version".into(), m["version"].clone());
            }
            results.push(entry);
        }
        results
    };

    Ok(Json(json!(enriched)))
}
