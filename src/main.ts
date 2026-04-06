import './style.css'
import $ from 'jquery'


// ── Theme toggle ──────────────────────────────────────────────────────────
const THEME_KEY = 'kiiyo-theme'

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null
  const theme = saved ?? 'dark'
  $('html').attr('data-theme', theme)
}

$(() => {
  initTheme()

  $('#themeToggle').on('click', () => {
    const current = $('html').attr('data-theme') === 'dark' ? 'dark' : 'light'
    const next = current === 'dark' ? 'light' : 'dark'
    $('html').attr('data-theme', next)
    localStorage.setItem(THEME_KEY, next)
  })

  loadAll()
})

function loadAll() {
  fetchLastfm()
  fetchSteam()
  fetchLeetify()
  fetchVndb()
}

// ── Helpers ───────────────────────────────────────────────────────────────
function clearSkeleton(el: JQuery) {
  el.removeClass('skeleton-line skeleton-art wide')
}

function setPill(id: string, text: string, cls?: string) {
  const $p = $(`#${id}`)
  $p.text(text).removeClass('pill--online pill--playing pill--live pill--error')
  if (cls) $p.addClass(cls)
}

function statBadge(label: string, value: string | number): string {
  return `<span class="stat-badge"><strong>${value}</strong> ${label}</span>`
}

function statCell(label: string, value: string | number): string {
  return `
    <div class="stat-cell">
      <span class="stat-value">${value}</span>
      <span class="stat-label">${label}</span>
    </div>`
}

// ── Last.fm ───────────────────────────────────────────────────────────────
interface LastfmTrack {
  name: string
  artist: { '#text': string }
  album:  { '#text': string }
  image:  { '#text': string; size: string }[]
  '@attr'?: { nowplaying: string }
  url: string
}

interface LastfmRecentRes {
  recenttracks: {
    track: LastfmTrack[]
    '@attr': { user: string; total: string }
  }
}

interface LastfmTopArtistsRes {
  topartists: {
    artist: { name: string; playcount: string }[]
  }
}

async function fetchLastfm() {
  try {
    const [recentRes, artistsRes] = await Promise.all([
      fetch('/api/lastfm/recent'),
      fetch('/api/lastfm/topartists'),
    ])
    if (!recentRes.ok) throw new Error(`${recentRes.status}`)
    const data: LastfmRecentRes            = await recentRes.json()
    const artistsData: LastfmTopArtistsRes = await artistsRes.json()

    // Fetch tags for top 3 artists to derive genres
    const topArtists = artistsData.topartists.artist.slice(0, 3)
    const tagResults = await Promise.all(
      topArtists.map(a =>
        fetch(`/api/lastfm/artisttags?artist=${encodeURIComponent(a.name)}`)
          .then(r => r.json() as Promise<{ toptags: { tag: { name: string; count: number }[] } }>)
      )
    )
    const tagMap = new Map<string, number>()
    tagResults.forEach(res => {
      res.toptags?.tag?.forEach(t => {
        const key = t.name.toLowerCase()
        tagMap.set(key, (tagMap.get(key) ?? 0) + t.count)
      })
    })
    const genres = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name)

    renderLastfm(data, artistsData, genres)
  } catch (e) {
    renderLastfmError('could not reach last.fm')
  }
}

function renderLastfm(data: LastfmRecentRes, artistsData: LastfmTopArtistsRes, genres: string[]) {
  const tracks = data.recenttracks.track
  const total  = Number(data.recenttracks['@attr'].total).toLocaleString()
  const first  = tracks[0]
  const isLive = !!first['@attr']?.nowplaying

  // Now playing / last played
  const art = first.image.find(i => i.size === 'medium')?.['#text'] || ''
  const $art = $('#lastfm-art')

  if (art && !art.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
    $art.replaceWith(`<img class="album-art" src="${art}" alt="album art">`)
  } else {
    $art.removeClass('skeleton-art').css({ background: 'var(--skeleton)', animation: 'none' })
  }

  clearSkeleton($('#lastfm-track'))
  clearSkeleton($('#lastfm-artist'))

  $('#lastfm-label').text(isLive ? '♪ now playing' : 'last played').toggleClass('live', isLive)
  $('#lastfm-track').text(first.name)
  $('#lastfm-artist').text(first.artist['#text'])
  setPill('lastfm-pill', isLive ? 'live' : 'scrobbling', isLive ? 'pill--live' : undefined)

  // Recent tracks (skip first if live)
  const recents = isLive ? tracks.slice(1, 5) : tracks.slice(1, 5)
  const $list = $('#lastfm-recents').empty()
  recents.forEach((t, i) => {
    $list.append(`
      <div class="track-item">
        <span class="track-item-num">${i + 1}</span>
        <span class="track-item-name">${t.name}</span>
        <span class="track-item-sep">—</span>
        <span>${t.artist['#text']}</span>
      </div>`)
  })

  $('#lastfm-stats').html(
    statBadge('total scrobbles', total) +
    statBadge('user', data.recenttracks['@attr'].user)
  )

  // Top genres
  if (genres.length) {
    $('#lastfm-genres').html(
      genres.map(g => `<span class="genre-tag">${g}</span>`).join('')
    )
  }

  // Top artists this month
  const artists = artistsData.topartists.artist.slice(0, 5)
  const $artists = $('#lastfm-artists').empty()
  artists.forEach((a, i) => {
    $artists.append(`
      <div class="track-item">
        <span class="track-item-num">${i + 1}</span>
        <span class="track-item-name">${a.name}</span>
        <span class="track-item-sep">—</span>
        <span>${Number(a.playcount).toLocaleString()} plays</span>
      </div>`)
  })
}

function renderLastfmError(msg: string) {
  clearSkeleton($('#lastfm-track'))
  clearSkeleton($('#lastfm-artist'))
  clearSkeleton($('#lastfm-art'))
  $('#lastfm-track').text('—')
  $('#lastfm-artist').text('—')
  $('#lastfm-label').text(msg)
  setPill('lastfm-pill', 'error', 'pill--error')
}

// ── Steam ─────────────────────────────────────────────────────────────────
// Steam API has no CORS headers — proxy required in production.
// For local dev with Vite, we use the proxy configured in vite.config.ts.
interface SteamPlayer {
  personaname: string
  personastate: number       // 0=offline 1=online 2=busy 3=away 4=snooze
  gameextrainfo?: string
  gameid?: string
}

interface SteamRecentGame {
  name: string
  playtime_2weeks: number
  playtime_forever: number
}

const STEAM_STATE: Record<number, string> = {
  0: 'offline', 1: 'online', 2: 'busy', 3: 'away', 4: 'snooze',
}

async function fetchSteam() {
  try {
    const [summaryRes, recentRes] = await Promise.all([
      fetch('/api/steam/summary'),
      fetch('/api/steam/recent'),
    ])

    const summary = await summaryRes.json()
    const recent  = await recentRes.json()

    const player: SteamPlayer = summary.response.players[0]
    const games: SteamRecentGame[] = recent.response?.games ?? []
    renderSteam(player, games)
  } catch {
    renderSteamError('could not reach Steam API')
  }
}

function renderSteam(player: SteamPlayer, games: SteamRecentGame[]) {
  const state = STEAM_STATE[player.personastate] ?? 'offline'
  const isPlaying = !!player.gameextrainfo
  const dotClass = isPlaying ? 'playing' : state === 'online' ? 'online' : state === 'away' ? 'away' : ''

  $('#steam-dot').attr('class', `status-dot ${dotClass}`)
  $('#steam-state').text(player.personaname + ' · ' + (isPlaying ? `in-game` : state))
  setPill('steam-pill', isPlaying ? 'in-game' : state, isPlaying ? 'pill--playing' : state === 'online' ? 'pill--online' : undefined)

  if (isPlaying) {
    $('#steam-game').text(`playing ${player.gameextrainfo}`)
  }

  const $recent = $('#steam-recent').empty()
  games.forEach(g => {
    const hrs = (g.playtime_2weeks / 60).toFixed(2)
    $recent.append(`
      <div class="game-item">
        <span class="game-item-name">${g.name}</span>
        <span class="game-item-hrs">${hrs}h this week</span>
      </div>`)
  })
}

function renderSteamError(msg: string) {
  $('#steam-state').text(msg)
  setPill('steam-pill', 'error', 'pill--error')
}

// ── Leetify ───────────────────────────────────────────────────────────────
interface LeetifyProfile {
  name: string
  winrate: number
  total_matches: number
  ranks: {
    leetify:    number | null
    premier:    number | null
    faceit: number | null
  }
  rating: {
    aim: number
    positioning: number
    utility: number
    clutch: number
    opening: number
    ct_leetify: number
    t_leetify: number
  }
  stats: {
    accuracy_head: number
    accuracy_enemy_spotted: number
    reaction_time_ms: number
  }
  recent_matches: {
    outcome: string
    leetify_rating: number
    accuracy_head: number
  }[]
}

async function fetchLeetify() {
  try {
    const res = await fetch('/api/leetify')
    if (!res.ok) {
      renderLeetifyError(`${res.status} from Leetify`)
      return
    }
    const data: LeetifyProfile = await res.json()
    renderLeetify(data)
  } catch (e) {
    renderLeetifyError('could not reach Leetify')
  }
}

function renderLeetify(data: LeetifyProfile) {
  const r      = data.rating
  const winPct = (data.winrate * 100).toFixed(0) + '%'
  const hs     = data.stats.accuracy_head.toFixed(1) + '%'

  const mainRating = (data.ranks.leetify ?? r.aim).toFixed(2)

  $('#cs2-rating').text(mainRating)

  // Rank badges row
  const premier   = data.ranks.premier != null ? data.ranks.premier.toLocaleString() : '—'
  const faceitLvl = data.ranks.faceit  != null ? `lvl ${data.ranks.faceit}`          : '—'

  $('#cs2-ranks').html(
    statCell('premier', premier) +
    statCell('faceit',  faceitLvl)
  )

  $('#cs2-stats').html(
    statCell('aim',      r.aim.toFixed(2)) +
    statCell('utility',  r.utility.toFixed(2)) +
    statCell('position', r.positioning.toFixed(2)) +
    statCell('opening',  r.opening.toFixed(2)) +
    statCell('hs%',      hs) +
    statCell('win rate', winPct) +
    statCell('matches',  data.total_matches)
  )
}

function renderLeetifyError(msg: string) {
  $('#cs2-rating').text('—')
  $('#cs2-stats').html(`<p class="error-msg">${msg}</p>`)
}

// ── VNDB ──────────────────────────────────────────────────────────────────
interface VndbListEntry {
  id: string
  vn: {
    id: string
    title: string
    image?: { url: string }
    developers?: { name: string }[]
  }
  labels: { label: string }[]
}

interface VndbListRes {
  results: VndbListEntry[]
  more: boolean
}

async function fetchVndb() {
  const VNDB_USER = 'u225866'

  try {
    const post = (body: object) => fetch('https://api.vndb.org/kana/ulist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: VNDB_USER, ...body }),
    })

    const readingRes = await post({
      filters: ['label', '=', 1],
      fields: 'vn{id,title,image{url},developers{name}}',
      results: 3,
    })

    const [finishedRes, wishlistRes] = await Promise.all([
      post({ filters: ['label', '=', 2], results: 100 }),
      post({ filters: ['label', '=', 5], results: 100 }),
    ])

    const reading: VndbListRes  = await readingRes.json()
    const finished: VndbListRes = await finishedRes.json()
    const wishlist: VndbListRes = await wishlistRes.json()

    const finishedCount = finished.results.length + (finished.more ? '+' : '')
    const wishlistCount = wishlist.results.length + (wishlist.more ? '+' : '')
    renderVndb(reading, String(finishedCount), String(wishlistCount))
  } catch {
    renderVndbError('could not reach VNDB')
  }
}

function renderVndb(reading: VndbListRes, finishedCount: string, wishlistCount: string) {
  const readingCount = reading.results.length + (reading.more ? '+' : '')
  setPill('vndb-pill', `${readingCount} reading`)

  const $reading = $('#vndb-reading').empty()
  if (reading.results.length === 0) {
    $reading.html('<p class="error-msg">nothing in reading list right now</p>')
  } else {
    reading.results.forEach(entry => {
      const vn  = entry.vn
      const dev = vn.developers?.[0]?.name ?? ''
      const img = vn.image?.url
        ? `<img class="vn-cover" src="${vn.image.url}" alt="${vn.title}">`
        : `<div class="vn-cover-placeholder">📖</div>`

      $reading.append(`
        <div class="vn-item">
          ${img}
          <div class="vn-meta">
            <span class="vn-status">currently reading</span>
            <span class="vn-title">${vn.title}</span>
            ${dev ? `<span class="vn-developer">${dev}</span>` : ''}
          </div>
        </div>`)
    })
  }

  $('#vndb-stats').html(
    statBadge('finished',  finishedCount) +
    statBadge('wishlist',  wishlistCount)
  )
}

function renderVndbError(msg: string) {
  $('#vndb-reading').html(`<p class="error-msg">${msg}</p>`)
  setPill('vndb-pill', 'error', 'pill--error')
}

// ── Poll Last.fm every 30s for live now-playing updates ───────────────────
setInterval(fetchLastfm, 30_000)
