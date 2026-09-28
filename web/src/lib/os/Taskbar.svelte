<script lang="ts">
  import { TITLES, WINDOW_IDS, frontId, type OsState, type WinId } from './windows'

  let { os, onclick }: { os: OsState; onclick: (id: WinId) => void } = $props()
  let top = $derived(frontId(os))
</script>

<nav class="taskbar" aria-label="Windows">
  {#each WINDOW_IDS as id (id)}
    <button type="button" class:off={os.windows[id].hidden} class:top={top === id} onclick={() => onclick(id)}>
      {TITLES[id]}{#if os.windows[id].hidden}<span class="sr-only">, hidden</span>{/if}
    </button>
  {/each}
</nav>

<style>
  .taskbar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: var(--s1);
    height: var(--taskbar-h);
    padding: 0 var(--s2);
    background: var(--win);
    border-top: 1px solid var(--ink);
    overflow-x: auto;
    font-family: var(--mono);
    font-size: 0.6875rem;
  }
  button {
    flex: none;
    background: none;
    border: 1px solid var(--ink);
    padding: 1px var(--s2);
    cursor: pointer;
    font-family: var(--mono);
    font-size: inherit;
  }
  button.top { background: var(--bar); }
  button.off { border-style: dashed; color: var(--text-2); }

  /* Stacked mode: the taskbar pins to the viewport and grows to tap size. */
  :global(.stacked) .taskbar { position: fixed; height: 52px; }
  :global(.stacked) button { min-height: 44px; }
</style>
