import { fireEvent, render } from '@testing-library/svelte'
import { beforeEach, expect, test } from 'vitest'
import type { SnapshotState } from '../snapshot'
import Desktop from './Desktop.svelte'
import { STORAGE_KEY, TITLES, WINDOW_IDS } from './windows'

const state: SnapshotState = {
  status: 'ready',
  error: null,
  data: {
    now: { discord: null, listening: null, playing: null },
    lastfm: null, steam: null, cs2: null, osu: null, vndb: null, github: null,
  },
}

beforeEach(() => localStorage.clear())

test('every window is open on first visit, in the fixed order', () => {
  const { getAllByRole } = render(Desktop, { props: { state } })
  const names = getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))
  expect(names).toEqual(WINDOW_IDS.map((id) => `win-${id}-title`))
})

test('a closed window comes back from the taskbar', async () => {
  const { getByRole, queryByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'Close music' }))
  expect(queryByRole('region', { name: 'music' })).toBeNull()
  await fireEvent.click(getByRole('button', { name: 'music, hidden' }))
  expect(getByRole('region', { name: 'music' })).toBeInTheDocument()
})

test('the layout is saved after a change', async () => {
  const { getByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'Minimize reading' }))
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
  expect(saved.windows.reading.hidden).toBe(true)
})

test('tidy up reopens everything', async () => {
  const { getByRole, getAllByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'Close games' }))
  await fireEvent.click(getByRole('button', { name: 'Close socials' }))
  await fireEvent.click(getByRole('button', { name: 'tidy up' }))
  expect(getAllByRole('region')).toHaveLength(WINDOW_IDS.length)
})

test('the terminal can reopen a closed window', async () => {
  const { getByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: `Close ${TITLES.projects}` }))
  const input = getByRole('textbox', { name: 'terminal command' })
  await fireEvent.input(input, { target: { value: 'projects' } })
  await fireEvent.submit(input.closest('form')!)
  expect(getByRole('region', { name: 'projects' })).toBeInTheDocument()
})
