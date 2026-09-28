export type WinId = 'now' | 'music' | 'reading' | 'projects' | 'socials' | 'games' | 'terminal'

/** Tab order, taskbar order and stacked-flow order. Never the z-order. */
export const WINDOW_IDS: readonly WinId[] = ['now', 'music', 'reading', 'projects', 'socials', 'games', 'terminal']

export const TITLES: Record<WinId, string> = {
  now: 'now.txt',
  music: 'music',
  reading: 'reading',
  projects: 'projects',
  socials: 'socials',
  games: 'games',
  terminal: 'terminal',
}

export interface Geom { x: number; y: number; w: number; h: number }
export interface WinState extends Geom { hidden: boolean; max: boolean }
/** `order` runs back to front: the last entry is drawn on top. */
export interface OsState { windows: Record<WinId, WinState>; order: WinId[] }
/** The window area: below the menu bar, above the taskbar. */
export interface Bounds { width: number; height: number }

export const WORK_W = 1100
export const TITLE_H = 24
export const GRAB = 80
export const MIN_W = 200
export const MIN_H = 100
export const STORAGE_KEY = 'kiiyoOS:v1'

/** The tidy layout, in coordinates of a 1100px work area. */
const LAYOUT: Record<WinId, Geom> = {
  now:      { x: 100, y: 18,  w: 470, h: 150 },
  music:    { x: 100, y: 190, w: 225, h: 150 },
  reading:  { x: 345, y: 190, w: 225, h: 150 },
  projects: { x: 100, y: 362, w: 470, h: 190 },
  socials:  { x: 600, y: 18,  w: 210, h: 200 },
  games:    { x: 830, y: 18,  w: 250, h: 200 },
  terminal: { x: 600, y: 240, w: 480, h: 230 },
}

export function workOffset(width: number): number {
  return Math.max(0, Math.round((width - WORK_W) / 2))
}

export function defaultGeom(id: WinId, width: number): Geom {
  const g = LAYOUT[id]
  return { ...g, x: g.x + workOffset(width) }
}

/** Every window open in its default spot, now.txt in front. */
export function tidy(width: number): OsState {
  const windows = {} as Record<WinId, WinState>
  for (const id of WINDOW_IDS) windows[id] = { ...defaultGeom(id, width), hidden: false, max: false }
  return { windows, order: [...WINDOW_IDS.filter((id) => id !== 'now'), 'now'] }
}

/** First visit: only now.txt is open; the rest wait on the icons and taskbar. */
export function initial(width: number): OsState {
  let s = tidy(width)
  for (const id of WINDOW_IDS) if (id !== 'now') s = minimize(s, id)
  return s
}

function patch(s: OsState, id: WinId, p: Partial<WinState>): OsState {
  return { ...s, windows: { ...s.windows, [id]: { ...s.windows[id], ...p } } }
}

export function front(s: OsState, id: WinId): OsState {
  if (s.order[s.order.length - 1] === id) return s
  return { ...s, order: [...s.order.filter((o) => o !== id), id] }
}

export function frontId(s: OsState): WinId | null {
  for (let i = s.order.length - 1; i >= 0; i--) {
    if (!s.windows[s.order[i]].hidden) return s.order[i]
  }
  return null
}

export function open(s: OsState, id: WinId): OsState {
  return front(patch(s, id, { hidden: false }), id)
}

export function minimize(s: OsState, id: WinId): OsState {
  return patch(s, id, { hidden: true })
}

/** Unlike minimize, close forgets where the window was. */
export function close(s: OsState, id: WinId, width: number): OsState {
  return patch(s, id, { ...defaultGeom(id, width), hidden: true, max: false })
}

export function toggleMax(s: OsState, id: WinId): OsState {
  return front(patch(s, id, { max: !s.windows[id].max }), id)
}

export function taskbarClick(s: OsState, id: WinId): OsState {
  if (s.windows[id].hidden) return open(s, id)
  if (frontId(s) === id) return minimize(s, id)
  return front(s, id)
}

function clampGeom(g: Geom, b: Bounds): Geom {
  const w = Math.min(Math.max(g.w, MIN_W), Math.max(MIN_W, b.width))
  const h = Math.min(Math.max(g.h, MIN_H), Math.max(MIN_H, b.height))
  // At least GRAB px of the title bar stays reachable on either side.
  const x = Math.min(Math.max(g.x, GRAB - w), b.width - GRAB)
  const y = Math.min(Math.max(g.y, 0), Math.max(0, b.height - TITLE_H))
  return { x, y, w, h }
}

export function move(s: OsState, id: WinId, x: number, y: number, b: Bounds): OsState {
  return patch(s, id, clampGeom({ ...s.windows[id], x, y }, b))
}

export function resize(s: OsState, id: WinId, w: number, h: number, b: Bounds): OsState {
  return patch(s, id, clampGeom({ ...s.windows[id], w, h }, b))
}

/** Stricter than a drag: after a resize or load the whole window fits, so no
 *  control ends up off screen. */
function fitGeom(g: Geom, b: Bounds): Geom {
  const w = Math.min(Math.max(g.w, MIN_W), Math.max(MIN_W, b.width))
  const h = Math.min(Math.max(g.h, MIN_H), Math.max(MIN_H, b.height))
  const x = Math.min(Math.max(g.x, 0), Math.max(0, b.width - w))
  const y = Math.min(Math.max(g.y, 0), Math.max(0, b.height - h))
  return { x, y, w, h }
}

export function clampAll(s: OsState, b: Bounds): OsState {
  let next = s
  for (const id of WINDOW_IDS) next = patch(next, id, fitGeom(next.windows[id], b))
  return next
}

/** Records the work-area offset alongside the layout, so a load on another
 *  screen width can shift windows by the difference instead of by nothing. */
export function serialize(s: OsState, width: number): string {
  return JSON.stringify({ ...s, offset: workOffset(width) })
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isWin(v: unknown): v is WinState {
  if (!isRecord(v)) return false
  const finite = (k: string) => typeof v[k] === 'number' && Number.isFinite(v[k])
  return finite('x') && finite('y') && finite('w') && finite('h')
    && typeof v.hidden === 'boolean' && typeof v.max === 'boolean'
}

const isId = (v: unknown): v is WinId => (WINDOW_IDS as readonly unknown[]).includes(v)

/** Anything unreadable falls back to the tidy layout, window by window. */
export function parse(raw: string | null, width: number): OsState {
  const base = initial(width)
  if (!raw) return base
  let data: unknown
  try { data = JSON.parse(raw) } catch { return base }
  if (!isRecord(data) || !isRecord(data.windows)) return base

  const saved = data.windows
  const shift = typeof data.offset === 'number' && Number.isFinite(data.offset) ? workOffset(width) - data.offset : 0
  const windows = { ...base.windows }
  for (const id of WINDOW_IDS) {
    const w = saved[id]
    if (isWin(w)) windows[id] = { x: w.x + shift, y: w.y, w: w.w, h: w.h, hidden: w.hidden, max: w.max }
  }

  const order: WinId[] = [...new Set(Array.isArray(data.order) ? data.order.filter(isId) : [])]
  // Ids missing from the saved order go to the back.
  for (const id of [...base.order].reverse()) if (!order.includes(id)) order.unshift(id)

  return { windows, order }
}

export function load(width: number): OsState {
  try {
    return parse(localStorage.getItem(STORAGE_KEY), width)
  } catch {
    return initial(width)
  }
}

export function save(s: OsState, width: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(s, width))
  } catch {
    // Storage blocked: the layout lasts for this visit only.
  }
}
