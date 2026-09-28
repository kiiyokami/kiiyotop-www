import type { Now } from './types'

export type StageContent = {
  label: string
  headline: string
  sub: string | null
  context: string[]
  empty: boolean
}

const NOTHING = 'Nothing playing right now.'

/**
 * Decides what occupies the stage.
 *
 * The stage carries live state only. A scrobble with `live: false` is history and
 * belongs in the music window, not here. When nothing is live the stage holds its size and
 * states the case, because that is the page's default condition, not an error.
 */
export function stageContent(now: Now | null): StageContent {
  const track = now?.listening?.live ? now.listening : null
  const game = now?.playing ?? null
  const presence = now?.discord ?? null

  const context: string[] = []
  // The game can arrive from both Steam and Discord. Report it once.
  if (game) context.push(game.name)
  else if (presence?.activity) context.push(presence.activity)
  if (presence?.status && presence.status !== 'offline') context.push(presence.status)

  if (track) {
    return {
      label: 'listening now',
      headline: track.name,
      sub: track.artist,
      context,
      empty: false,
    }
  }

  if (game) {
    return { label: 'playing now', headline: game.name, sub: null, context: context.slice(1), empty: false }
  }

  return { label: 'now', headline: NOTHING, sub: null, context, empty: true }
}
