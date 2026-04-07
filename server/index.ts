import 'dotenv/config'
import express from 'express'

const app  = express()
const PORT = process.env.PORT ?? 3000

// ── Helpers ────────────────────────────────────────────────────────────────
function env(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing env var: ${key}`)
  return val
}

async function proxy(res: express.Response, url: string, headers: Record<string, string> = {}) {
  try {
    const r = await fetch(url, { headers })
    const data = await r.json()
    res.json(data)
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch failed' })
  }
}

// ── Last.fm ────────────────────────────────────────────────────────────────
app.get('/api/lastfm/recent', async (_req, res) => {
  const key  = env('LASTFM_API_KEY')
  const user = env('LASTFM_USER')
  await proxy(res,
    `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${key}&limit=6&format=json`
  )
})

app.get('/api/lastfm/topartists', async (_req, res) => {
  const key  = env('LASTFM_API_KEY')
  const user = env('LASTFM_USER')
  await proxy(res,
    `https://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user}&api_key=${key}&limit=5&period=1month&format=json`
  )
})

app.get('/api/lastfm/artisttags', async (req, res) => {
  const key    = env('LASTFM_API_KEY')
  const artist = req.query.artist as string
  if (!artist) { res.status(400).json({ error: 'missing artist' }); return }
  await proxy(res,
    `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${key}&format=json`
  )
})

// ── Steam ──────────────────────────────────────────────────────────────────
app.get('/api/steam/summary', async (_req, res) => {
  const key     = env('STEAM_API_KEY')
  const steamId = env('STEAM_ID')
  await proxy(res,
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamId}&format=json`
  )
})

app.get('/api/steam/recent', async (_req, res) => {
  const key     = env('STEAM_API_KEY')
  const steamId = env('STEAM_ID')
  await proxy(res,
    `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${key}&steamid=${steamId}&count=4&format=json`
  )
})

app.get('/api/steam/level', async (_req, res) => {
  const key     = env('STEAM_API_KEY')
  const steamId = env('STEAM_ID')
  await proxy(res,
    `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${key}&steamid=${steamId}&format=json`
  )
})

// ── Leetify ────────────────────────────────────────────────────────────────
app.get('/api/leetify', async (_req, res) => {
  const steamId = env('STEAM_ID')
  const apiKey  = process.env.LEETIFY_API_KEY ?? ''
  const headers: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : {}
  await proxy(res,
    `https://api-public.cs-prod.leetify.com/v3/profile?steam64_id=${steamId}`,
    headers
  )
})



// ── osu! ──────────────────────────────────────────────────────────────────
app.get('/api/osu/user', async (_req, res) => {
  const key  = env('OSU_API_KEY')
  const user = env('OSU_USER')
  await proxy(res,
    `https://osu.ppy.sh/api/get_user?k=${key}&u=${encodeURIComponent(user)}&m=0`
  )
})

app.get('/api/osu/best', async (_req, res) => {
  const key  = env('OSU_API_KEY')
  const user = env('OSU_USER')
  try {
    const scoresRes = await fetch(
      `https://osu.ppy.sh/api/get_user_best?k=${key}&u=${encodeURIComponent(user)}&m=0&limit=5`
    )
    const scores: { beatmap_id: string; pp: string; rank: string; maxcombo: string; enabled_mods: string }[] =
      await scoresRes.json()

    const beatmaps = await Promise.all(
      scores.map(s =>
        fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${key}&b=${s.beatmap_id}`)
          .then(r => r.json())
          .then((maps: { title: string; artist: string; version: string }[]) => Array.isArray(maps) ? maps[0] : null)
          .catch(() => null)
      )
    )

    const enriched = scores.map((s, i) => ({
      ...s,
      title:   beatmaps[i]?.title   ?? '?',
      artist:  beatmaps[i]?.artist  ?? '?',
      version: beatmaps[i]?.version ?? '?',
    }))
    res.json(enriched)
  } catch {
    res.status(502).json({ error: 'upstream fetch failed' })
  }
})

app.listen(PORT, () => {
  console.log(`kiiyo.top running on http://localhost:${PORT}`)
})
