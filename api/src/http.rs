use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::Value;

#[derive(Debug)]
pub struct AppError(pub String);

fn redact_url(url: &str) -> String {
    match reqwest::Url::parse(url) {
        Ok(parsed) => {
            let scheme = parsed.scheme();
            let host = parsed.host_str().unwrap_or("unknown");
            let path = parsed.path();
            format!("{scheme}://{host}{path}")
        }
        Err(_) => "<unparseable url>".to_string(),
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = Json(serde_json::json!({ "error": self.0 }));
        (StatusCode::BAD_GATEWAY, body).into_response()
    }
}

pub fn env(key: &str) -> Result<String, AppError> {
    std::env::var(key).map_err(|_| AppError(format!("missing env var: {key}")))
}

/// An empty value counts as absent, because `KEY=` in a .env file sets it to "".
pub fn env_opt(key: &str) -> Option<String> {
    match std::env::var(key) {
        Ok(v) if !v.is_empty() => Some(v),
        _ => None,
    }
}

pub async fn get_json(
    client: &reqwest::Client,
    url: &str,
    headers: &[(&str, &str)],
) -> Result<Value, AppError> {
    let mut req = client.get(url);
    for (k, v) in headers {
        req = req.header(*k, *v);
    }
    let resp = req.send().await.map_err(|e| AppError(e.without_url().to_string()))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(AppError(format!("{status} from {}", redact_url(url))));
    }
    // reqwest does not currently attach a URL to decode errors (they are built by
    // error::decode() with url: None), so without_url() here is a guard against a
    // future reqwest change rather than a fix for anything it does today.
    resp.json::<Value>().await.map_err(|e| AppError(e.without_url().to_string()))
}

pub async fn post_json(
    client: &reqwest::Client,
    url: &str,
    body: &Value,
) -> Result<Value, AppError> {
    let resp = client
        .post(url)
        .json(body)
        .send()
        .await
        .map_err(|e| AppError(e.without_url().to_string()))?;
    let status = resp.status();
    if !status.is_success() {
        return Err(AppError(format!("{status} from {}", redact_url(url))));
    }
    // See the comment on the equivalent line in get_json: no URL is attached to
    // decode errors today, so this is defensive rather than corrective.
    resp.json::<Value>().await.map_err(|e| AppError(e.without_url().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::{Mock, MockServer, ResponseTemplate};
    use wiremock::matchers::{method, path};

    #[test]
    fn env_reports_the_missing_key_by_name() {
        std::env::remove_var("A_KEY_THAT_IS_NOT_SET");
        let err = env("A_KEY_THAT_IS_NOT_SET").unwrap_err();
        assert!(err.0.contains("A_KEY_THAT_IS_NOT_SET"), "got: {}", err.0);
    }

    #[test]
    fn env_returns_the_value_when_set() {
        std::env::set_var("A_KEY_THAT_IS_SET", "value");
        assert_eq!(env("A_KEY_THAT_IS_SET").unwrap(), "value");
    }

    #[test]
    fn env_opt_is_none_when_unset_or_empty() {
        std::env::remove_var("OPTIONAL_UNSET");
        assert_eq!(env_opt("OPTIONAL_UNSET"), None);
        std::env::set_var("OPTIONAL_EMPTY", "");
        assert_eq!(env_opt("OPTIONAL_EMPTY"), None);
    }

    #[test]
    fn env_opt_is_some_when_set() {
        std::env::set_var("OPTIONAL_SET", "t0ken");
        assert_eq!(env_opt("OPTIONAL_SET"), Some("t0ken".to_string()));
    }

    #[tokio::test]
    async fn get_json_succeeds_with_2xx_status() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/test"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({"key": "value"})))
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = format!("{}/test", mock_server.uri());
        let result = get_json(&client, &url, &[]).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["key"], "value");
    }

    #[tokio::test]
    async fn get_json_fails_with_non_2xx_status() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/test"))
            .respond_with(ResponseTemplate::new(403).set_body_json(serde_json::json!({"error": "forbidden"})))
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = format!("{}/test", mock_server.uri());
        let result = get_json(&client, &url, &[]).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.0.contains("403"), "error should contain status code: {}", err.0);
        assert!(err.0.contains("/test"), "error should contain path: {}", err.0);
    }

    #[tokio::test]
    async fn post_json_succeeds_with_2xx_status() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/test"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({"result": "ok"})))
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = format!("{}/test", mock_server.uri());
        let body = serde_json::json!({"input": "data"});
        let result = post_json(&client, &url, &body).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap()["result"], "ok");
    }

    #[tokio::test]
    async fn post_json_fails_with_non_2xx_status() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/test"))
            .respond_with(ResponseTemplate::new(500).set_body_json(serde_json::json!({"error": "server error"})))
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = format!("{}/test", mock_server.uri());
        let body = serde_json::json!({"input": "data"});
        let result = post_json(&client, &url, &body).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.0.contains("500"), "error should contain status code: {}", err.0);
        assert!(err.0.contains("/test"), "error should contain path: {}", err.0);
    }

    #[tokio::test]
    async fn get_json_redacts_api_key_from_query_string() {
        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/2.0/"))
            .respond_with(ResponseTemplate::new(403).set_body_json(serde_json::json!({"error": "forbidden"})))
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = format!("{}/2.0/?method=test&api_key=SHOULD_NOT_APPEAR&extra=data", mock_server.uri());
        let result = get_json(&client, &url, &[]).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.0.contains("403"), "error should contain status code: {}", err.0);
        assert!(err.0.contains("2.0/"), "error should contain path: {}", err.0);
        assert!(!err.0.contains("SHOULD_NOT_APPEAR"), "error should NOT contain api key: {}", err.0);
        assert!(!err.0.contains("api_key"), "error should NOT contain query parameter names: {}", err.0);
    }

    #[tokio::test]
    async fn post_json_redacts_api_key_from_query_string() {
        let mock_server = MockServer::start().await;

        Mock::given(method("POST"))
            .and(path("/api/endpoint"))
            .respond_with(ResponseTemplate::new(429).set_body_json(serde_json::json!({"error": "rate limited"})))
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = format!("{}/api/endpoint?key=SHOULD_NOT_APPEAR&user=123", mock_server.uri());
        let body = serde_json::json!({"data": "test"});
        let result = post_json(&client, &url, &body).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.0.contains("429"), "error should contain status code: {}", err.0);
        assert!(err.0.contains("api/endpoint"), "error should contain path: {}", err.0);
        assert!(!err.0.contains("SHOULD_NOT_APPEAR"), "error should NOT contain api key: {}", err.0);
        assert!(!err.0.contains("key="), "error should NOT contain query parameters: {}", err.0);
    }

    // Nothing listens on 127.0.0.1:1, so send() fails before any response is
    // received. This is the path that provably leaks the URL (including query
    // string) via reqwest::Error's Display unless without_url() is applied: a
    // decode-error test cannot exercise this, since reqwest never attaches a URL
    // to decode errors in the first place (see the comments in the code above).
    #[tokio::test]
    async fn get_json_redacts_api_key_from_transport_error() {
        let client = reqwest::Client::new();
        let url = "http://127.0.0.1:1/2.0/?method=test&api_key=SHOULD_NOT_APPEAR&extra=data";
        let result = get_json(&client, url, &[]).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(!err.0.contains("SHOULD_NOT_APPEAR"), "error should NOT contain api key: {}", err.0);
        assert!(!err.0.contains("api_key"), "error should NOT contain query parameter names: {}", err.0);
        assert!(!err.0.contains("127.0.0.1:1"), "error should NOT contain the url: {}", err.0);
    }

    #[tokio::test]
    async fn post_json_redacts_api_key_from_transport_error() {
        let client = reqwest::Client::new();
        let url = "http://127.0.0.1:1/api/endpoint?key=SHOULD_NOT_APPEAR&user=123";
        let body = serde_json::json!({"data": "test"});
        let result = post_json(&client, url, &body).await;

        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(!err.0.contains("SHOULD_NOT_APPEAR"), "error should NOT contain api key: {}", err.0);
        assert!(!err.0.contains("key="), "error should NOT contain query parameters: {}", err.0);
        assert!(!err.0.contains("127.0.0.1:1"), "error should NOT contain the url: {}", err.0);
    }
}
