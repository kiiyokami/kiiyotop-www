import { expect, test } from 'vitest'
import { stageContent } from './stage'
import type { Now } from './types'

const empty: Now = { discord: null, listening: null, playing: null }

test('a live track takes the stage', () => {
  const now: Now = {
    ...empty,
    listening: { name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: true },
  }
  const c = stageContent(now)
  expect(c.label).toBe('1  Now listening')
  expect(c.headline).toBe('Ame wo Matsu')
  expect(c.sub).toBe('Lamp')
  expect(c.empty).toBe(false)
})

test('a game takes the stage when nothing is playing musically', () => {
  const now: Now = { ...empty, playing: { name: 'Counter-Strike 2', app_id: '730' } }
  const c = stageContent(now)
  expect(c.label).toBe('1  Now playing')
  expect(c.headline).toBe('Counter-Strike 2')
  expect(c.sub).toBeNull()
})

test('a track outranks a game, because music is the finer-grained signal', () => {
  const now: Now = {
    discord: null,
    listening: { name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: true },
    playing: { name: 'Counter-Strike 2', app_id: '730' },
  }
  expect(stageContent(now).headline).toBe('Ame wo Matsu')
})

test('a non-live scrobble is history, not the stage', () => {
  const now: Now = {
    ...empty,
    listening: { name: 'Old Song', artist: 'Lamp', art: null, live: false },
  }
  const c = stageContent(now)
  expect(c.empty).toBe(true)
  expect(c.headline).toBe('Nothing playing right now.')
})

test('the empty stage states its case at full size and invents nothing', () => {
  const c = stageContent(empty)
  expect(c.label).toBe('1  Now')
  expect(c.headline).toBe('Nothing playing right now.')
  expect(c.sub).toBeNull()
  expect(c.empty).toBe(true)
})

test('a null now, meaning the whole fetch failed, reads the same as empty', () => {
  expect(stageContent(null).headline).toBe('Nothing playing right now.')
})

test('the context line carries only facts that exist', () => {
  const now: Now = {
    discord: { name: 'kiiyo', status: 'online', activity: 'Counter-Strike 2' },
    listening: { name: 'Ame wo Matsu', artist: 'Lamp', art: null, live: true },
    playing: { name: 'Counter-Strike 2', app_id: '730' },
  }
  const c = stageContent(now)
  // The game appears once, not twice, even though two sources report it.
  expect(c.context.filter(s => s.includes('Counter-Strike 2'))).toHaveLength(1)
  expect(c.context.some(s => s.includes('undefined'))).toBe(false)
})

test('the context line is empty rather than padded when nothing is known', () => {
  expect(stageContent(empty).context).toEqual([])
})
