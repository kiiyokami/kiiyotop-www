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

  // Whole-card click → open profile, unless user clicked an inner <a>
  $(document).on('click', '.card[data-href]', function (e) {
    if ($(e.target).closest('a').length) return
    window.open($(this).data('href') as string, '_blank', 'noopener,noreferrer')
  })

  loadAll()
})

function loadAll() {
  fetchLastfm()
  fetchSteam()
  fetchLeetify()
  fetchVndb()
  fetchGithub()
  fetchOsu()
  fetchDiscord()
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

interface LastfmTopTracksRes {
  toptracks: {
    track: { name: string; artist: { name: string }; playcount: string }[]
  }
}

async function fetchLastfm() {
  try {
    const [recentRes, artistsRes, tracksRes] = await Promise.all([
      fetch('/api/lastfm/recent'),
      fetch('/api/lastfm/topartists'),
      fetch('/api/lastfm/toptracks'),
    ])
    if (!recentRes.ok) throw new Error(`${recentRes.status}`)
    const data: LastfmRecentRes            = await recentRes.json()
    const artistsData: LastfmTopArtistsRes = await artistsRes.json()
    const tracksData: LastfmTopTracksRes   = await tracksRes.json()

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

    renderLastfm(data, artistsData, tracksData, genres)
  } catch (e) {
    renderLastfmError('could not reach last.fm')
  }
}

function renderLastfm(data: LastfmRecentRes, artistsData: LastfmTopArtistsRes, tracksData: LastfmTopTracksRes, genres: string[]) {
  const tracks = data.recenttracks.track
  const total  = Number(data.recenttracks['@attr'].total).toLocaleString()
  const first  = tracks[0]
  const isLive = !!first['@attr']?.nowplaying

  // Now playing / last played
  const art = first.image.find(i => i.size === 'medium')?.['#text'] || ''
  const $art = $('#lastfm-art')

  if (art && !art.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
    $art.replaceWith(`<img class="album-art" src="${art}" alt="album art" loading="lazy">`)
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

  // Top tracks this month
  const topTracks = tracksData.toptracks?.track?.slice(0, 5) ?? []
  const $tracks = $('#lastfm-tracks').empty()
  topTracks.forEach((t, i) => {
    $tracks.append(`
      <div class="track-item">
        <span class="track-item-num">${i + 1}</span>
        <span class="track-item-name">${t.name}</span>
        <span class="track-item-sep">·</span>
        <span class="track-item-artist">${t.artist.name}</span>
        <span class="track-item-sep">—</span>
        <span>${Number(t.playcount).toLocaleString()}×</span>
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
  avatarmedium: string
}

interface SteamRecentGame {
  appid: number
  name: string
  playtime_2weeks: number
  playtime_forever: number
}

const STEAM_STATE: Record<number, string> = {
  0: 'offline', 1: 'online', 2: 'busy', 3: 'away', 4: 'snooze',
}

async function fetchSteam() {
  try {
    const [summaryRes, recentRes, levelRes, friendsRes] = await Promise.all([
      fetch('/api/steam/summary'),
      fetch('/api/steam/recent'),
      fetch('/api/steam/level'),
      fetch('/api/steam/friends'),
    ])

    const summary     = await summaryRes.json()
    const recent      = await recentRes.json()
    const levelData   = await levelRes.json()
    const friendsData = friendsRes.ok ? await friendsRes.json() : null

    const player: SteamPlayer      = summary.response.players[0]
    const games: SteamRecentGame[] = recent.response?.games ?? []
    const level: number            = levelData.response?.player_level ?? 0
    const friendCount: number      = friendsData?.friendslist?.friends?.length ?? 0
    renderSteam(player, games, level, friendCount)
  } catch {
    renderSteamError('could not reach Steam API')
  }
}

function renderSteam(player: SteamPlayer, games: SteamRecentGame[], level: number, friendCount: number) {
  const state = STEAM_STATE[player.personastate] ?? 'offline'
  const isPlaying = !!player.gameextrainfo
  const dotClass = isPlaying ? 'playing' : state === 'online' ? 'online' : state === 'away' ? 'away' : ''

  // Avatar
  $('#steam-avatar').attr('src', player.avatarmedium).removeClass('hidden')

  $('#steam-dot').attr('class', `status-dot ${dotClass}`)
  $('#steam-state').text(player.personaname + ' · ' + (isPlaying ? `in-game` : state))
  $('#steam-level').text(`lvl ${level}${friendCount > 0 ? ` · ${friendCount} friends` : ''}`)
  setPill('steam-pill', isPlaying ? 'in-game' : state, isPlaying ? 'pill--playing' : state === 'online' ? 'pill--online' : undefined)

  if (isPlaying) {
    $('#steam-game').text(`playing ${player.gameextrainfo}`)
  }

  const $recent = $('#steam-recent').empty()
  games.forEach(g => {
    const hrs  = (g.playtime_2weeks / 60).toFixed(1)
    const all  = (g.playtime_forever / 60).toFixed(0)
    const thumb = `https://media.steampowered.com/steam/apps/${g.appid}/header.jpg`
    $recent.append(`
      <div class="game-item">
        <img class="game-thumb" src="${thumb}" alt="${g.name}" loading="lazy">
        <div class="game-item-info">
          <span class="game-item-name">${g.name}</span>
          <span class="game-item-hrs">${hrs}h this week · ${all}h total</span>
        </div>
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
    statCell('aim',         r.aim.toFixed(2)) +
    statCell('utility',     r.utility.toFixed(2)) +
    statCell('positioning', r.positioning.toFixed(2)) +
    statCell('clutch',      r.clutch.toFixed(2)) +
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
  vote?: number
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

    const [readingRes, finishedRes, wishlistRes, allRes] = await Promise.all([
      post({ filters: ['label', '=', 1], fields: 'vn{id,title,image{url},developers{name}}', results: 3 }),
      post({ filters: ['label', '=', 2], results: 100 }),
      post({ filters: ['label', '=', 5], results: 100 }),
      post({ fields: 'vn{id,title,image{url}},vote', results: 100 }),
    ])

    const reading: VndbListRes  = await readingRes.json()
    const finished: VndbListRes = await finishedRes.json()
    const wishlist: VndbListRes = await wishlistRes.json()
    const allEntries: VndbListRes = await allRes.json()

    // Filter to voted entries and sort by vote descending
    const rated: VndbListRes = {
      results: allEntries.results
        .filter(e => e.vote != null)
        .sort((a, b) => (b.vote ?? 0) - (a.vote ?? 0))
        .slice(0, 7),
      more: false,
    }

    const finishedCount = finished.results.length + (finished.more ? '+' : '')
    const wishlistCount = wishlist.results.length + (wishlist.more ? '+' : '')
    renderVndb(reading, rated, String(finishedCount), String(wishlistCount))
  } catch {
    renderVndbError('could not reach VNDB')
  }
}

function renderVndb(reading: VndbListRes, rated: VndbListRes, finishedCount: string, wishlistCount: string) {
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
        ? `<img class="vn-cover" src="${vn.image.url}" alt="${vn.title}" loading="lazy">`
        : `<div class="vn-cover-placeholder">📖</div>`

      $reading.append(`
        <div class="vn-item">
          ${img}
          <div class="vn-meta">
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

  // Top rated
  const $rated = $('#vndb-rated').empty()
  rated.results.forEach((entry, i) => {
    const vn    = entry.vn
    const score = ((entry.vote ?? 0) / 10).toFixed(1)
    const img   = vn.image?.url
      ? `<img class="vn-thumb" src="${vn.image.url}" alt="${vn.title}" loading="lazy">`
      : `<div class="vn-thumb vn-thumb--placeholder"></div>`
    $rated.append(`
      <div class="vn-rated-item">
        <span class="track-item-num">${i + 1}</span>
        ${img}
        <span class="vn-rated-title">${vn.title}</span>
        <span class="vn-rated-score">${score}</span>
      </div>`)
  })
}

function renderVndbError(msg: string) {
  $('#vndb-reading').html(`<p class="error-msg">${msg}</p>`)
  setPill('vndb-pill', 'error', 'pill--error')
}

// ── GitHub ────────────────────────────────────────────────────────────────
const GITHUB_USER = 'kiiyokami'

interface GithubProfile {
  public_repos: number
  followers:    number
}

interface GithubRepo {
  name:              string
  description:       string | null
  language:          string | null
  stargazers_count:  number
  html_url:          string
  fork:              boolean
}

const LANG_COLOR: Record<string, string> = {
  Rust:       '#dea584',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python:     '#3572a5',
  Go:         '#00add8',
  CSS:        '#563d7c',
  HTML:       '#e34c26',
  Shell:      '#89e051',
}

async function fetchGithub() {
  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=10`),
    ])
    if (!profileRes.ok) throw new Error()
    const profile: GithubProfile = await profileRes.json()
    const repos:   GithubRepo[]  = await reposRes.json()
    renderGithub(profile, repos)
  } catch {
    renderGithubError('could not reach GitHub')
  }
}

function renderGithub(profile: GithubProfile, repos: GithubRepo[]) {
  setPill('github-pill', `${profile.public_repos} repos`)

  $('#github-stats').html(
    statCell('repos',     profile.public_repos) +
    statCell('followers', profile.followers)
  )

  // Derive top languages from repos
  const langCounts: Record<string, number> = {}
  repos.forEach(r => {
    if (r.language) langCounts[r.language] = (langCounts[r.language] ?? 0) + 1
  })
  const topLangs = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([lang]) => lang)

  $('#github-langs').html(
    topLangs.map(lang => {
      const color = LANG_COLOR[lang] ?? '#888'
      return `<span class="genre-tag" style="border-left:3px solid ${color};">${lang}</span>`
    }).join('')
  )

  const $list = $('#github-repos').empty()
  repos.filter(r => !r.fork).slice(0, 8).forEach(repo => {
    const lang = repo.language
    const dot  = lang
      ? `<span class="lang-dot" style="background:${LANG_COLOR[lang] ?? '#888'}"></span><span class="lang-name">${lang}</span>`
      : ''
    const stars = repo.stargazers_count > 0
      ? `<span class="repo-stars">★ ${repo.stargazers_count}</span>`
      : ''
    $list.append(`
      <a class="repo-item" href="${repo.html_url}" target="_blank" rel="noopener">
        <span class="repo-name">${repo.name}</span>
        ${repo.description ? `<span class="repo-desc">${repo.description}</span>` : ''}
        <div class="repo-meta">
          <span class="repo-lang">${dot}</span>
          ${stars}
        </div>
      </a>`)
  })
}

function renderGithubError(msg: string) {
  $('#github-repos').html(`<p class="error-msg">${msg}</p>`)
  setPill('github-pill', 'error', 'pill--error')
}

// ── osu! ──────────────────────────────────────────────────────────────────
interface OsuUser {
  username:         string
  pp_raw:           string
  pp_rank:          string
  pp_country_rank:  string
  accuracy:         string
  playcount:        string
  level:            string
  count_rank_ss:    string
  count_rank_s:     string
  count_rank_a:     string
  country:          string
}

interface OsuScore {
  beatmap_id: string
  pp:         string
  rank:       string
  maxcombo:   string
  title:      string
  artist:     string
  version:    string
}

const OSU_RANK_COLOR: Record<string, string> = {
  XH: '#d4d4d4', X: '#ffcc22', SH: '#d4d4d4', S: '#ffcc22', A: '#88dd44', B: '#4488ff', C: '#ff88aa', D: '#ff4444',
}

async function fetchOsu() {
  try {
    const [userRes, bestRes] = await Promise.all([
      fetch('/api/osu/user'),
      fetch('/api/osu/best'),
    ])
    if (!userRes.ok || !bestRes.ok) throw new Error()
    const users: OsuUser[] = await userRes.json()
    const best:  OsuScore[] = await bestRes.json()
    renderOsu(users[0], best)
  } catch {
    renderOsuError('could not reach osu!')
  }
}

function renderOsu(user: OsuUser, best: OsuScore[]) {
  const pp  = Math.round(Number(user.pp_raw)).toLocaleString()
  const acc = Number(user.accuracy).toFixed(2) + '%'

  setPill('osu-pill', `#${Number(user.pp_rank).toLocaleString()}`)
  $('#osu-pp').text(pp + 'pp')

  $('#osu-stats').html(
    statCell('global rank',  '#' + Number(user.pp_rank).toLocaleString()) +
    statCell('country rank', '#' + Number(user.pp_country_rank).toLocaleString()) +
    statCell('accuracy',     acc) +
    statCell('level',        Math.floor(Number(user.level)).toString()) +
    statCell('playcount',    Number(user.playcount).toLocaleString()) +
    statCell('SS / S / A',  `${user.count_rank_ss}/${user.count_rank_s}/${user.count_rank_a}`)
  )

  const $best = $('#osu-best').empty()
  best.slice(0, 5).forEach((s, i) => {
    const pp    = Math.round(Number(s.pp))
    const rank  = s.rank
    const color = OSU_RANK_COLOR[rank] ?? '#888'
    $best.append(`
      <div class="track-item">
        <span class="track-item-num">${i + 1}</span>
        <span class="track-item-name">${s.title}</span>
        <span class="track-item-sep">—</span>
        <span style="color:${color};font-weight:700;margin-right:.25rem;">${rank}</span><span>${pp}pp</span>
      </div>`)
  })
}

function renderOsuError(msg: string) {
  $('#osu-pp').text('—')
  $('#osu-stats').html(`<p class="error-msg">${msg}</p>`)
  setPill('osu-pill', 'error', 'pill--error')
}

// ── Discord / Lanyard ─────────────────────────────────────────────────────
interface LanternActivity {
  type:     number
  name:     string
  state?:   string
  details?: string
  emoji?:   { name: string }
  timestamps?: { start?: number; end?: number }
}

interface LanternData {
  discord_user: {
    username:     string
    global_name:  string | null
    avatar:       string | null
    id:           string
  }
  discord_status: 'online' | 'idle' | 'dnd' | 'offline'
  activities:     LanternActivity[]
  active_on_discord_web:     boolean
  active_on_discord_desktop: boolean
  active_on_discord_mobile:  boolean
  spotify: null | {
    song:          string
    artist:        string
    album_art_url: string
  }
}

const DISCORD_STATUS_DOT: Record<string, string> = {
  online: 'online', idle: 'away', dnd: 'dnd', offline: '',
}

const DISCORD_STATUS_LABEL: Record<string, string> = {
  online: 'online', idle: 'idle', dnd: 'do not disturb', offline: 'offline',
}

async function fetchDiscord() {
  try {
    const res = await fetch('/api/discord')
    if (!res.ok) { renderDiscordError('could not reach Discord'); return }
    const json = await res.json()
    if (!json.success) { renderDiscordError('Lanyard error'); return }
    renderDiscord(json.data as LanternData)
  } catch {
    renderDiscordError('could not reach Discord')
  }
}

function renderDiscord(data: LanternData) {
  const user   = data.discord_user
  const status = data.discord_status
  const name   = user.global_name ?? user.username

  $('#discord-dot').attr('class', `status-dot ${DISCORD_STATUS_DOT[status] ?? ''}`)
  $('#discord-name').text(name)
  $('#discord-badge').attr('title', `${name} · ${DISCORD_STATUS_LABEL[status] ?? 'offline'}`)

  // Show live activity: Spotify > game > custom status
  const $act = $('#discord-activity')
  if (data.spotify) {
    const s = data.spotify
    $act.html(`<span class="discord-activity-icon">♪</span><span>${s.song} · ${s.artist}</span>`).show()
  } else {
    const game    = data.activities.find(a => a.type === 0)
    const custom  = data.activities.find(a => a.type === 4)
    if (game) {
      $act.html(`<span class="discord-activity-icon">🎮</span><span>${game.name}</span>`).show()
    } else if (custom?.state) {
      const emoji = custom.emoji?.name ? `${custom.emoji.name} ` : ''
      $act.html(`<span>${emoji}${custom.state}</span>`).show()
    } else {
      $act.hide()
    }
  }
}

function renderDiscordError(_msg: string) {
  $('#discord-dot').attr('class', 'status-dot')
  $('#discord-name').text('—')
}

// ── Poll Last.fm every 30s for live now-playing updates ───────────────────
setInterval(fetchLastfm, 30_000)
