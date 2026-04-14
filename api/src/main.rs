mod routes;

use axum::{Router, routing::get};
use tower_http::cors::{CorsLayer, Any};
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

    let state = routes::AppState { client };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Last.fm
        .route("/api/lastfm/recent",     get(routes::lastfm::recent))
        .route("/api/lastfm/topartists", get(routes::lastfm::top_artists))
        .route("/api/lastfm/toptracks",  get(routes::lastfm::top_tracks))
        .route("/api/lastfm/artisttags", get(routes::lastfm::artist_tags))
        // Steam
        .route("/api/steam/summary",     get(routes::steam::summary))
        .route("/api/steam/recent",      get(routes::steam::recent))
        .route("/api/steam/level",       get(routes::steam::level))
        .route("/api/steam/friends",     get(routes::steam::friends))
        // Discord / Lanyard
        .route("/api/discord",           get(routes::discord::lanyard))
        // Leetify
        .route("/api/leetify",           get(routes::leetify::profile))
        // osu!
        .route("/api/osu/user",          get(routes::osu::user))
        .route("/api/osu/best",          get(routes::osu::best))
        // Unified snapshot
        .route("/now",                   get(routes::now::snapshot))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let addr = format!("0.0.0.0:{port}");
    tracing::info!("kiiyo.top api listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
