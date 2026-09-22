use crate::cache::Cache;
use crate::http::{env, env_opt, AppError};
use crate::model::{Github, Repo};
use crate::sources::cached_get;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;

const TTL: Duration = Duration::from_secs(900);

pub fn normalize(user: &Value, repos: &Value) -> Github {
    let all = repos.as_array().cloned().unwrap_or_default();

    let mut counts: HashMap<String, u64> = HashMap::new();
    for r in &all {
        if let Some(lang) = r["language"].as_str() {
            *counts.entry(lang.to_string()).or_insert(0) += 1;
        }
    }
    let mut ranked: Vec<(String, u64)> = counts.into_iter().collect();
    // Name breaks ties so the row does not reshuffle between requests.
    ranked.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));

    Github {
        repos:     user["public_repos"].as_u64().unwrap_or(0),
        followers: user["followers"].as_u64().unwrap_or(0),
        languages: ranked.into_iter().take(6).map(|(l, _)| l).collect(),
        recent: all.iter()
            .filter(|r| !r["fork"].as_bool().unwrap_or(false))
            .take(8)
            .map(|r| Repo {
                name:        r["name"].as_str().unwrap_or_default().to_string(),
                description: r["description"].as_str().map(str::to_string),
                language:    r["language"].as_str().map(str::to_string),
                stars:       r["stargazers_count"].as_u64().unwrap_or(0),
                url:         r["html_url"].as_str().unwrap_or_default().to_string(),
            })
            .collect(),
    }
}

pub async fn fetch(client: &reqwest::Client, cache: &Cache) -> Result<(Value, Value), AppError> {
    let user = env("GITHUB_USER")?;
    let token = env_opt("GITHUB_TOKEN");
    let auth  = token.as_ref().map(|t| format!("Bearer {t}"));

    // GitHub rejects API requests with no User-Agent.
    let mut headers: Vec<(&str, &str)> = vec![("User-Agent", "kiiyotop-api")];
    if let Some(v) = auth.as_deref() {
        headers.push(("Authorization", v));
    }

    let user_url = format!("https://api.github.com/users/{user}");
    let repos_url = format!("https://api.github.com/users/{user}/repos?sort=pushed&per_page=10");

    let (profile, repos) = tokio::join!(
        cached_get(client, cache, "github:user", TTL, &user_url, &headers),
        cached_get(client, cache, "github:repos", TTL, &repos_url, &headers),
    );
    Ok((profile?, repos?))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sources::fixture;
    use serde_json::json;

    #[test]
    fn normalize_reads_the_profile_counts() {
        let g = normalize(&fixture("github_user"), &fixture("github_repos"));
        assert_eq!(g.repos, 23);
        assert_eq!(g.followers, 41);
    }

    #[test]
    fn normalize_excludes_forks_from_the_repo_list() {
        let g = normalize(&fixture("github_user"), &fixture("github_repos"));
        assert_eq!(g.recent.len(), 2);
        assert!(!g.recent.iter().any(|r| r.name == "some-fork"));
    }

    #[test]
    fn normalize_keeps_a_null_description_as_none() {
        let g = normalize(&fixture("github_user"), &fixture("github_repos"));
        let dotfiles = g.recent.iter().find(|r| r.name == "dotfiles").unwrap();
        assert_eq!(dotfiles.description, None);
        assert_eq!(dotfiles.stars, 0);
    }

    #[test]
    fn normalize_ranks_languages_by_repo_count_including_forks() {
        let g = normalize(&fixture("github_user"), &fixture("github_repos"));
        assert_eq!(g.languages, vec!["Rust".to_string(), "Shell".to_string()],
            "Rust appears in two repos, Shell in one");
    }

    #[test]
    fn normalize_survives_an_empty_repo_list() {
        let g = normalize(&fixture("github_user"), &json!([]));
        assert!(g.recent.is_empty());
        assert!(g.languages.is_empty());
        assert_eq!(g.repos, 23);
    }
}
