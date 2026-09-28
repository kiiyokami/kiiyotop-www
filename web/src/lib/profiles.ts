export interface Profile {
  label: string
  handle: string | null
  url: string
}

// Static on purpose: these links must work when the API is down.
export const profiles = {
  discord:   { label: 'Discord',   handle: 'kiiyo',     url: 'https://discord.com/users/248013205425750016' },
  linkedin:  { label: 'LinkedIn',  handle: 'abtogni',   url: 'https://www.linkedin.com/in/abtogni' },
  instagram: { label: 'Instagram', handle: 'kiiyokami', url: 'https://www.instagram.com/kiiyokami' },
  spotify:   { label: 'Spotify',   handle: null,        url: 'https://open.spotify.com/user/8es9da5lpjia1g2fr49brrffa' },
  steam:     { label: 'Steam',     handle: null,        url: 'https://steamcommunity.com/profiles/76561198417657156' },
  cs2:       { label: 'CS2',       handle: null,        url: 'https://leetify.com/app/profile/76561198417657156' },
  osu:       { label: 'osu!',      handle: '-Flux',     url: 'https://osu.ppy.sh/users/-Flux' },
  lastfm:    { label: 'Last.fm',   handle: 'Kiiyo_',    url: 'https://www.last.fm/user/Kiiyo_' },
  github:    { label: 'GitHub',    handle: 'kiiyokami', url: 'https://github.com/kiiyokami' },
  vndb:      { label: 'VNDB',      handle: 'u225866',   url: 'https://vndb.org/u225866' },
} satisfies Record<string, Profile>

export const socials: Profile[] = [profiles.discord, profiles.linkedin, profiles.instagram, profiles.spotify]
