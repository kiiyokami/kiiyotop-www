use crate::cache::Cache;
use crate::http::{env, env_opt, AppError};
use crate::model::{Github, Repo};
use crate::sources::cached_post;
use serde_json::{json, Value};
use std::time::Duration;

const TTL: Duration = Duration::from_secs(900);
const ENDPOINT: &str = "https://api.github.com/graphql";
const QUERY: &str = "query($login: String!) { user(login: $login) { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name description url stargazerCount primaryLanguage { name } } } } } }";

/// GraphQL reports failure inside a 200 body, so a missing user is an error
/// here rather than an empty list: "nothing pinned" and "query failed" must
/// not look the same on the page.
pub fn normalize(body: &Value) -> Result<Github, AppError> {
    let user = &body["data"]["user"];
    if !user.is_object() {
        let reason = body["errors"][0]["message"]
            .as_str()
            .or_else(|| body["message"].as_str())
            .unwrap_or("no user in response");
        return Err(AppError(format!("github graphql: {reason}")));
    }

    let nodes = user["pinnedItems"]["nodes"].as_array().cloned().unwrap_or_default();
    Ok(Github {
        pinned: nodes.iter()
            .filter(|n| n["name"].is_string())
            .map(|n| Repo {
                name:        n["name"].as_str().unwrap_or_default().to_string(),
                description: n["description"].as_str().map(str::to_string),
                language:    n["primaryLanguage"]["name"].as_str().map(str::to_string),
                stars:       n["stargazerCount"].as_u64().unwrap_or(0),
                url:         n["url"].as_str().unwrap_or_default().to_string(),
            })
            .collect(),
    })
}

pub async fn fetch(client: &reqwest::Client, cache: &Cache) -> Result<Value, AppError> {
    let login = env("GITHUB_USER")?;
    // GitHub's GraphQL API rejects unauthenticated requests outright.
    let token = env_opt("GITHUB_TOKEN")
        .ok_or_else(|| AppError("missing env var: GITHUB_TOKEN (GitHub GraphQL needs a token)".into()))?;
    let auth = format!("Bearer {token}");

    // GitHub rejects API requests with no User-Agent.
    let headers = [("User-Agent", "kiiyotop-api"), ("Authorization", auth.as_str())];
    let body = json!({ "query": QUERY, "variables": { "login": login } });

    cached_post(client, cache, "github:pinned", TTL, ENDPOINT, &headers, &body, |v| normalize(v).map(|_| ())).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::json;

    #[test]
    fn normalize_reads_pinned_repos_in_order() {
        let g = normalize(&fixture("github_pinned")).unwrap();
        let names: Vec<&str> = g.pinned.iter().map(|r| r.name.as_str()).collect();
        assert_eq!(names, vec!["kiiyotop-www", "dotfiles"]);
        assert_eq!(g.pinned[0].language.as_deref(), Some("Svelte"));
        assert_eq!(g.pinned[0].stars, 3);
        assert_eq!(g.pinned[0].url, "https://github.com/kiiyokami/kiiyotop-www");
    }

    #[test]
    fn normalize_keeps_null_description_and_language_as_none() {
        let g = normalize(&fixture("github_pinned")).unwrap();
        let dotfiles = &g.pinned[1];
        assert_eq!(dotfiles.description, None);
        assert_eq!(dotfiles.language, None);
        assert_eq!(dotfiles.stars, 0);
    }

    #[test]
    fn normalize_accepts_a_user_with_nothing_pinned() {
        let body = json!({ "data": { "user": { "pinnedItems": { "nodes": [] } } } });
        assert!(normalize(&body).unwrap().pinned.is_empty());
    }

    #[test]
    fn a_graphql_error_with_no_user_is_an_error_not_an_empty_list() {
        // GraphQL answers 200 even when the query fails.
        let body = json!({ "data": { "user": null }, "errors": [ { "message": "Could not resolve to a User" } ] });
        let err = normalize(&body).unwrap_err();
        assert!(err.0.contains("Could not resolve"), "got: {}", err.0);
    }

    #[test]
    fn a_body_with_no_data_is_an_error() {
        assert!(normalize(&json!({ "message": "Bad credentials" })).is_err());
    }

    #[tokio::test]
    async fn fetch_refuses_to_run_without_a_token() {
        std::env::set_var("GITHUB_USER", "kiiyokami");
        std::env::remove_var("GITHUB_TOKEN");
        let err = fetch(&reqwest::Client::new(), &Cache::new()).await.unwrap_err();
        assert!(err.0.contains("GITHUB_TOKEN"), "got: {}", err.0);
    }
}
