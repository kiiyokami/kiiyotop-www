<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { count } from '../format'
  import { playlists, profiles } from '../profiles'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN, unreachable } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.lastfm ?? null)
</script>

<div class="cols">
  <section>
    <p class="label">{d && d.top_artists.length === 0 ? 'recently played' : 'this month'}</p>
    {#if state.status === 'loading'}
      <Skeleton lines={3} />
    {:else if state.status === 'error'}
      <p class="note">{SERVER_DOWN}</p>
    {:else if !d}
      <p class="note">{unreachable('Last.fm')}</p>
    {:else if d.top_artists.length > 0}
      <ul>
        {#each d.top_artists.slice(0, 3) as a (a.name)}
          <li><span class="name">{a.name}</span> <span class="num">{count(a.playcount)}</span></li>
        {/each}
      </ul>
    {:else if d.recent.length > 0}
      <!-- The monthly chart lags behind real scrobbles; show those instead.
           Keyed by position: the same track often appears twice in a row. -->
      <ul>
        {#each d.recent.slice(0, 3) as t, i (i)}
          <li><span class="name">{t.name}</span> <span class="num">{t.artist}</span></li>
        {/each}
      </ul>
    {:else}
      <p class="note">Nothing scrobbled in the last month.</p>
    {/if}
  </section>

  <!-- Static: these links work even when Last.fm or the API is down. -->
  <section>
    <p class="label">playlists</p>
    <ul>
      {#each playlists as p (p.url)}
        <li><a href={p.url} target="_blank" rel="noopener">{p.label}</a></li>
      {/each}
    </ul>
  </section>
</div>

<p class="foot">
  {#if d}<span class="num">{count(d.total_scrobbles)} scrobbles</span>{/if}
  <a href={profiles.lastfm.url} target="_blank" rel="noopener">Last.fm</a>
</p>

<style>
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--s4); }
  .label { margin-bottom: var(--s1); }
  ul { list-style: none; }
  li { display: flex; justify-content: space-between; gap: var(--s3); padding: 3px 0; font-size: 0.8125rem; }
  li + li { border-top: 1px dotted var(--dot); }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .num, .note { color: var(--text-2); }
  .note { font-size: 0.75rem; }
  .foot { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s2); font-size: 0.75rem; }
</style>
