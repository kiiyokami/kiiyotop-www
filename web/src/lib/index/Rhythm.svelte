<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import Cell from '../ui/Cell.svelte'
  import Skeleton from '../ui/Skeleton.svelte'
  import { count, percent } from '../format'

  let { state }: { state: SnapshotState } = $props()
  let osu = $derived(state.data?.osu ?? null)
  let maimai = $derived(state.data?.maimai ?? null)
</script>

<Cell number="2.4" title="Rhythm">
  {#if state.status === 'loading'}
    <Skeleton lines={2} />
  {:else}
    <div class="pair">
      <div class="half">
        <p class="label"><span class="decimal">2.4.1</span> osu!</p>
        {#if !osu}
          <p class="note">Couldn't reach osu!.</p>
        {:else}
          <p class="figure num">{count(osu.pp)}<span class="unit">pp</span></p>
          <p class="note num">#{count(osu.rank)} · {percent(osu.accuracy)}</p>
        {/if}
      </div>

      <div class="half">
        <p class="label"><span class="decimal">2.4.2</span> maimai</p>
        {#if !maimai}
          <!-- The file is missing or malformed. It is never fetched, so this is
               not a network failure and must not claim to be one. -->
          <p class="note">No maimai record on file.</p>
        {:else}
          <a class="figure num" href={maimai.url} target="_blank" rel="noopener">
            {count(maimai.rating)}<span class="unit">rating</span>
          </a>
          <p class="note num">{maimai.dan} · {maimai.class} · {count(maimai.stars)} stars</p>
        {/if}
      </div>
    </div>
  {/if}
</Cell>

<style>
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s5); }
  .half .label { margin-bottom: var(--s2); }
  .figure { display: block; font-size: 1.0625rem; }
  .unit { color: var(--text-2); font-size: 0.6875rem; margin-left: 0.3em; }
  .note { font-size: 0.75rem; color: var(--text-2); margin-top: var(--s1); }

  /* The pair stacks before the index does, so 2.4.1 and 2.4.2 never squeeze. */
  @media (max-width: 900px) {
    .pair { grid-template-columns: 1fr; gap: var(--s4); }
  }
</style>
