import { render, fireEvent } from '@testing-library/svelte'
import { beforeEach, expect, test } from 'vitest'
import ThemeToggle from './ThemeToggle.svelte'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

test('it sets an explicit theme on first click and records it', async () => {
  const { getByRole } = render(ThemeToggle)
  await fireEvent.click(getByRole('button'))

  const theme = document.documentElement.getAttribute('data-theme')
  expect(theme === 'dark' || theme === 'light').toBe(true)
  expect(localStorage.getItem('kiiyo-theme')).toBe(theme)
})

test('it flips between the two themes and never lands on a third state', async () => {
  const { getByRole } = render(ThemeToggle)
  const button = getByRole('button')

  await fireEvent.click(button)
  const first = document.documentElement.getAttribute('data-theme')
  await fireEvent.click(button)
  const second = document.documentElement.getAttribute('data-theme')

  expect(second).not.toBe(first)
  expect(second === 'dark' || second === 'light').toBe(true)
})

test('it exposes pressed state and a readable label', async () => {
  const { getByRole } = render(ThemeToggle)
  const button = getByRole('button')

  expect(button).toHaveAttribute('aria-pressed')
  expect(button.textContent?.trim()).not.toBe('')
})

test('it survives localStorage throwing, as in a private window', async () => {
  const original = Storage.prototype.setItem
  Storage.prototype.setItem = () => { throw new Error('denied') }

  const { getByRole } = render(ThemeToggle)
  await fireEvent.click(getByRole('button'))
  expect(document.documentElement.getAttribute('data-theme')).toBeTruthy()

  Storage.prototype.setItem = original
})
