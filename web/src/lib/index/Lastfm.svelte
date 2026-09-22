<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Skeleton from '../ui/Skeleton.svelte'
  import { count } from '../format'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.lastfm ?? null)
</script>

<Cell number="2.1" title="Last.fm" href="https://www.last.fm/user/kiiyo">
  {#if state.status === 'loading'}
    <Skeleton lines={3} />
  {:else if state.status === 'error'}
    <p class="note">Couldn't reach Last.fm.</p>
  {:else if !d}
    <p class="note">Couldn't reach Last.fm.</p>
  {:else if d.top_artists.length === 0}
    <p class="note">Nothing scrobbled in the last month.</p>
  {:else}
    <ul>
      {#each d.top_artists.slice(0, 3) as a (a.name)}
        <li><span class="name">{a.name}</span> <span class="num">{count(a.playcount)}</span></li>
      {/each}
    </ul>
    <p class="total num">{count(d.total_scrobbles)} scrobbles</p>
  {/if}
</Cell>

<style>
  ul { list-style: none; display: grid; gap: var(--s1); }
  li { display: flex; justify-content: space-between; gap: var(--s3); font-size: 0.8125rem; }
  .num, .note, .total { color: var(--text-2); }
  .note, .total { font-size: 0.75rem; }
  .total { margin-top: var(--s2); }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
