import { afterEach, describe, expect, it } from 'vitest'
import {
  WINDOW_IDS, MIN_DESK_H, MENUBAR_H, TASKBAR_H, GRAB, MIN_W, MIN_H, TITLE_H, STORAGE_KEY,
  initial, tidy, flow, GAP, TOP, defaultGeom, workOffset, front, frontId, open, minimize, close, toggleMax,
  taskbarClick, move, resize, clampAll, serialize, parse, load, save,
} from './windows'

const W = 1300 // work-area offset of 100
const B = { width: 1300, height: 584 }

describe('initial layout', () => {
  it('opens now.txt and the terminal on first visit, with now.txt in front', () => {
    const s = initial(W)
    expect(WINDOW_IDS.filter((id) => !s.windows[id].hidden)).toEqual(['now', 'terminal'])
    expect(frontId(s)).toBe('now')
    expect(s.order).toHaveLength(WINDOW_IDS.length)
  })

  it('tidy opens every window in its default spot, with now.txt in front', () => {
    const s = tidy(W)
    expect(WINDOW_IDS.every((id) => !s.windows[id].hidden)).toBe(true)
    expect(s.windows.games).toMatchObject(defaultGeom('games', W))
    expect(frontId(s)).toBe('now')
  })

  it('centres the 1100px work area and never offsets negatively', () => {
    expect(workOffset(1300)).toBe(100)
    expect(workOffset(900)).toBe(0)
    expect(defaultGeom('now', 1300)).toEqual({ x: 200, y: 18, w: 470, h: 140 })
  })
})

describe('tidy layout', () => {
  it('gives games the wide slot for its detail views, and socials room for four rows', () => {
    expect(defaultGeom('games', W)).toMatchObject({ w: 480, h: 230 })
    expect(defaultGeom('socials', W).h).toBeGreaterThanOrEqual(156)
  })

  it('fits the startup desktop inside the minimum desktop height', () => {
    const area = MIN_DESK_H - MENUBAR_H - TASKBAR_H
    const s = initial(W)
    const g = flow(s, {}, W)
    for (const id of WINDOW_IDS.filter((i) => !s.windows[i].hidden)) {
      expect(g[id].y + g[id].h, id).toBeLessThanOrEqual(area)
    }
  })

  it('gives the terminal the full right-column width, at the top on startup', () => {
    expect(defaultGeom('terminal', W)).toMatchObject({ x: defaultGeom('games', W).x, w: 480 })
    expect(defaultGeom('terminal', W).h).toBeGreaterThanOrEqual(260)
    expect(flow(initial(W), {}, W).terminal.y).toBe(TOP)
  })

  it('stores layouts under a new key, so saves from before startup opened the terminal are ignored', () => {
    expect(STORAGE_KEY).toBe('kiiyoOS:v2')
  })

  it('gives reading the wide slot under now.txt', () => {
    expect(defaultGeom('reading', W)).toMatchObject({ w: 470, h: 220 })
  })

  it('never overlaps two windows', () => {
    const g = WINDOW_IDS.map((id) => defaultGeom(id, W))
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const a = g[i], b = g[j]
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
        expect(apart, `${WINDOW_IDS[i]} overlaps ${WINDOW_IDS[j]}`).toBe(true)
      }
    }
  })
})

describe('auto-fit and stacking', () => {
  const H = { now: 100, reading: 300, music: 150, games: 400, projects: 250, socials: 120, terminal: 160 }

  it('tidy docks every window and fits it to its content', () => {
    const s = tidy(W)
    for (const id of WINDOW_IDS) expect(s.windows[id]).toMatchObject({ docked: true, fit: true })
  })

  it('stacks docked windows in their column using measured heights', () => {
    const g = flow(tidy(W), H, W)
    expect(g.now.y).toBe(TOP)
    expect(g.reading.y).toBe(TOP + 100 + GAP)
    expect(g.music.y).toBe(TOP + 100 + GAP + 300 + GAP)
    expect(g.projects.y).toBe(TOP + 400 + GAP)
    expect(g.socials.y).toBe(TOP + 400 + GAP + 250 + GAP)
    expect(g.terminal.y).toBe(g.socials.y + 120 + GAP)
    expect(g.reading.h).toBe(300)
  })

  it('lets windows below move up when one above is hidden', () => {
    const g = flow(minimize(tidy(W), 'reading'), H, W)
    expect(g.music.y).toBe(TOP + 100 + GAP)
  })

  it('takes a dragged window out of the stack and closes the gap it left', () => {
    const s = move(tidy(W), 'reading', 900, 300, B)
    expect(s.windows.reading.docked).toBe(false)
    const g = flow(s, H, W)
    expect(g.reading).toMatchObject({ x: 900, y: 300 })
    expect(g.music.y).toBe(TOP + 100 + GAP)
  })

  it('uses the default height until a window has been measured', () => {
    const g = flow(tidy(W), {}, W)
    expect(g.reading.y).toBe(TOP + defaultGeom('now', W).h + GAP)
  })

  it('never overlaps two docked windows, whatever their heights', () => {
    for (const heights of [H, {}, { now: 600, games: 50, projects: 700 }]) {
      const g = flow(tidy(W), heights, W)
      for (let i = 0; i < WINDOW_IDS.length; i++) {
        for (let j = i + 1; j < WINDOW_IDS.length; j++) {
          const a = g[WINDOW_IDS[i]], b = g[WINDOW_IDS[j]]
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
          expect(apart, `${WINDOW_IDS[i]} overlaps ${WINDOW_IDS[j]}`).toBe(true)
        }
      }
    }
  })

  it('resizing by hand turns auto-fit off; close and tidy turn it back on', () => {
    const resized = resize(tidy(W), 'music', 400, 300, B)
    expect(resized.windows.music.fit).toBe(false)
    expect(close(resized, 'music', W).windows.music.fit).toBe(true)
  })

  it('loads a layout saved before auto-fit as docked and fitted', () => {
    const raw = JSON.stringify({ windows: { music: { x: 1, y: 2, w: 300, h: 200, hidden: false, max: false } }, order: [] })
    expect(parse(raw, W).windows.music).toMatchObject({ docked: true, fit: true })
  })
})

describe('window actions', () => {
  it('minimize hides and keeps where the window was', () => {
    const moved = move(tidy(W), 'music', 500, 300, B)
    const s = minimize(moved, 'music')
    expect(s.windows.music).toMatchObject({ hidden: true, x: 500, y: 300 })
  })

  it('close hides and puts the window back in its tidy spot', () => {
    const moved = move(tidy(W), 'music', 500, 300, B)
    const s = close(toggleMax(moved, 'music'), 'music', W)
    expect(s.windows.music).toEqual({ ...defaultGeom('music', W), hidden: true, max: false, docked: true, fit: true })
  })

  it('open unhides and brings to front', () => {
    const s = open(minimize(tidy(W), 'games'), 'games')
    expect(s.windows.games.hidden).toBe(false)
    expect(frontId(s)).toBe('games')
  })

  it('front reorders without touching geometry, and is a no-op for the front window', () => {
    const s0 = tidy(W)
    const s1 = front(s0, 'music')
    expect(frontId(s1)).toBe('music')
    expect(s1.windows).toBe(s0.windows)
    expect(front(s1, 'music')).toBe(s1)
  })

  it('toggleMax flips max and brings the window to front', () => {
    const s = toggleMax(tidy(W), 'projects')
    expect(s.windows.projects.max).toBe(true)
    expect(frontId(s)).toBe('projects')
    expect(toggleMax(s, 'projects').windows.projects.max).toBe(false)
  })

  it('frontId skips hidden windows and is null when every window is hidden', () => {
    let s = minimize(tidy(W), 'now')
    expect(frontId(s)).not.toBe('now')
    for (const id of WINDOW_IDS) s = minimize(s, id)
    expect(frontId(s)).toBeNull()
  })

  it('taskbar click cycles hidden, front, minimized', () => {
    let s = minimize(tidy(W), 'music')
    s = taskbarClick(s, 'music')
    expect(s.windows.music.hidden).toBe(false)
    expect(frontId(s)).toBe('music')
    s = taskbarClick(s, 'music')
    expect(s.windows.music.hidden).toBe(true)
  })

  it('taskbar click on an open window behind others brings it forward', () => {
    const s = taskbarClick(tidy(W), 'reading')
    expect(s.windows.reading.hidden).toBe(false)
    expect(frontId(s)).toBe('reading')
  })

  it('reopens from the taskbar after every window has been closed', () => {
    let s = tidy(W)
    for (const id of WINDOW_IDS) s = close(s, id, W)
    s = taskbarClick(s, 'socials')
    expect(s.windows.socials.hidden).toBe(false)
    expect(frontId(s)).toBe('socials')
  })
})

describe('clamping', () => {
  it('keeps at least GRAB px of a window inside the desktop horizontally', () => {
    const right = move(tidy(W), 'music', 5000, 50, B)
    expect(right.windows.music.x).toBe(B.width - GRAB)
    const left = move(tidy(W), 'music', -5000, 50, B)
    expect(left.windows.music.x).toBe(GRAB - left.windows.music.w)
  })

  it('keeps the title bar between the menu bar and the taskbar', () => {
    expect(move(tidy(W), 'music', 300, -50, B).windows.music.y).toBe(0)
    expect(move(tidy(W), 'music', 300, 9999, B).windows.music.y).toBe(B.height - TITLE_H)
  })

  it('enforces the minimum size', () => {
    const s = resize(tidy(W), 'music', 10, 10, B)
    expect(s.windows.music.w).toBe(MIN_W)
    expect(s.windows.music.h).toBe(MIN_H)
  })

  it('pulls a layout saved on a big monitor back within reach on a small one', () => {
    const big = move(initial(2560), 'games', 2300, 900, { width: 2560, height: 1300 })
    const small = clampAll(big, { width: 1280, height: 600 })
    expect(small.windows.games.x).toBeLessThanOrEqual(1280 - GRAB)
    expect(small.windows.games.y).toBeLessThanOrEqual(600 - TITLE_H)
  })
})

describe('moving between screen sizes', () => {
  it('keeps a saved window in the same place relative to the centred work area', () => {
    save(initial(2560), 2560)
    const loaded = load(1280)
    expect(loaded.windows.now.x).toBe(defaultGeom('now', 1280).x)
    expect(loaded.windows.games.x).toBe(defaultGeom('games', 1280).x)
    localStorage.clear()
  })

  it('clampAll brings whole windows back on screen, not just their title bars', () => {
    const b = { width: 1280, height: 600 }
    const moved = move(initial(2560), 'games', 2300, 900, { width: 2560, height: 1300 })
    const s = clampAll(moved, b)
    for (const id of WINDOW_IDS) {
      const w = s.windows[id]
      expect(w.x).toBeGreaterThanOrEqual(0)
      expect(w.x + w.w).toBeLessThanOrEqual(b.width)
      expect(w.y + w.h).toBeLessThanOrEqual(b.height)
    }
  })
})

describe('persistence', () => {
  afterEach(() => localStorage.clear())

  it('round-trips through serialize and parse', () => {
    const s = minimize(move(initial(W), 'music', 400, 200, B), 'reading')
    expect(parse(serialize(s, W), W)).toEqual(s)
  })

  it('falls back to the tidy layout on missing or garbage data', () => {
    expect(parse(null, W)).toEqual(initial(W))
    expect(parse('not json', W)).toEqual(initial(W))
    expect(parse('{"windows":5}', W)).toEqual(initial(W))
    expect(parse('[]', W)).toEqual(initial(W))
  })

  it('keeps valid windows, defaults the rest, and drops unknown ids', () => {
    const raw = JSON.stringify({
      windows: {
        music: { x: 1, y: 2, w: 300, h: 200, hidden: true, max: false },
        games: { x: 'a', y: 2, w: 300, h: 200, hidden: false, max: false },
        bogus: { x: 1, y: 2, w: 300, h: 200, hidden: false, max: false },
      },
      order: ['bogus', 'music', 'music'],
    })
    const s = parse(raw, W)
    expect(s.windows.music).toEqual({ x: 1, y: 2, w: 300, h: 200, hidden: true, max: false, docked: true, fit: true })
    expect(s.windows.games).toEqual({ ...defaultGeom('games', W), hidden: true, max: false, docked: true, fit: true })
    expect(s.order).toHaveLength(WINDOW_IDS.length)
    expect(s.order).not.toContain('bogus')
    expect(s.order[s.order.length - 1]).toBe('music')
  })

  it('save then load restores the layout', () => {
    save(minimize(initial(W), 'music'), W)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(load(W).windows.music.hidden).toBe(true)
  })

  it('load falls back to the tidy layout when storage throws', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => { throw new Error('denied') }
    try {
      expect(load(W)).toEqual(initial(W))
    } finally {
      Storage.prototype.getItem = original
    }
  })

  it('save does not throw when storage throws', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('denied') }
    try {
      expect(() => save(initial(W), W)).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })
})
