<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Rows from '../ui/Rows.svelte'
  import Skeleton from '../ui/Skeleton.svelte'
  import StatusDot from '../ui/StatusDot.svelte'
  import { count, hours } from '../format'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.steam ?? null)

  // Steam's own vocabulary, mapped onto the four states StatusDot knows.
  // Explicit annotation: without it, TS widens these string literals to
  // `string` on the `let` binding, which fails StatusDot's literal-union prop type.
  let dot: 'online' | 'idle' | 'dnd' | 'offline' = $derived(
    d?.state === 'online' ? 'online'
    : d?.state === 'busy' ? 'dnd'
    : d?.state === 'away' || d?.state === 'snooze' ? 'idle'
    : 'offline'
  )
</script>

<Cell number="2.2" title="Steam" href="https://steamcommunity.com/id/kiiyo" live={d?.state === 'online'}>
  {#if state.status === 'loading'}
    <Skeleton lines={3} />
  {:else if !d}
    <p class="note">Couldn't reach Steam.</p>
  {:else}
    <Rows rows={[
      { label: 'Level',   value: count(d.level) },
      { label: 'Friends', value: count(d.friends) },
    ]} />
    {#if d.recent.length > 0}
      <p class="recent num">{d.recent[0].name}, {hours(d.recent[0].minutes_2weeks)}h</p>
    {:else}
      <p class="note">No games played in the last two weeks.</p>
    {/if}
    <p class="state"><StatusDot status={dot} /> <span class="num">{d.state}</span></p>
  {/if}
</Cell>

<style>
  .note, .recent, .state { font-size: 0.75rem; color: var(--text-2); }
  .recent, .state { margin-top: var(--s2); }
  .state { display: flex; align-items: center; gap: var(--s2); }
</style>
