import { describe, expect, it } from 'vitest'
import { profiles, socials } from './profiles'

describe('profiles', () => {
  it('uses https everywhere and carries no tracking query strings', () => {
    for (const p of Object.values(profiles)) {
      const url = new URL(p.url)
      expect(url.protocol).toBe('https:')
      expect(url.search).toBe('')
    }
  })

  it('lists the four socials in order', () => {
    expect(socials.map((p) => p.label)).toEqual(['Discord', 'LinkedIn', 'Instagram', 'Spotify'])
  })

  it('points Last.fm and Steam at the real profiles', () => {
    expect(profiles.lastfm.url).toBe('https://www.last.fm/user/Kiiyo_')
    expect(profiles.steam.url).toBe('https://steamcommunity.com/profiles/76561198417657156')
  })
})
