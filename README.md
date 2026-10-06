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
│           ├── stage.ts    # decides what now.txt shows
│           ├── profiles.ts # every outbound profile link
│           ├── os/         # kiiyoOS: window state, terminal, theme, desktop chrome
│           ├── windows/    # one component per window
│           └── ui/         # Skeleton
├── vite.config.ts          # root: web, outDir: ../dist
└── api/                    # Rust backend
    └── src/
        ├── main.rs
        ├── cache.rs
        ├── http.rs
        ├── model.rs
        ├── snapshot.rs      # assembles the /api/snapshot response
        └── sources/         # lastfm, steam, discord, leetify, osu, vndb, github
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

PORT=3000
```

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
