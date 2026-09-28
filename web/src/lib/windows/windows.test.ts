import { fireEvent, render } from '@testing-library/svelte'
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

describe('Reading, with more to show', () => {
  const vndb = (over = {}) => ({
    reading: [], rated: [], finished: 0, finished_more: false, wishlist: 0, wishlist_more: false, ...over,
  })

  it('shows a cover when the server sent one and a blank tile when it withheld it', () => {
    const { container } = render(Reading, { props: { state: ready({ vndb: vndb({ reading: [
      { title: 'Safe One', developer: 'Dev', image: 'https://t.vndb.org/cv/1.jpg' },
      { title: 'Withheld', developer: null, image: null },
    ] }) }) } })
    const imgs = container.querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('src', 'https://t.vndb.org/cv/1.jpg')
    expect(container.querySelectorAll('.tile.blank')).toHaveLength(1)
  })

  it('lists favourites with their scores', () => {
    const { getByText } = render(Reading, { props: { state: ready({ vndb: vndb({
      rated: [{ title: 'Favourite VN', image: null, score: 9.5 }],
    }) }) } })
    expect(getByText('Favourite VN')).toBeInTheDocument()
    expect(getByText('9.5')).toBeInTheDocument()
  })

  it('counts finished and wishlisted VNs, marking a floor with +', () => {
    const { getByText } = render(Reading, { props: { state: ready({ vndb: vndb({
      finished: 100, finished_more: true, wishlist: 3,
    }) }) } })
    expect(getByText('100+ finished · 3 wishlist')).toBeInTheDocument()
  })
})

describe('Music playlists', () => {
  it('links the three favourite playlists even when Last.fm is down', () => {
    const { getByRole } = render(Music, { props: { state: ready() } })
    expect(getByRole('link', { name: 'the j' })).toHaveAttribute('href', 'https://open.spotify.com/playlist/43xfTDyNQAa9tLKlsMxgOD')
    expect(getByRole('link', { name: 'hiro shinosawa' })).toHaveAttribute('href', 'https://open.spotify.com/playlist/0Wxr23KwDM6KAUNbjU0WC9')
    expect(getByRole('link', { name: 'top' })).toHaveAttribute('href', 'https://open.spotify.com/playlist/1Rnwru5jyplPZRUYPgUgTN')
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
  const steam = { persona: 'kiiyo', avatar: '', state: 'online' as const, level: 10, friends: 3, recent: [
    { app_id: 1, name: 'Grand Theft Auto V Legacy', minutes_2weeks: 3198, minutes_total: 9000, thumb: '' },
  ] }
  const osu = { username: '-Flux', pp: 5000, rank: 48120, country_rank: 900, accuracy: 98.1, level: 100, playcount: 31000,
    ss: 12, s: 80, a: 200, best: [
      { title: 'Song A', artist: 'Artist', version: 'Insane', pp: 310, rank: 'S' },
      { title: '', artist: '', version: '', pp: 290, rank: 'A' },
    ] }
  const cs2 = { rating: 1.23, premier: 21088, faceit: 7, aim: 71.2, utility: 45.5, positioning: 60.1,
    opening: 12.5, clutch: 9.8, hs_percent: 44.4, winrate: 52.3, matches: 812 }

  it('lists each game with a one-line summary and names a failed one', () => {
    const { getByText, getByRole } = render(Games, { props: { state: ready({ steam, osu }) } })
    expect(getByRole('button', { name: /^Steam/ })).toBeInTheDocument()
    expect(getByText('online')).toBeInTheDocument()
    expect(getByText('#48,120 · 98.1%')).toBeInTheDocument()
    expect(getByText("Couldn't reach Leetify.")).toBeInTheDocument()
  })

  it('opens CS2 details with a header linking to Leetify, and goes back', async () => {
    const { getByRole, getByText, queryByText } = render(Games, { props: { state: ready({ cs2 }) } })
    await fireEvent.click(getByRole('button', { name: /^CS2/ }))
    expect(getByRole('link', { name: 'CS2 ↗' })).toHaveAttribute('href', 'https://leetify.com/app/profile/76561198417657156')
    expect(getByText('21,088')).toBeInTheDocument()
    expect(getByText('812')).toBeInTheDocument()
    expect(getByText('44.4%')).toBeInTheDocument()
    await fireEvent.click(getByRole('button', { name: '← games' }))
    expect(queryByText('812')).toBeNull()
    expect(getByRole('button', { name: /^CS2/ })).toBeInTheDocument()
  })

  it('opens osu! details with grade counts and top plays', async () => {
    const { getByRole, getByText } = render(Games, { props: { state: ready({ osu }) } })
    await fireEvent.click(getByRole('button', { name: /^osu!/ }))
    expect(getByRole('link', { name: 'osu! ↗' })).toHaveAttribute('href', 'https://osu.ppy.sh/users/-Flux')
    expect(getByText('12 / 80 / 200')).toBeInTheDocument()
    expect(getByText('Song A [Insane]')).toBeInTheDocument()
    expect(getByText('Unknown beatmap')).toBeInTheDocument()
  })

  it('opens Steam details with recently played hours', async () => {
    const { getByRole, getByText } = render(Games, { props: { state: ready({ steam }) } })
    await fireEvent.click(getByRole('button', { name: /^Steam/ }))
    expect(getByRole('link', { name: 'Steam ↗' })).toHaveAttribute('href', 'https://steamcommunity.com/profiles/76561198417657156')
    expect(getByText('Grand Theft Auto V Legacy')).toBeInTheDocument()
    expect(getByText('53.3h')).toBeInTheDocument()
  })

  it('still offers the profile link from a detail view while loading or failed', async () => {
    const failed = render(Games, { props: { state: ready() } })
    await fireEvent.click(failed.getByRole('button', { name: /^osu!/ }))
    expect(failed.getByRole('link', { name: 'osu! ↗' })).toBeInTheDocument()
    expect(failed.getByText("Couldn't reach osu!.")).toBeInTheDocument()
    failed.unmount()

    const pending = render(Games, { props: { state: loading } })
    await fireEvent.click(pending.getByRole('button', { name: /^CS2/ }))
    expect(pending.getByRole('link', { name: 'CS2 ↗' })).toBeInTheDocument()
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
