<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Skeleton from '../ui/Skeleton.svelte'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.github ?? null)
</script>

<Cell number="2.6" title="GitHub" href="https://github.com/kiiyo">
  {#if state.status === 'loading'}
    <Skeleton lines={2} />
  {:else if !d}
    <p class="note">Couldn't reach GitHub.</p>
  {:else if d.recent.length === 0}
    <p class="note">No public pushes recently.</p>
  {:else}
    <ul>
      {#each d.recent.slice(0, 3) as repo (repo.name)}
        <li>
          <a href={repo.url} target="_blank" rel="noopener">{repo.name}</a>
          {#if repo.language}<span class="lang num">{repo.language}</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</Cell>

<style>
  /* Full width, so the list runs across rather than wrapping in a narrow column. */
  ul {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: var(--s3) var(--s5);
  }
  li { display: flex; align-items: baseline; gap: var(--s2); font-size: 0.8125rem; }
  .lang { font-size: 0.6875rem; color: var(--text-2); }
  .note { font-size: 0.75rem; color: var(--text-2); }
</style>
