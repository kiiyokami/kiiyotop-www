# kiiyo.top

Personal homepage at [kiiyo.top](https://kiiyo.top).

## Stack

- **Frontend** — Vite + TypeScript + jQuery, served as static files via nginx
- **Backend** — Rust (axum) API server, proxies external APIs

## Project structure

```
.
├── src/              # Frontend TypeScript + CSS
├── index.html
├── vite.config.ts
└── api/              # Rust backend
    └── src/
        └── routes/   # lastfm, steam, discord, leetify, osu, now
```

## Environment variables

Create a `.env` file in the project root:

```env
LASTFM_API_KEY=
LASTFM_USER=

STEAM_API_KEY=
STEAM_ID=

LEETIFY_API_KEY=
PORT=3000

OSU_API_KEY=
OSU_USER=

DISCORD_USER_ID=
```

## Development

```bash
# Frontend dev server
npm run dev

# Backend (from api/)
cd api && cargo run
```

## API endpoints

| Method | Path | Source |
|--------|------|--------|
| GET | `/api/lastfm/recent` | Last.fm recent tracks |
| GET | `/api/lastfm/topartists` | Last.fm top artists (1 month) |
| GET | `/api/lastfm/toptracks` | Last.fm top tracks (1 month) |
| GET | `/api/lastfm/artisttags?artist=` | Last.fm artist tags |
| GET | `/api/steam/summary` | Steam player summary |
| GET | `/api/steam/recent` | Recently played games |
| GET | `/api/steam/level` | Steam level |
| GET | `/api/steam/friends` | Friends list |
| GET | `/api/discord` | Discord presence (Lanyard) |
| GET | `/api/leetify` | Leetify CS2 stats |
| GET | `/api/osu/user` | osu! user profile |
| GET | `/api/osu/best` | osu! top plays (with beatmap metadata) |
| GET | `/now` | Unified snapshot of all sources |

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
