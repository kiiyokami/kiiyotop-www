<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Rows from '../ui/Rows.svelte'
  import Skeleton from '../ui/Skeleton.svelte'
  import { count, decimal, percent } from '../format'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.cs2 ?? null)

  // rating and premier are Option on the Rust side: a new account has neither.
  let rows = $derived(
    d
      ? [
          ...(d.rating  !== null ? [{ label: 'Leetify', value: decimal(d.rating, 2) }] : []),
          ...(d.premier !== null ? [{ label: 'Premier', value: count(d.premier) }] : []),
          { label: 'Headshot', value: percent(d.hs_percent) },
          { label: 'Winrate',  value: percent(d.winrate) },
        ]
      : []
  )
</script>

<Cell number="2.3" title="CS2" href="https://leetify.com">
  {#if state.status === 'loading'}
    <Skeleton lines={4} />
  {:else if !d}
    <p class="note">Couldn't reach Leetify.</p>
  {:else if d.matches === 0}
    <p class="note">No matches recorded yet.</p>
  {:else}
    <Rows {rows} />
    <p class="matches num">{count(d.matches)} matches</p>
  {/if}
</Cell>

<style>
  .note, .matches { font-size: 0.75rem; color: var(--text-2); }
  .matches { margin-top: var(--s2); }
</style>
