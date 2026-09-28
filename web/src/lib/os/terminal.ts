import type { SnapshotState } from '../snapshot'
import { socials } from '../profiles'
import { stageContent } from '../stage'
import type { Theme } from './theme'
import type { WinId } from './windows'

export type Action =
  | { type: 'open'; id: WinId }
  | { type: 'theme' }
  | { type: 'tidy' }
  | { type: 'clear' }

export interface TermCtx { snapshot: SnapshotState; theme: Theme }
export interface TermResult { lines: string[]; action?: Action }

export const PROMPT = 'kiiyo@top ~ $'
export const SCROLLBACK = 100
export const ECHO_MAX = 64
export const COMMANDS = ['help', 'whoami', 'now', 'projects', 'socials', 'games', 'theme', 'tidy', 'clear'] as const

function nowLine(s: SnapshotState): string {
  if (s.status === 'loading') return 'still loading, try again in a moment'
  if (s.status === 'error') return "couldn't reach the kiiyo.top server"
  const c = stageContent(s.data?.now ?? null)
  if (c.empty) return 'nothing playing right now'
  return c.sub ? `listening to ${c.headline} by ${c.sub}` : `playing ${c.headline}`
}

/** Pure: returns text lines only. The caller renders them as text nodes. */
export function run(input: string, ctx: TermCtx): TermResult {
  const typed = input.trim()
  switch (typed.toLowerCase()) {
    case '':         return { lines: [] }
    case 'help':     return { lines: [`commands: ${COMMANDS.join('  ')}`] }
    case 'whoami':   return { lines: ['kiiyo'] }
    case 'now':      return { lines: [nowLine(ctx.snapshot)] }
    case 'projects': return { lines: ['opened projects'], action: { type: 'open', id: 'projects' } }
    case 'games':    return { lines: ['opened games'], action: { type: 'open', id: 'games' } }
    case 'socials':  return { lines: socials.map((p) => `${p.label.toLowerCase()}  ${p.handle ?? p.url}`) }
    case 'theme': {
      const next: Theme = ctx.theme === 'dark' ? 'light' : 'dark'
      return { lines: [`theme: ${next}`], action: { type: 'theme' } }
    }
    case 'tidy':     return { lines: ['tidied'], action: { type: 'tidy' } }
    case 'clear':    return { lines: [], action: { type: 'clear' } }
    default:         return { lines: [`${typed.slice(0, ECHO_MAX)}: command not found. try help`] }
  }
}

export function append(log: string[], lines: string[]): string[] {
  return [...log, ...lines].slice(-SCROLLBACK)
}
