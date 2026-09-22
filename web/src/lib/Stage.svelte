<script lang="ts">
  import type { SnapshotState } from './snapshot'
  import { stageContent } from './stage'
  import Value from './ui/Value.svelte'

  let { state }: { state: SnapshotState } = $props()

  let content = $derived(stageContent(state.data?.now ?? null))
</script>

<section class="stage">
  <p class="label">{content.label}</p>

  {#if state.status === 'loading'}
    <h2 class="muted">Loading...</h2>
  {:else}
    <h2 class:muted={content.empty}>
      <Value value={content.headline} />
    </h2>
    {#if content.sub}
      <p class="sub"><Value value={content.sub} /></p>
    {/if}
    {#if content.context.length > 0}
      <p class="context num">{content.context.join('  ·  ')}</p>
    {/if}
  {/if}
</section>

<style>
  /* The scale drop at this rule is the page's rhythm. It is the only 2px line. */
  .stage {
    padding: var(--s6) 0 var(--s5);
    border-bottom: 2px solid var(--accent);
  }
  .label { margin-bottom: var(--s4); }
  h2 { margin-bottom: var(--s2); }
  .muted { color: var(--text-2); }
  .sub {
    font-family: var(--serif);
    font-weight: 300;
    font-size: 1.1875rem;
    color: var(--text-2);
    margin-bottom: var(--s4);
  }
  .context { font-size: 0.6875rem; color: var(--text-2); }
</style>
