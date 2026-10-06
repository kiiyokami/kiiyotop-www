<script lang="ts">
  import { ago, clock } from '../format'
  import { syncTheme, theme, toggleTheme } from './theme'

  let { ontidy, updatedAt, offline = false }: {
    ontidy: () => void
    /** When the data on screen arrived (ms). Absent until the first snapshot. */
    updatedAt?: number
    /** The last poll failed, so the data on screen is older than it looks. */
    offline?: boolean
  } = $props()

  let now = $state(new Date())
  let c = $derived(clock(now))
  let fresh = $derived(
    updatedAt === undefined ? ''
    : offline ? `offline, data from ${ago((now.getTime() - updatedAt) / 1000)}`
    : `updated ${ago((now.getTime() - updatedAt) / 1000)}`
  )

  $effect(() => {
    syncTheme()
    const id = setInterval(() => { now = new Date() }, 15_000)
    return () => clearInterval(id)
  })
</script>

<nav class="menubar" aria-label="kiiyoOS menu">
  <h1><span class="k">kiiyo</span>OS</h1>
  <button type="button" onclick={ontidy}>tidy up</button>
  <button type="button" aria-pressed={$theme === 'dark'} onclick={toggleTheme}>theme: {$theme}</button>
  <span class="sp"></span>
  {#if fresh}<span class="fresh" class:off={offline}>{fresh}</span>{/if}
  <span class="clock num"><span class="date">{c.date}</span> <time>{c.time}</time></span>
</nav>

<style>
  .menubar {
    position: relative;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: var(--s4);
    height: var(--menubar-h);
    padding: 0 var(--s3);
    background: var(--win);
    border-bottom: 1px solid var(--ink);
    font-family: var(--mono);
    font-size: 0.6875rem;
  }
  h1 { font: inherit; font-weight: 600; }
  .k { color: var(--accent); }
  button { background: none; border: 0; cursor: pointer; padding: 2px 4px; font-family: var(--mono); font-size: inherit; }
  button:hover { text-decoration: underline; }
  .sp { flex: 1; }
  .fresh { color: var(--text-2); }
  .fresh.off { color: var(--text); text-decoration: underline dotted; }
  /* Stacked mode is the touch layout: grow the bar to 44px tap targets. */
  :global(.stacked) .menubar { height: auto; min-height: 44px; }
  :global(.stacked) button { min-height: 44px; }
  @media (max-width: 480px) {
    .date, .fresh { display: none; }
    .menubar { gap: var(--s2); }
  }
</style>
