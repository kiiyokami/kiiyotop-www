import { fireEvent, render } from '@testing-library/svelte'
import { expect, test, vi } from 'vitest'
import type { SnapshotState } from '../snapshot'
import Terminal from './Terminal.svelte'

const state: SnapshotState = {
  status: 'ready',
  error: null,
  data: {
    now: { discord: null, listening: null, playing: null },
    lastfm: null, steam: null, cs2: null, osu: null, vndb: null,
  },
}

async function type(input: HTMLElement, value: string) {
  await fireEvent.input(input, { target: { value } })
  await fireEvent.submit(input.closest('form')!)
}

test('runs a command and prints the echo and the output', async () => {
  const { getByRole, getByText } = render(Terminal, { props: { state, onaction: vi.fn() } })
  await type(getByRole('textbox', { name: 'terminal command' }), 'whoami')
  expect(getByText('kiiyo@top ~ $ whoami')).toBeInTheDocument()
  expect(getByText('kiiyo')).toBeInTheDocument()
})

test('markup typed into the terminal stays inert text', async () => {
  const { getByRole, container } = render(Terminal, { props: { state, onaction: vi.fn() } })
  await type(getByRole('textbox', { name: 'terminal command' }), '<img src=x onerror=alert(1)>')
  expect(container.querySelector('img')).toBeNull()
  expect(container.textContent).toContain('<img src=x onerror=alert(1)>: not found')
})

test('forwards window actions to the desktop', async () => {
  const onaction = vi.fn()
  const { getByRole } = render(Terminal, { props: { state, onaction } })
  await type(getByRole('textbox', { name: 'terminal command' }), 'projects')
  expect(onaction).toHaveBeenCalledWith({ type: 'open', id: 'projects' })
})

test('clear empties the log without telling the desktop', async () => {
  const onaction = vi.fn()
  const { getByRole, container } = render(Terminal, { props: { state, onaction } })
  const input = getByRole('textbox', { name: 'terminal command' })
  await type(input, 'whoami')
  await type(input, 'clear')
  expect(container.querySelectorAll('.log p')).toHaveLength(0)
  expect(onaction).not.toHaveBeenCalled()
})

test('the input empties after each command', async () => {
  const { getByRole } = render(Terminal, { props: { state, onaction: vi.fn() } })
  const input = getByRole('textbox', { name: 'terminal command' }) as HTMLInputElement
  await type(input, 'help')
  expect(input.value).toBe('')
})

test('clicking anywhere in the terminal takes the caret', async () => {
  const { getByRole, container } = render(Terminal, { props: { state, onaction: vi.fn() } })
  await fireEvent.click(container.querySelector('.log')!)
  expect(document.activeElement).toBe(getByRole('textbox', { name: 'terminal command' }))
})

test('up and down walk the commands already run', async () => {
  const { getByRole } = render(Terminal, { props: { state, onaction: vi.fn() } })
  const input = getByRole('textbox', { name: 'terminal command' }) as HTMLInputElement
  await type(input, 'whoami')
  await type(input, 'ls')

  await fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input.value).toBe('ls')
  await fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input.value).toBe('whoami')
  await fireEvent.keyDown(input, { key: 'ArrowUp' })
  expect(input.value).toBe('whoami')

  await fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input.value).toBe('ls')
  await fireEvent.keyDown(input, { key: 'ArrowDown' })
  expect(input.value).toBe('')
})
