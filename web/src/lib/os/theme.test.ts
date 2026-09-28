import { get } from 'svelte/store'
import { beforeEach, expect, test } from 'vitest'
import { THEME_KEY, syncTheme, theme, toggleTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

test('toggling sets an explicit theme and records it for the pre-paint script', () => {
  const next = toggleTheme()
  expect(document.documentElement.getAttribute('data-theme')).toBe(next)
  expect(localStorage.getItem(THEME_KEY)).toBe(next)
})

test('it flips between the two themes and never lands on a third state', () => {
  const first = toggleTheme()
  const second = toggleTheme()
  expect(second).not.toBe(first)
  expect(['light', 'dark']).toContain(second)
})

test('the store follows toggles', () => {
  syncTheme()
  const before = get(theme)
  toggleTheme()
  expect(get(theme)).not.toBe(before)
})

test('syncTheme reads an explicit theme from the document', () => {
  document.documentElement.setAttribute('data-theme', 'dark')
  syncTheme()
  expect(get(theme)).toBe('dark')
})

test('it survives localStorage throwing, as in a private window', () => {
  const original = Storage.prototype.setItem
  Storage.prototype.setItem = () => { throw new Error('denied') }
  try {
    expect(() => toggleTheme()).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBeTruthy()
  } finally {
    Storage.prototype.setItem = original
  }
})
