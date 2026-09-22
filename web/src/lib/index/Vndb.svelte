<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Skeleton from '../ui/Skeleton.svelte'
  import { count } from '../format'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.vndb ?? null)
</script>

<Cell number="2.5" title="VNDB" href="https://vndb.org">
  {#if state.status === 'loading'}
    <Skeleton lines={3} />
  {:else if !d}
    <p class="note">Couldn't reach VNDB.</p>
  {:else}
    {#if d.reading.length > 0}
      <ul>
        {#each d.reading.slice(0, 2) as vn (vn.title)}
          <li>{vn.title}</li>
        {/each}
      </ul>
    {:else}
      <p class="note">Not reading anything right now.</p>
    {/if}
    <p class="note num">
      {count(d.finished)}{d.finished_more ? '+' : ''} finished
    </p>
  {/if}
</Cell>

<style>
  ul { list-style: none; display: grid; gap: var(--s1); }
  li { font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .note { font-size: 0.75rem; color: var(--text-2); margin-top: var(--s2); }
</style>
