export interface Presence   { name: string; status: 'online' | 'idle' | 'dnd' | 'offline'; activity: string | null }
export interface Track      { name: string; artist: string; art: string | null; live: boolean }
export interface PlayingGame { name: string; app_id: string | null }
export interface Now        { discord: Presence | null; listening: Track | null; playing: PlayingGame | null }

export interface TopArtist  { name: string; playcount: number }
export interface TopTrack   { name: string; artist: string; playcount: number }
export interface Lastfm {
  total_scrobbles: number
  recent: Track[]
  top_artists: TopArtist[]
  top_tracks: TopTrack[]
  genres: string[]
}

export interface RecentGame { app_id: number; name: string; minutes_2weeks: number; minutes_total: number; thumb: string }
export interface Steam {
  persona: string; avatar: string
  state: 'offline' | 'online' | 'busy' | 'away' | 'snooze'
  level: number; friends: number; recent: RecentGame[]
}

export interface Cs2 {
  rating: number | null; premier: number | null; faceit: number | null
  aim: number; utility: number; positioning: number
  opening: number; clutch: number
  hs_percent: number; winrate: number; matches: number
}

export interface OsuScore { title: string; artist: string; version: string; pp: number; rank: string }
export interface Osu {
  username: string; pp: number; rank: number; country_rank: number
  accuracy: number; level: number; playcount: number
  ss: number; s: number; a: number; best: OsuScore[]
}

export interface VnEntry { title: string; developer: string | null; image: string | null }
export interface RatedVn { title: string; image: string | null; score: number }
/** Static standing record. Never live, so it never reaches the stage. */
export interface Maimai {
  rating: number; average: number
  dan: string; class: string
  stars: number; plays: number; url: string
}

export interface Vndb {
  reading: VnEntry[]; rated: RatedVn[]
  finished: number; finished_more: boolean
  wishlist: number; wishlist_more: boolean
}

export interface Repo { name: string; description: string | null; language: string | null; stars: number; url: string }
export interface Github { repos: number; followers: number; languages: string[]; recent: Repo[] }

export interface Snapshot {
  now: Now
  lastfm: Lastfm | null
  steam: Steam | null
  cs2: Cs2 | null
  osu: Osu | null
  maimai: Maimai | null
  vndb: Vndb | null
  github: Github | null
}
