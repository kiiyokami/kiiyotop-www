<script lang="ts">
  import { onMount } from 'svelte'
  import { snapshot, startPolling } from './lib/snapshot'
  import Stage from './lib/Stage.svelte'
  import ThemeToggle from './lib/ui/ThemeToggle.svelte'
  import Lastfm from './lib/index/Lastfm.svelte'
  import Steam from './lib/index/Steam.svelte'
  import Cs2 from './lib/index/Cs2.svelte'
  import Osu from './lib/index/Osu.svelte'
  import Vndb from './lib/index/Vndb.svelte'
  import Github from './lib/index/Github.svelte'

  onMount(() => startPolling())
</script>

<div class="page">
  <header>
    <h1>kiiyo</h1>
    <ThemeToggle />
  </header>

  <main>
    <Stage state={$snapshot} />

    <div class="index">
      <Lastfm state={$snapshot} />
      <Steam  state={$snapshot} />
      <Cs2    state={$snapshot} />

      <Osu    state={$snapshot} />
      <Vndb   state={$snapshot} />
      <Github state={$snapshot} />
    </div>
  </main>
</div>

<style>
  /* The viewport (body) carries --surface. This container sits on --bg,
     one step off it in both themes, narrower than the full viewport and
     centered, so it reads as a distinct surface through contrast alone.
     No border, no shadow, no radius: the shade difference does the work. */
  .page {
    max-width: 60rem;
    margin: 0 auto;
    background: var(--bg);
  }

  header {
    padding: var(--s4) 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--hairline);
  }
  main { padding: 0 1rem var(--s6); }

  /* Six cells, three equal columns, two rows. No wrapper divs: every cell
     is a direct child, so there is no wrapper-div blind spot for the
     border rules below to miss. */
  .index { display: grid; grid-template-columns: repeat(3, 1fr); }

  /* Desktop: strip the grid's right and bottom outer edges so it doesn't
     end in floating rules. Scoped to min-width so it never leaks into the
     single-column mobile layout below, where "last column" and "last row"
     mean something different. */
  @media (min-width: 721px) {
    .index > :global(.cell:nth-child(3n)) { border-right: none; }
    .index > :global(.cell:nth-last-child(-n+3)) { border-bottom: none; }
  }

  /* The index collapses in source order. The stage shrinks via --stage-size,
     which is already clamped, so nothing here touches type size. */
  @media (max-width: 720px) {
    .index { grid-template-columns: 1fr; }
    .index > :global(.cell) { border-right: none; }
    .index > :global(.cell:last-child) { border-bottom: none; }
  }
</style>
