import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import type { SnapshotState } from '../snapshot'
import type { Snapshot } from '../types'
import Now from './Now.svelte'
import Music from './Music.svelte'
import Reading from './Reading.svelte'
import Games from './Games.svelte'
import Projects from './Projects.svelte'
import Socials from './Socials.svelte'
import { SERVER_DOWN } from './notes'

const base: Snapshot = {
  now: { discord: null, listening: null, playing: null },
  lastfm: null, steam: null, cs2: null, osu: null, vndb: null, github: null,
}
const ready = (over: Partial<Snapshot> = {}): SnapshotState => ({ status: 'ready', error: null, data: { ...base, ...over } })
const loading: SnapshotState = { status: 'loading', data: null, error: null }
const down: SnapshotState = { status: 'error', data: null, error: '502 from the API' }

describe('Now', () => {
  it('shows a live track with its artist', () => {
    const { getByText } = render(Now, { props: { state: ready({
      now: { discord: null, playing: null, listening: { name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: true } },
    }) } })
    expect(getByText('listening now')).toBeInTheDocument()
    expect(getByText('Ame wo Matsu')).toBeInTheDocument()
    expect(getByText('Lamp')).toBeInTheDocument()
  })

  it('states the empty case at full size', () => {
    const { getByText } = render(Now, { props: { state: ready() } })
    expect(getByText('Nothing playing right now.')).toBeInTheDocument()
  })

  it('names the server when the whole API is unreachable', () => {
    const { getByText } = render(Now, { props: { state: down } })
    expect(getByText(SERVER_DOWN)).toBeInTheDocument()
  })
})

describe('Music', () => {
  it('names Last.fm when only that source failed', () => {
    const { getByText } = render(Music, { props: { state: ready() } })
    expect(getByText("Couldn't reach Last.fm.")).toBeInTheDocument()
  })

  it('lists top artists and links to the profile', () => {
    const { getByText, getByRole } = render(Music, { props: { state: ready({ lastfm: {
      total_scrobbles: 12431, recent: [], top_tracks: [], genres: [],
      top_artists: [{ name: 'Lamp', playcount: 214 }],
    } }) } })
    expect(getByText('Lamp')).toBeInTheDocument()
    expect(getByText('12,431 scrobbles')).toBeInTheDocument()
    expect(getByRole('link', { name: /Last\.fm/ })).toHaveAttribute('href', 'https://www.last.fm/user/Kiiyo_')
  })

  it('falls back to recent tracks when the chart is empty', () => {
    const { getByText } = render(Music, { props: { state: ready({ lastfm: {
      total_scrobbles: 5, top_artists: [], top_tracks: [], genres: [],
      recent: [{ name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: false }],
    } }) } })
    expect(getByText('Ame wo Matsu')).toBeInTheDocument()
  })
})

describe('duplicate entries from the APIs', () => {
  it('Music renders a track that appears twice in the recent list', () => {
    const t = { name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: false }
    const { getAllByText } = render(Music, { props: { state: ready({ lastfm: {
      total_scrobbles: 2, top_artists: [], top_tracks: [], genres: [], recent: [t, t],
    } }) } })
    expect(getAllByText('Ame wo Matsu')).toHaveLength(2)
  })

  it('Reading renders two entries with the same title', () => {
    const vn = { title: 'Same Title', developer: null, image: null }
    const { getAllByText } = render(Reading, { props: { state: ready({ vndb: {
      reading: [vn, vn], rated: [], finished: 0, finished_more: false, wishlist: 0, wishlist_more: false,
    } }) } })
    expect(getAllByText('Same Title')).toHaveLength(2)
  })
})

describe('Reading', () => {
  it('says so when nothing is being read', () => {
    const { getByText } = render(Reading, { props: { state: ready({ vndb: {
      reading: [], rated: [], finished: 12, finished_more: false, wishlist: 0, wishlist_more: false,
    } }) } })
    expect(getByText('Not reading anything on VNDB right now.')).toBeInTheDocument()
  })
})

describe('Games', () => {
  it('renders the profile links while the snapshot is still loading', () => {
    const { getByRole } = render(Games, { props: { state: loading } })
    expect(getByRole('link', { name: 'Steam' })).toHaveAttribute('href', 'https://steamcommunity.com/profiles/76561198417657156')
    expect(getByRole('link', { name: 'CS2' })).toHaveAttribute('href', 'https://leetify.com/app/profile/76561198417657156')
    expect(getByRole('link', { name: 'osu!' })).toHaveAttribute('href', 'https://osu.ppy.sh/users/-Flux')
  })

  it('shows each game on its own and names a failed one', () => {
    const { getByText } = render(Games, { props: { state: ready({
      steam: { persona: 'kiiyo', avatar: '', state: 'online', level: 10, friends: 3, recent: [] },
      osu: { username: '-Flux', pp: 5000, rank: 48120, country_rank: 900, accuracy: 98.1, level: 100, playcount: 1, ss: 0, s: 0, a: 0, best: [] },
    }) } })
    expect(getByText('online')).toBeInTheDocument()
    expect(getByText('#48,120 · 98.1%')).toBeInTheDocument()
    expect(getByText("Couldn't reach Leetify.")).toBeInTheDocument()
  })
})

describe('Projects', () => {
  it('lists pinned repos as links', () => {
    const { getByRole } = render(Projects, { props: { state: ready({ github: { pinned: [
      { name: 'kiiyotop-www', description: 'Personal homepage.', language: 'Svelte', stars: 3, url: 'https://github.com/kiiyokami/kiiyotop-www' },
    ] } }) } })
    expect(getByRole('link', { name: 'kiiyotop-www' })).toHaveAttribute('href', 'https://github.com/kiiyokami/kiiyotop-www')
  })

  it('never prints "null" or a dangling separator for missing fields', () => {
    const { container } = render(Projects, { props: { state: ready({ github: { pinned: [
      { name: 'dotfiles', description: null, language: null, stars: 0, url: 'https://github.com/kiiyokami/dotfiles' },
    ] } }) } })
    expect(container.textContent).not.toContain('null')
    expect(container.querySelector('.meta')?.textContent?.trim()).toBe('★ 0')
  })

  it('distinguishes nothing pinned from GitHub failing', () => {
    const empty = render(Projects, { props: { state: ready({ github: { pinned: [] } }) } })
    expect(empty.getByText('No pinned repos on GitHub.')).toBeInTheDocument()
    empty.unmount()
    const failed = render(Projects, { props: { state: ready() } })
    expect(failed.getByText("Couldn't reach GitHub.")).toBeInTheDocument()
  })
})

describe('Socials', () => {
  it('links the four socials in order', () => {
    const { getAllByRole } = render(Socials)
    const links = getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(['Discord', 'LinkedIn', 'Instagram', 'Spotify'])
    for (const a of links) {
      expect(a.getAttribute('href')).toMatch(/^https:\/\//)
      expect(a).toHaveAttribute('rel', 'noopener')
    }
  })
})
