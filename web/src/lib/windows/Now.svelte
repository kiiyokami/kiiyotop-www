<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { stageContent } from '../stage'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let c = $derived(stageContent(state.data?.now ?? null))
</script>

<p class="label">{#if !c.empty && state.status === 'ready'}<span class="live" aria-hidden="true"></span>{/if}{c.label}</p>

{#if state.status === 'loading'}
  <Skeleton lines={2} />
{:else if state.status === 'error'}
  <p class="note">{SERVER_DOWN}</p>
{:else}
  <p class="headline" class:muted={c.empty}>{c.headline}</p>
  {#if c.sub}<p class="sub">{c.sub}</p>{/if}
  {#if c.context.length > 0}<p class="context num">{c.context.join('  ·  ')}</p>{/if}
{/if}

<style>
  .label { margin-bottom: var(--s2); }
  .headline {
    font-family: var(--serif);
    font-weight: 300;
    font-size: clamp(1.5rem, 1rem + 2vw, 2.125rem);
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .sub { margin-top: var(--s1); }
  .muted, .sub, .context, .note { color: var(--text-2); }
  .context, .note { font-size: 0.75rem; margin-top: var(--s2); }
</style>
