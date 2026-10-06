import { describe, expect, it } from 'vitest'
import type { SnapshotState } from '../snapshot'
import type { Now } from '../types'
import { COMMANDS, ECHO_MAX, SCROLLBACK, append, run, type TermCtx } from './terminal'

function ready(now: Partial<Now> = {}): SnapshotState {
  return {
    status: 'ready',
    error: null,
    data: {
      now: { discord: null, listening: null, playing: null, ...now },
      lastfm: null, steam: null, cs2: null, osu: null, vndb: null,
    },
  }
}
const ctx = (over: Partial<TermCtx> = {}): TermCtx => ({ snapshot: ready(), theme: 'light', ...over })

describe('terminal', () => {
  it('help lists every command', () => {
    const [line] = run('help', ctx()).lines
    for (const c of COMMANDS) expect(line).toContain(c)
  })

  it('whoami answers with the bio, trimmed and case-insensitive', () => {
    const { lines } = run('  WhoAmI ', ctx())
    expect(lines[0]).toBe('kiiyo, 25, introvert, fps and rhythm games')
    expect(lines[1]).toContain('Live happily')
    expect(lines[2]).toBe('listen to millsage')
  })

  it('empty input prints nothing and does nothing', () => {
    expect(run('   ', ctx())).toEqual({ lines: [] })
  })

  it('now reports a live track', () => {
    const snap = ready({ listening: { name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: true, played_at: null } })
    expect(run('now', ctx({ snapshot: snap })).lines).toEqual(['listening to Ame wo Matsu by Lamp'])
  })

  it('now reports a game', () => {
    const snap = ready({ playing: { name: 'Counter-Strike 2', app_id: '730' } })
    expect(run('now', ctx({ snapshot: snap })).lines).toEqual(['playing Counter-Strike 2'])
  })

  it('now reports nothing, loading, and an unreachable server distinctly', () => {
    expect(run('now', ctx()).lines).toEqual(['nothing playing right now'])
    expect(run('now', ctx({ snapshot: { status: 'loading', data: null, error: null } })).lines)
      .toEqual(['still loading, try again in a moment'])
    expect(run('now', ctx({ snapshot: { status: 'error', data: null, error: 'x' } })).lines)
      .toEqual(["couldn't reach the kiiyo.top server"])
  })

  it('ls lists the windows and nothing else', () => {
    const { lines } = run('ls', ctx())
    expect(lines).toHaveLength(1)
    expect(lines[0].split(/\s+/)).toEqual(['now.txt', 'music', 'reading', 'projects', 'socials', 'games', 'terminal'])
  })

  it('a window name opens it, with or without its extension', () => {
    expect(run('projects', ctx())).toEqual({ lines: ['opened projects'], action: { type: 'open', id: 'projects' } })
    expect(run('NOW.TXT', ctx())).toEqual({ lines: ['opened now.txt'], action: { type: 'open', id: 'now' } })
    expect(run('now', ctx()).action).toBeUndefined()
  })

  it('theme reports the theme it switches to', () => {
    expect(run('theme', ctx({ theme: 'light' }))).toEqual({ lines: ['theme: dark'], action: { type: 'theme' } })
    expect(run('theme', ctx({ theme: 'dark' })).lines).toEqual(['theme: light'])
  })

  it('tidy and clear hand back actions', () => {
    expect(run('tidy', ctx())).toEqual({ lines: ['tidied'], action: { type: 'tidy' } })
    expect(run('clear', ctx())).toEqual({ lines: [], action: { type: 'clear' } })
  })

  it('unknown commands say so and point at help', () => {
    expect(run('sudo rm -rf /', ctx()).lines).toEqual(['sudo rm -rf /: not found. try ls'])
  })

  it('truncates a very long unknown command in the reply', () => {
    const [line] = run('x'.repeat(500), ctx()).lines
    expect(line.startsWith('x'.repeat(ECHO_MAX) + ':')).toBe(true)
    expect(line.length).toBeLessThan(ECHO_MAX + 40)
  })

  it('append keeps only the last SCROLLBACK lines', () => {
    const log = Array.from({ length: SCROLLBACK }, (_, i) => `l${i}`)
    const next = append(log, ['new'])
    expect(next).toHaveLength(SCROLLBACK)
    expect(next[next.length - 1]).toBe('new')
    expect(next[0]).toBe('l1')
  })
})
