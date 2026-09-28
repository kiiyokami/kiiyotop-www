import { fireEvent, render } from '@testing-library/svelte'
import { beforeEach, expect, test } from 'vitest'
import type { SnapshotState } from '../snapshot'
import Desktop from './Desktop.svelte'
import { STORAGE_KEY, TITLES, WINDOW_IDS, initial, load, serialize } from './windows'

const state: SnapshotState = {
  status: 'ready',
  error: null,
  data: {
    now: { discord: null, listening: null, playing: null },
    lastfm: null, steam: null, cs2: null, osu: null, vndb: null, github: null,
  },
}

beforeEach(() => localStorage.clear())

test('only now.txt is open on first visit', () => {
  const { getAllByRole } = render(Desktop, { props: { state } })
  const names = getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))
  expect(names).toEqual(['win-now-title'])
})

test('a closed window comes back from the taskbar', async () => {
  const { getByRole, queryByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'music, hidden' }))
  expect(getByRole('region', { name: 'music' })).toBeInTheDocument()
  await fireEvent.click(getByRole('button', { name: 'Close music' }))
  expect(queryByRole('region', { name: 'music' })).toBeNull()
  await fireEvent.click(getByRole('button', { name: 'music, hidden' }))
  expect(getByRole('region', { name: 'music' })).toBeInTheDocument()
})

test('the layout is saved after a change', async () => {
  const { getByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'Minimize now.txt' }))
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
  expect(saved.windows.now.hidden).toBe(true)
})

test('tidy up opens every window', async () => {
  const { getByRole, getAllByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'tidy up' }))
  expect(getAllByRole('region')).toHaveLength(WINDOW_IDS.length)
})

test('the terminal can reopen a closed window', async () => {
  const { getByRole, queryByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'terminal, hidden' }))
  expect(queryByRole('region', { name: TITLES.projects })).toBeNull()
  const input = getByRole('textbox', { name: 'terminal command' })
  await fireEvent.input(input, { target: { value: 'projects' } })
  await fireEvent.submit(input.closest('form')!)
  expect(getByRole('region', { name: 'projects' })).toBeInTheDocument()
})

test('using the stacked layout does not overwrite the saved desktop layout', async () => {
  localStorage.setItem(STORAGE_KEY, serialize(initial(2560), 2560))
  const { getByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'Minimize now.txt' }))
  const back = load(2560)
  expect(back.windows.games).toEqual(initial(2560).windows.games)
  expect(back.windows.now.hidden).toBe(true)
})

test('the terminal is always dark; other windows follow the theme', async () => {
  const { getByRole } = render(Desktop, { props: { state } })
  await fireEvent.click(getByRole('button', { name: 'tidy up' }))
  expect(getByRole('region', { name: 'terminal' })).toHaveClass('force-dark')
  expect(getByRole('region', { name: 'music' })).not.toHaveClass('force-dark')
})
