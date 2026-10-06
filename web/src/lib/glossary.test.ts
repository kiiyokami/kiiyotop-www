import { expect, it } from 'vitest'
import { HINTS } from './glossary'

it('explains every stat a non-player would not know', () => {
  for (const k of ['Premier', 'Leetify rating', 'Aim', 'Utility', 'Positioning', 'Opening duels', 'Clutch', 'pp', 'Global rank', 'SS / S / A']) {
    expect(HINTS[k], k).toBeTruthy()
  }
})

it('keeps each hint to one short sentence', () => {
  for (const [k, v] of Object.entries(HINTS)) {
    expect(v.length, k).toBeLessThan(110)
    expect(v, k).not.toContain('—')
  }
})
