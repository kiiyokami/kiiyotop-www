<script lang="ts">
  import { clock } from '../format'
  import { syncTheme, theme, toggleTheme } from './theme'

  let { ontidy }: { ontidy: () => void } = $props()

  let now = $state(new Date())
  let c = $derived(clock(now))

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
  @media (max-width: 480px) {
    .date { display: none; }
    .menubar { gap: var(--s2); }
  }
</style>
