<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { count } from '../format'
  import { profiles } from '../profiles'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN, unreachable } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.vndb ?? null)
</script>

{#if state.status === 'loading'}
  <Skeleton lines={3} />
{:else if state.status === 'error'}
  <p class="note">{SERVER_DOWN}</p>
{:else if !d}
  <p class="note">{unreachable('VNDB')}</p>
{:else if d.reading.length > 0}
  <ul>
    {#each d.reading.slice(0, 4) as vn, i (i)}
      <li>{vn.title}</li>
    {/each}
  </ul>
{:else}
  <p class="note">Not reading anything on VNDB right now.</p>
{/if}

<p class="foot">
  {#if d}<span class="num">{count(d.finished)}{d.finished_more ? '+' : ''} finished</span>{/if}
  <a href={profiles.vndb.url} target="_blank" rel="noopener">VNDB</a>
</p>

<style>
  ul { list-style: none; }
  li { padding: 3px 0; font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li + li { border-top: 1px dotted var(--dot); }
  .num, .note { color: var(--text-2); }
  .note { font-size: 0.75rem; }
  .foot { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s2); font-size: 0.75rem; }
</style>
