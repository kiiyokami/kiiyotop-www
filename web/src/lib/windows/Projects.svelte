<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { count } from '../format'
  import { profiles } from '../profiles'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN, unreachable } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.github ?? null)
</script>

{#if state.status === 'loading'}
  <Skeleton lines={3} />
{:else if state.status === 'error'}
  <p class="note">{SERVER_DOWN}</p>
{:else if !d}
  <p class="note">{unreachable('GitHub')}</p>
{:else if d.pinned.length === 0}
  <p class="note">No pinned repos on GitHub.</p>
{:else}
  <ul>
    {#each d.pinned as r (r.url)}
      <li>
        <div class="top">
          <a class="name" href={r.url} target="_blank" rel="noopener">{r.name}</a>
          <span class="meta num">{#if r.language}{r.language} · {/if}★ {count(r.stars)}</span>
        </div>
        {#if r.description}<p class="desc">{r.description}</p>{/if}
      </li>
    {/each}
  </ul>
{/if}

<p class="foot"><a href={profiles.github.url} target="_blank" rel="noopener">all repos on GitHub</a></p>

<style>
  ul { list-style: none; }
  li { padding: var(--s1) 0; }
  li + li { border-top: 1px dotted var(--dot); }
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s3); }
  .name { font-weight: 600; font-size: 0.8125rem; }
  .meta, .desc, .note { color: var(--text-2); font-size: 0.75rem; }
  .meta { flex: none; }
  .foot { margin-top: var(--s2); font-size: 0.75rem; }
</style>
