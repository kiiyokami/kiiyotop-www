import { fireEvent, render } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MenuBar from './MenuBar.svelte'
import Taskbar from './Taskbar.svelte'
import DesktopIcons from './DesktopIcons.svelte'
import { WINDOW_IDS, initial, minimize } from './windows'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('MenuBar', () => {
  it('shows the wordmark and tidies up on request', async () => {
    const ontidy = vi.fn()
    const { getByRole, container } = render(MenuBar, { props: { ontidy } })
    expect(container.querySelector('h1')?.textContent).toBe('kiiyoOS')
    await fireEvent.click(getByRole('button', { name: 'tidy up' }))
    expect(ontidy).toHaveBeenCalledOnce()
  })

  it('flips the theme and reflects it in the label and pressed state', async () => {
    const { getByRole } = render(MenuBar, { props: { ontidy: vi.fn() } })
    const button = getByRole('button', { name: /^theme:/ })
    const before = button.textContent
    await fireEvent.click(button)
    expect(button.textContent).not.toBe(before)
    expect(button).toHaveAttribute('aria-pressed')
  })
})

describe('Taskbar', () => {
  it('lists every window in order and marks hidden ones for screen readers', () => {
    const os = minimize(initial(1300), 'music')
    const { getAllByRole } = render(Taskbar, { props: { os, onclick: vi.fn() } })
    const buttons = getAllByRole('button')
    expect(buttons).toHaveLength(WINDOW_IDS.length)
    expect(buttons[0].textContent).toContain('now.txt')
    expect(buttons[1].textContent).toContain('hidden')
    expect(buttons[0].textContent).not.toContain('hidden')
  })

  it('reports which window was clicked', async () => {
    const onclick = vi.fn()
    const { getAllByRole } = render(Taskbar, { props: { os: initial(1300), onclick } })
    await fireEvent.click(getAllByRole('button')[2])
    expect(onclick).toHaveBeenCalledWith('reading')
  })
})

describe('DesktopIcons', () => {
  it('has one icon per window plus a GitHub link', () => {
    const { getAllByRole, getByRole } = render(DesktopIcons, { props: { onopen: vi.fn() } })
    expect(getAllByRole('button')).toHaveLength(WINDOW_IDS.length)
    expect(getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/kiiyokami')
  })

  it('sits at the desktop edge, not offset into the centred work area', () => {
    const { container } = render(DesktopIcons, { props: { onopen: vi.fn() } })
    expect(container.querySelector('.icons')).not.toHaveAttribute('style')
  })

  it('a mouse single click selects, a double click opens', async () => {
    const onopen = vi.fn()
    const { getByRole } = render(DesktopIcons, { props: { onopen } })
    const icon = getByRole('button', { name: 'music' })
    await fireEvent.pointerDown(icon, { pointerType: 'mouse' })
    await fireEvent.click(icon, { detail: 1 })
    expect(onopen).not.toHaveBeenCalled()
    await fireEvent.dblClick(icon)
    expect(onopen).toHaveBeenCalledWith('music')
  })

  it('keyboard activation and touch taps open straight away', async () => {
    const onopen = vi.fn()
    const { getByRole } = render(DesktopIcons, { props: { onopen } })
    await fireEvent.click(getByRole('button', { name: 'games' }), { detail: 0 })
    expect(onopen).toHaveBeenLastCalledWith('games')
    const reading = getByRole('button', { name: 'reading' })
    await fireEvent.pointerDown(reading, { pointerType: 'touch' })
    await fireEvent.click(reading, { detail: 1 })
    expect(onopen).toHaveBeenLastCalledWith('reading')
  })
})
