<script lang="ts">
  import { onMount } from 'svelte'
  import { snapshot, startPolling } from './lib/snapshot'
  import Stage from './lib/Stage.svelte'
  import ThemeToggle from './lib/ui/ThemeToggle.svelte'
  import Lastfm from './lib/index/Lastfm.svelte'
  import Steam from './lib/index/Steam.svelte'
  import Cs2 from './lib/index/Cs2.svelte'
  import Rhythm from './lib/index/Rhythm.svelte'
  import Vndb from './lib/index/Vndb.svelte'
  import Github from './lib/index/Github.svelte'

  onMount(() => startPolling())
</script>

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

    <div class="span-2"><Rhythm state={$snapshot} /></div>
    <Vndb   state={$snapshot} />

    <div class="span-3"><Github state={$snapshot} /></div>
  </div>
</main>

<style>
  header {
    max-width: 68rem;
    margin: 0 auto;
    padding: var(--s4) 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--hairline);
  }
  main { max-width: 68rem; margin: 0 auto; padding: 0 1rem var(--s6); }

  /* Three equal columns. Cells that need more say so themselves in Task 17. */
  .index { display: grid; grid-template-columns: repeat(3, 1fr); }

  .span-2 { grid-column: span 2; }
  .span-3 { grid-column: span 3; }

  /* Wrappers must not swallow the grid: the Cell inside needs to fill them. */
  .span-2 > :global(.cell),
  .span-3 > :global(.cell) { height: 100%; }

  .index > :global(.cell:nth-child(3n)),
  .index > :global(.span-2) + :global(.cell),
  .index > :global(.span-3) > :global(.cell) { border-right: none; }
  .index > :global(.span-3) > :global(.cell) { border-bottom: none; }

  /* The index collapses in source order. The stage shrinks via --stage-size,
     which is already clamped, so nothing here touches type size. */
  @media (max-width: 720px) {
    .index { grid-template-columns: 1fr; }
    .span-2, .span-3 { grid-column: span 1; }
    .index > :global(.cell) { border-right: none; }
  }
</style>
