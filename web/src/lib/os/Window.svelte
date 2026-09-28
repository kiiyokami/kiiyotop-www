<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { WinId, WinState } from './windows'

  let {
    id, title, win, z, focused, stacked,
    onfront, onminimize, onclose, onmax, onmove, onresize, onsettle, onmeasure,
    maxH, dark = false, children,
  }: {
    id: WinId
    title: string
    win: WinState
    z: number
    focused: boolean
    stacked: boolean
    onfront: () => void
    onminimize: () => void
    onclose: () => void
    onmax: () => void
    onmove: (x: number, y: number) => void
    onresize: (w: number, h: number) => void
    onsettle: () => void
    /** Reports the rendered height, so docked windows below can stack under it. */
    onmeasure: (h: number) => void
    /** The room left below this window's top edge; caps a fitted window. */
    maxH: number
    /** Always draw with the dark palette, whatever the theme. */
    dark?: boolean
    children: Snippet
  } = $props()

  let maxed = $derived(win.max && !stacked)
  let placed = $derived(!stacked && !maxed)
  let section: HTMLElement | undefined = $state()

  $effect(() => {
    if (!section || typeof ResizeObserver === 'undefined') return
    const el = section
    const ro = new ResizeObserver(() => onmeasure(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  })

  /** Tracks one pointer on `el` until it lifts, then settles. */
  function track(e: PointerEvent, el: HTMLElement, onpoint: (ev: PointerEvent) => void) {
    el.setPointerCapture?.(e.pointerId)
    const up = () => {
      el.removeEventListener('pointermove', onpoint)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      onsettle()
    }
    el.addEventListener('pointermove', onpoint)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  function startDrag(e: PointerEvent) {
    if (!placed || e.button !== 0) return
    if ((e.target as HTMLElement).closest('button')) return
    const dx = e.clientX - win.x
    const dy = e.clientY - win.y
    track(e, e.currentTarget as HTMLElement, (ev) => onmove(ev.clientX - dx, ev.clientY - dy))
  }

  function startResize(e: PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    // A fitted window has no stored height to start from: use what is drawn.
    const sh = win.fit ? section?.offsetHeight || win.h : win.h
    const sx = e.clientX, sy = e.clientY, sw = win.w
    track(e, e.currentTarget as HTMLElement, (ev) => onresize(sw + ev.clientX - sx, sh + ev.clientY - sy))
  }
</script>

<section
  bind:this={section}
  class="win"
  class:focused
  class:maxed
  class:stacked
  class:force-dark={dark}
  hidden={win.hidden}
  aria-labelledby="win-{id}-title"
  style:left={placed ? `${win.x}px` : null}
  style:top={placed ? `${win.y}px` : null}
  style:width={placed ? `${win.w}px` : null}
  style:height={placed && !win.fit ? `${win.h}px` : null}
  style:max-height={placed && win.fit ? `${maxH}px` : null}
  style:z-index={stacked ? null : z}
  onpointerdown={onfront}
  onfocusin={onfront}
>
  <!-- Drag and double-click-to-maximize are mouse enhancements; the control
       buttons and focusin are the keyboard path. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header class="tb" onpointerdown={startDrag} ondblclick={() => { if (!stacked) onmax() }}>
    <h2 id="win-{id}-title">{title}</h2>
    <div class="ctl">
      <button type="button" aria-label="Minimize {title}" onclick={onminimize}><span aria-hidden="true">[_]</span></button>
      {#if !stacked}
        <button type="button" aria-label="{win.max ? 'Restore' : 'Maximize'} {title}" onclick={onmax}><span aria-hidden="true">[□]</span></button>
      {/if}
      <button type="button" aria-label="Close {title}" onclick={onclose}><span aria-hidden="true">[x]</span></button>
    </div>
  </header>

  <div class="body">{@render children()}</div>

  {#if placed}
    <div class="rz" aria-hidden="true" onpointerdown={startResize}></div>
  {/if}
</section>

<style>
  .win {
    position: absolute;
    display: flex;
    flex-direction: column;
    background: var(--win);
    border: 1px solid var(--ink);
    box-shadow: 5px 5px 0 var(--shadow);
  }
  /* display:flex above would otherwise beat the UA's [hidden] rule. */
  .win[hidden] { display: none; }

  .win.maxed { left: 0; top: 0; width: 100%; height: 100%; }
  .win.stacked { position: relative; }

  .tb {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--s2);
    min-height: 24px;
    padding: 0 2px 0 var(--s2);
    background: var(--bar);
    border-bottom: 1px solid var(--ink);
    font-family: var(--mono);
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .stacked .tb, .maxed .tb { cursor: default; touch-action: auto; }
  .focused .tb { background: var(--accent); color: var(--win); }
  /* The accent focus ring would vanish on the accent title bar. */
  .focused .tb :focus-visible { outline-color: var(--win); }

  h2 { font: inherit; font-weight: 500; }

  .ctl { display: flex; }
  .ctl button {
    background: none;
    border: 0;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 0.6875rem;
    padding: 2px 4px;
  }
  .ctl button:hover { text-decoration: underline; }
  .stacked .ctl button { min-width: 44px; min-height: 44px; }

  .body { flex: 1; overflow: auto; padding: var(--s3); }

  .rz {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 12px;
    height: 12px;
    cursor: nwse-resize;
    touch-action: none;
    background: linear-gradient(135deg,
      transparent 50%, var(--ink) 50%, var(--ink) 58%,
      transparent 58%, transparent 70%, var(--ink) 70%, var(--ink) 78%, transparent 78%);
  }
</style>
