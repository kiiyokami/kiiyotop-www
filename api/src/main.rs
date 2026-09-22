mod cache;
mod http;
mod model;
mod snapshot;
mod sources;

use axum::{routing::get, Router};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .expect("failed to build reqwest client");

    // maimai is static: read once here, never polled. A missing or malformed file
    // logs a warning inside `load` and serves null, which is the same degradation
    // path as a failed upstream.
    let maimai = sources::maimai::load(std::path::Path::new("maimai.toml"));
    if maimai.is_none() {
        tracing::warn!("no maimai record loaded; section 2.4.2 will render its empty state");
    }

    let state = snapshot::AppState { client, cache: cache::Cache::new(), maimai };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/snapshot", get(snapshot::handler))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let addr = format!("0.0.0.0:{port}");
    tracing::info!("kiiyo.top api listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
