<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Rows from '../ui/Rows.svelte'
  import Skeleton from '../ui/Skeleton.svelte'
  import { count, percent } from '../format'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.osu ?? null)

  let rows = $derived(
    d
      ? [
          { label: 'pp',       value: count(d.pp) },
          { label: 'Rank',     value: `#${count(d.rank)}` },
          { label: 'Accuracy', value: percent(d.accuracy) },
        ]
      : []
  )
</script>

<Cell number="2.4" title="osu!" href="https://osu.ppy.sh">
  {#if state.status === 'loading'}
    <Skeleton lines={3} />
  {:else if !d}
    <p class="note">Couldn't reach osu!.</p>
  {:else}
    <Rows {rows} />
  {/if}
</Cell>

<style>
  .note { font-size: 0.75rem; color: var(--text-2); }
</style>
