<script lang="ts">
  import { onMount } from 'svelte'
  import type { SnapshotState } from '../snapshot'
  import {
    TITLES, WINDOW_IDS, TOP, clampAll, close, flow, front, frontId, load, minimize,
    initial, move, open, resize, save, taskbarClick, toggleMax,
    MENUBAR_H, MIN_DESK_H, TASKBAR_H, type Bounds, type OsState, type WinId,
  } from './windows'
  import { toggleTheme } from './theme'
  import type { Action } from './terminal'
  import MenuBar from './MenuBar.svelte'
  import Taskbar from './Taskbar.svelte'
  import DesktopIcons from './DesktopIcons.svelte'
  import Window from './Window.svelte'
  import Now from '../windows/Now.svelte'
  import Music from '../windows/Music.svelte'
  import Reading from '../windows/Reading.svelte'
  import Projects from '../windows/Projects.svelte'
  import Socials from '../windows/Socials.svelte'
  import Games from '../windows/Games.svelte'
  import Terminal from '../windows/Terminal.svelte'

  // Renamed locally: with a binding called `state` in scope, Svelte reads the
  // `$state` runes below as store subscriptions to it.
  let { state: snapshot }: { state: SnapshotState } = $props()

  const DESKTOP_QUERY = '(min-width: 1120px)'

  const viewWidth = () => document.documentElement.clientWidth || window.innerWidth

  let width = $state(viewWidth())
  let height = $state(window.innerHeight)
  let stacked = $state(!window.matchMedia(DESKTOP_QUERY).matches)
  let bounds: Bounds = $derived({ width, height: Math.max(height, MIN_DESK_H) - MENUBAR_H - TASKBAR_H })

  // Raw: every update replaces the object, so deep proxies buy nothing.
  let os: OsState = $state.raw(load(viewWidth()))

  function apply(next: OsState) {
    if (next === os) return
    os = next
    save(next, width)
  }

  function onaction(a: Action) {
    if (a.type === 'open') apply(open(os, a.id))
    else if (a.type === 'theme') toggleTheme()
    else if (a.type === 'tidy') apply(initial(width))
  }

  // Stacked mode ignores geometry, so it never clamps it: clamping to a phone
  // width and then saving on the next tap would squash the desktop layout.
  function fit() {
    if (!stacked) os = clampAll(os, bounds)
  }

  onMount(() => {
    fit()
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onQuery = () => {
      stacked = !mq.matches
      fit()
    }
    // Fitted to this viewport but not saved, so a layout made on a big
    // monitor survives a visit from a small one.
    const onResize = () => {
      width = viewWidth()
      height = window.innerHeight
      fit()
    }
    mq.addEventListener('change', onQuery)
    window.addEventListener('resize', onResize)
    return () => {
      mq.removeEventListener('change', onQuery)
      window.removeEventListener('resize', onResize)
    }
  })

  let top = $derived(frontId(os))

  // Measured heights are layout, not state: never saved, re-measured on load.
  let heights = $state<Partial<Record<WinId, number>>>({})
  let placed = $derived(flow(os, heights, width))

  function measured(id: WinId, h: number) {
    if (heights[id] !== h) heights = { ...heights, [id]: h }
  }

  // The desktop grows to hold its lowest window, so nothing is cut off.
  let deskH = $derived(Math.max(
    height,
    MIN_DESK_H,
    ...WINDOW_IDS.filter((id) => !os.windows[id].hidden)
      .map((id) => placed[id].y + placed[id].h + TOP + MENUBAR_H + TASKBAR_H),
  ))
</script>

<div class="desktop" class:stacked style:min-height={stacked ? null : `${deskH}px`}>
  <MenuBar ontidy={() => apply(initial(width))} updatedAt={snapshot.updatedAt} offline={snapshot.status === 'ready' && snapshot.error !== null} />

  <main class="area">
    {#if !stacked}
      <DesktopIcons onopen={(id) => apply(open(os, id))} />
    {/if}

    {#each WINDOW_IDS as id (id)}
      <Window
        {id}
        title={TITLES[id]}
        win={{ ...os.windows[id], ...placed[id] }}
        maxH={Math.max(bounds.height, deskH - MENUBAR_H - TASKBAR_H) - placed[id].y}
        z={os.order.indexOf(id) + 1}
        focused={top === id}
        {stacked}
        onfront={() => apply(front(os, id))}
        onminimize={() => apply(minimize(os, id))}
        onclose={() => apply(close(os, id, width))}
        onmax={() => apply(toggleMax(os, id))}
        onmove={(x, y) => { os = move(os, id, x, y, bounds) }}
        onresize={(w, h) => { os = resize(os, id, w, h, bounds) }}
        onsettle={() => save(os, width)}
        onmeasure={(h) => measured(id, h)}
        dark={id === 'terminal'}
      >
        {#if id === 'now'}<Now state={snapshot} />
        {:else if id === 'music'}<Music state={snapshot} />
        {:else if id === 'reading'}<Reading state={snapshot} />
        {:else if id === 'projects'}<Projects />
        {:else if id === 'socials'}<Socials />
        {:else if id === 'games'}<Games state={snapshot} />
        {:else}<Terminal state={snapshot} {onaction} />
        {/if}
      </Window>
    {/each}
  </main>

  <Taskbar {os} onclick={(id) => apply(taskbarClick(os, id))} />
</div>

<style>
  .desktop {
    position: relative;
    min-height: max(100vh, 700px);
  }
  .area {
    position: absolute;
    top: var(--menubar-h);
    bottom: var(--taskbar-h);
    left: 0;
    right: 0;
  }

  .stacked { min-height: 100vh; }
  .stacked .area {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: var(--s4);
    /* 52px stacked taskbar plus breathing room. */
    padding: var(--s4) 16px calc(52px + var(--s4));
  }
  @media (max-width: 720px) {
    .stacked .area { grid-template-columns: minmax(0, 1fr); }
  }
</style>
