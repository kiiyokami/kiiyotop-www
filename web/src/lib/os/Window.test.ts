import { fireEvent, render } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { expect, test, vi } from 'vitest'
import Window from './Window.svelte'

const body = createRawSnippet(() => ({ render: () => '<p>window body</p>' }))

function setup(over: Record<string, unknown> = {}) {
  const props = {
    id: 'music' as const,
    title: 'music',
    win: { x: 100, y: 50, w: 300, h: 200, hidden: false, max: false, docked: true, fit: false },
    z: 3,
    focused: false,
    stacked: false,
    onfront: vi.fn(), onminimize: vi.fn(), onclose: vi.fn(), onmax: vi.fn(),
    onmove: vi.fn(), onresize: vi.fn(), onsettle: vi.fn(), onmeasure: vi.fn(),
    maxH: 500,
    children: body,
    ...over,
  }
  return { props, ...render(Window, { props }) }
}

test('is a region named by its title, with its content inside', () => {
  const { getByRole, getByText } = setup()
  expect(getByRole('region', { name: 'music' })).toBeInTheDocument()
  expect(getByText('window body')).toBeInTheDocument()
})

test('controls are labelled buttons wired to their handlers', async () => {
  const { getByRole, props } = setup()
  await fireEvent.click(getByRole('button', { name: 'Minimize music' }))
  await fireEvent.click(getByRole('button', { name: 'Maximize music' }))
  await fireEvent.click(getByRole('button', { name: 'Close music' }))
  expect(props.onminimize).toHaveBeenCalledOnce()
  expect(props.onmax).toHaveBeenCalledOnce()
  expect(props.onclose).toHaveBeenCalledOnce()
})

test('the maximize control offers restore when maximized', () => {
  const { getByRole } = setup({ win: { x: 0, y: 0, w: 300, h: 200, hidden: false, max: true, docked: true, fit: false } })
  expect(getByRole('button', { name: 'Restore music' })).toBeInTheDocument()
})

test('double-clicking the title bar toggles maximize', async () => {
  const { container, props } = setup()
  await fireEvent.dblClick(container.querySelector('header')!)
  expect(props.onmax).toHaveBeenCalledOnce()
})

test('stacked mode drops maximize, ignores double-click and drag', async () => {
  const { container, queryByRole, props } = setup({ stacked: true })
  expect(queryByRole('button', { name: 'Maximize music' })).toBeNull()
  const bar = container.querySelector('header')!
  await fireEvent.dblClick(bar)
  await fireEvent.pointerDown(bar, { clientX: 110, clientY: 60, button: 0, pointerId: 1 })
  await fireEvent.pointerMove(bar, { clientX: 150, clientY: 90, pointerId: 1 })
  expect(props.onmax).not.toHaveBeenCalled()
  expect(props.onmove).not.toHaveBeenCalled()
})

test('a hidden window carries the hidden attribute', () => {
  const { container } = setup({ win: { x: 0, y: 0, w: 300, h: 200, hidden: true, max: false, docked: true, fit: false } })
  expect(container.querySelector('section')).toHaveAttribute('hidden')
})

test('dragging the title bar reports positions, then settles once', async () => {
  const { container, props } = setup()
  const bar = container.querySelector('header')!
  await fireEvent.pointerDown(bar, { clientX: 110, clientY: 60, button: 0, pointerId: 1 })
  await fireEvent.pointerMove(bar, { clientX: 150, clientY: 90, pointerId: 1 })
  expect(props.onmove).toHaveBeenLastCalledWith(140, 80)
  await fireEvent.pointerUp(bar, { pointerId: 1 })
  expect(props.onsettle).toHaveBeenCalledOnce()
  await fireEvent.pointerMove(bar, { clientX: 300, clientY: 300, pointerId: 1 })
  expect(props.onmove).toHaveBeenCalledOnce()
})

test('pressing a control does not start a drag', async () => {
  const { getByRole, container, props } = setup()
  await fireEvent.pointerDown(getByRole('button', { name: 'Close music' }), { clientX: 5, clientY: 5, button: 0, pointerId: 1 })
  await fireEvent.pointerMove(container.querySelector('header')!, { clientX: 50, clientY: 50, pointerId: 1 })
  expect(props.onmove).not.toHaveBeenCalled()
})

test('dragging the corner grip reports sizes', async () => {
  const { container, props } = setup()
  const grip = container.querySelector('.rz')!
  await fireEvent.pointerDown(grip, { clientX: 400, clientY: 250, button: 0, pointerId: 2 })
  await fireEvent.pointerMove(grip, { clientX: 450, clientY: 270, pointerId: 2 })
  expect(props.onresize).toHaveBeenLastCalledWith(350, 220)
  await fireEvent.pointerUp(grip, { pointerId: 2 })
  expect(props.onsettle).toHaveBeenCalledOnce()
})

test('focus entering the window brings it to front', async () => {
  const { getByRole, props } = setup()
  await fireEvent.focusIn(getByRole('button', { name: 'Close music' }))
  expect(props.onfront).toHaveBeenCalled()
})

test('a fitted window leaves its height to its content, capped by the space left', () => {
  const { container } = setup({ win: { x: 100, y: 50, w: 300, h: 200, hidden: false, max: false, docked: true, fit: true } })
  const section = container.querySelector('section') as HTMLElement
  expect(section.style.height).toBe('')
  expect(section.style.maxHeight).toBe('500px')
})

test('a window resized by hand keeps its height', () => {
  const { container } = setup()
  expect((container.querySelector('section') as HTMLElement).style.height).toBe('200px')
})

test('a window can force the dark palette regardless of the theme', () => {
  const { container } = setup({ dark: true })
  expect(container.querySelector('section')).toHaveClass('force-dark')
})

test('windows follow the theme by default', () => {
  const { container } = setup()
  expect(container.querySelector('section')).not.toHaveClass('force-dark')
})
