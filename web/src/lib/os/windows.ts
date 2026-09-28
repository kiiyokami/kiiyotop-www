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
/**
 * `docked`: still in its tidy column, so its y follows the windows above it.
 * Dragging undocks. `fit`: height follows the content. Resizing by hand
 * turns it off. Close and tidy restore both.
 */
export interface WinState extends Geom { hidden: boolean; max: boolean; docked: boolean; fit: boolean }
/** `order` runs back to front: the last entry is drawn on top. */
export interface OsState { windows: Record<WinId, WinState>; order: WinId[] }
/** The window area: below the menu bar, above the taskbar. */
export interface Bounds { width: number; height: number }

export const WORK_W = 1100
export const TITLE_H = 24
export const GRAB = 80
export const MIN_W = 200
export const MIN_H = 100
// v2: startup opens the terminal. v1 saves predate that and would keep it closed.
export const STORAGE_KEY = 'kiiyoOS:v2'

/** The desktop never gets shorter than this; below it the page scrolls. */
export const MIN_DESK_H = 700
export const MENUBAR_H = 26
export const TASKBAR_H = 30

/** Top margin of each column, and the gap between stacked windows. */
export const TOP = 18
export const GAP = 22

/** Which windows each docked window stacks under. */
const ABOVE: Record<WinId, WinId[]> = {
  now: [],
  reading: ['now'],
  music: ['reading'],
  games: [],
  projects: ['games'],
  socials: ['projects'],
  terminal: ['socials'],
}

/** The tidy layout, in coordinates of a 1100px work area. y and h are the
 *  fallback before a window has been measured. */
const LAYOUT: Record<WinId, Geom> = {
  now:      { x: 100, y: 18,  w: 470, h: 140 },
  reading:  { x: 100, y: 180, w: 470, h: 220 },
  music:    { x: 100, y: 422, w: 470, h: 170 },
  socials:  { x: 600, y: 486, w: 210, h: 156 },
  games:    { x: 600, y: 18,  w: 480, h: 230 },
  projects: { x: 600, y: 270, w: 480, h: 200 },
  terminal: { x: 600, y: 664, w: 480, h: 300 },
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
  for (const id of WINDOW_IDS) windows[id] = { ...defaultGeom(id, width), hidden: false, max: false, docked: true, fit: true }
  return { windows, order: [...WINDOW_IDS.filter((id) => id !== 'now'), 'now'] }
}

const STARTUP: readonly WinId[] = ['now', 'terminal']

/** First visit and "tidy up": now.txt and the terminal open, the rest wait on
 *  the icons and taskbar. */
export function initial(width: number): OsState {
  let s = tidy(width)
  for (const id of WINDOW_IDS) if (!STARTUP.includes(id)) s = minimize(s, id)
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
  return patch(s, id, { ...defaultGeom(id, width), hidden: true, max: false, docked: true, fit: true })
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
  return patch(s, id, { ...clampGeom({ ...s.windows[id], x, y }, b), docked: false })
}

export function resize(s: OsState, id: WinId, w: number, h: number, b: Bounds): OsState {
  return patch(s, id, { ...clampGeom({ ...s.windows[id], w, h }, b), fit: false })
}

/**
 * Where every window is drawn. Docked windows take their column's x and
 * stack under the visible docked windows above them; a hidden or undocked
 * window passes its place to whatever it was stacked under. `heights` are
 * measured, and a window not yet measured uses its stored height.
 */
export function flow(s: OsState, heights: Partial<Record<WinId, number>>, width: number): Record<WinId, Geom> {
  const out = {} as Record<WinId, Geom>
  const height = (id: WinId) => (s.windows[id].fit ? heights[id] ?? s.windows[id].h : s.windows[id].h)

  const place = (id: WinId): Geom => {
    if (out[id]) return out[id]
    const w = s.windows[id]
    if (!w.docked) return (out[id] = { x: w.x, y: w.y, w: w.w, h: height(id) })
    out[id] = { x: defaultGeom(id, width).x, y: bottomOf(ABOVE[id]), w: w.w, h: height(id) }
    return out[id]
  }

  // The lowest edge among the windows this one stacks under, plus a gap.
  const bottomOf = (ids: WinId[]): number => {
    let y = TOP
    for (const id of ids) {
      const w = s.windows[id]
      const edge = !w.hidden && w.docked
        ? place(id).y + place(id).h + GAP
        : bottomOf(ABOVE[id])
      y = Math.max(y, edge)
    }
    return y
  }

  for (const id of WINDOW_IDS) place(id)
  return out
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
  const flag = (k: string) => v[k] === undefined || typeof v[k] === 'boolean'
  return finite('x') && finite('y') && finite('w') && finite('h')
    && typeof v.hidden === 'boolean' && typeof v.max === 'boolean'
    && flag('docked') && flag('fit')
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
    // Layouts saved before auto-fit carry no docked/fit flags: start stacked.
    if (isWin(w)) windows[id] = { x: w.x + shift, y: w.y, w: w.w, h: w.h, hidden: w.hidden, max: w.max, docked: w.docked ?? true, fit: w.fit ?? true }
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
