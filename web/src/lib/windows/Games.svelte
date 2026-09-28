<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { count, hours, percent } from '../format'
  import { profiles } from '../profiles'
  import { SERVER_DOWN, unreachable } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let steam = $derived(state.data?.steam ?? null)
  let cs2 = $derived(state.data?.cs2 ?? null)
  let osu = $derived(state.data?.osu ?? null)

  let cs2Text = $derived(
    !cs2 ? ''
    : cs2.premier !== null ? `Premier ${count(cs2.premier)}`
    : cs2.rating !== null ? `Leetify ${cs2.rating.toFixed(2)}`
    : 'No rating yet'
  )

  /** Only for a single failed source; a whole-API failure is said once below. */
  const missing = (source: string) => (state.status === 'ready' ? unreachable(source) : '')
</script>

<ul>
  <li>
    <a href={profiles.steam.url} target="_blank" rel="noopener">Steam</a>
    {#if steam}
      <!-- The word carries the state; the square only marks "online". -->
      <span class="v">{#if steam.state === 'online'}<span class="live" aria-hidden="true"></span>{/if}{steam.state}</span>
    {:else}
      <span class="v note">{missing('Steam')}</span>
    {/if}
  </li>
  {#if steam && steam.recent.length > 0}
    <li class="sub num">{steam.recent[0].name}, {hours(steam.recent[0].minutes_2weeks)}h in two weeks</li>
  {/if}
  <li>
    <a href={profiles.cs2.url} target="_blank" rel="noopener">CS2</a>
    <span class="v num" class:note={!cs2}>{cs2 ? cs2Text : missing('Leetify')}</span>
  </li>
  <li>
    <a href={profiles.osu.url} target="_blank" rel="noopener">osu!</a>
    <span class="v num" class:note={!osu}>{osu ? `#${count(osu.rank)} · ${percent(osu.accuracy)}` : missing('osu!')}</span>
  </li>
</ul>

{#if state.status === 'error'}
  <p class="note">{SERVER_DOWN}</p>
{/if}

<style>
  ul { list-style: none; }
  li { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s3); padding: 3px 0; font-size: 0.8125rem; }
  li + li { border-top: 1px dotted var(--dot); }
  .v { text-align: right; }
  .note, .sub { color: var(--text-2); font-size: 0.75rem; }
  li.sub { border-top: 0; padding-top: 0; }
  p.note { margin-top: var(--s2); }
</style>
