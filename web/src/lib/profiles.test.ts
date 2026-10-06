import { describe, expect, it } from 'vitest'
import { playlists, profiles, socials } from './profiles'

describe('profiles', () => {
  it('uses https everywhere and carries no tracking query strings', () => {
    for (const p of Object.values(profiles)) {
      const url = new URL(p.url)
      expect(url.protocol).toBe('https:')
      expect(url.search).toBe('')
    }
  })

  it('lists the three favourite playlists without tracking parameters', () => {
    expect(playlists.map((p) => p.label)).toEqual(['the j', 'hiro shinosawa', 'top'])
    for (const p of playlists) {
      expect(p.url).toMatch(/^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]+$/)
    }
  })

  it('lists the three socials in order', () => {
    expect(socials.map((p) => p.label)).toEqual(['Discord', 'Instagram', 'Spotify'])
  })

  it('uses the Instagram handle with the double i', () => {
    expect(profiles.instagram.handle).toBe('kiiyokamii')
    expect(profiles.instagram.url).toBe('https://www.instagram.com/kiiyokamii')
  })

  it('points Last.fm and Steam at the real profiles', () => {
    expect(profiles.lastfm.url).toBe('https://www.last.fm/user/Kiiyo_')
    expect(profiles.steam.url).toBe('https://steamcommunity.com/profiles/76561198417657156')
  })
})
