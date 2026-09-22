<script lang="ts">
  import { onMount } from 'svelte'
  import { snapshot, startPolling } from './lib/snapshot'
  import Stage from './lib/Stage.svelte'
  import ThemeToggle from './lib/ui/ThemeToggle.svelte'

  onMount(() => startPolling())
</script>

<header>
  <h1>kiiyo</h1>
  <ThemeToggle />
</header>

<main>
  <Stage state={$snapshot} />

  <div class="index">
    <!-- Cells 2.1 to 2.6 arrive in Tasks 16 and 17. -->
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

  /* The index collapses in source order. The stage shrinks via --stage-size,
     which is already clamped, so nothing here touches type size. */
  @media (max-width: 720px) {
    .index { grid-template-columns: 1fr; }
  }
</style>
