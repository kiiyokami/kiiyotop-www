# kiiyo.top

Personal homepage at [kiiyo.top](https://kiiyo.top).

## Stack

- **Frontend**: Vite + TypeScript + Svelte, served as static files via nginx
- **Backend**: Rust (axum) API server, fetches and normalizes external APIs

## Project structure

```
.
├── web/                    # Frontend
│   ├── index.html
│   ├── public/             # favicon, static assets
│   └── src/
│       ├── main.ts
│       ├── App.svelte
│       ├── styles/         # tokens.css, base.css
│       └── lib/
│           ├── types.ts    # snapshot types, mirrored from api/src/model.rs
│           ├── snapshot.ts # fetches and parses /api/snapshot
│           ├── stage.ts    # derives stage content from the snapshot
│           ├── Stage.svelte
│           ├── ui/         # Cell, Rows, Skeleton, StatusDot, Value, ThemeToggle
│           └── index/      # Lastfm, Steam, Cs2, Rhythm, Vndb, Github cells
├── vite.config.ts          # root: web, outDir: ../dist
└── api/                    # Rust backend
    ├── maimai.toml         # checked-in, frozen maimai record (no public API)
    └── src/
        ├── main.rs
        ├── cache.rs
        ├── http.rs
        ├── model.rs
        ├── snapshot.rs      # assembles the /api/snapshot response
        └── sources/         # lastfm, steam, discord, leetify, osu, vndb, github, maimai
```

## Environment variables

Create a `.env` file in the project root:

```env
LASTFM_API_KEY=
LASTFM_USER=

STEAM_API_KEY=
STEAM_ID=

LEETIFY_API_KEY=

OSU_API_KEY=
OSU_USER=

DISCORD_USER_ID=

VNDB_USER_ID=

# Optional. Without it the server falls back to 60 unauthenticated requests
# per hour, shared across all visitors and buffered by a 15 minute cache.
GITHUB_USER=
GITHUB_TOKEN=

PORT=3000
```

maimai has no variable: it has no public API, so its record lives in `api/maimai.toml`,
checked in and read once at startup.

## Development

```bash
# Frontend dev server (proxies /api to localhost:3000)
npm run dev

# Backend
cd api && cargo run
```

## API endpoints

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/snapshot` | The whole page's data, normalized and cached. A source that fails serializes as `null`. |

The twelve per-source routes and `/now` were removed: the frontend was their only
consumer. Every source is fetched server-side, so no API key reaches the browser and
no rate limit is charged per visitor.

maimai is not fetched. The tracker has no public API, so the standing record lives in
`api/maimai.toml` and is read once at startup.

## Deployment

```bash
# On the server
cd /var/www/kiiyotop-www
git pull

# Rebuild frontend
npm run build

# Rebuild backend
cd api && cargo build --release

# Restart service
sudo systemctl restart kiiyotop-api
```
