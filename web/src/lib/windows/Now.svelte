<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { stageContent } from '../stage'
  import { ago } from '../format'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let c = $derived(stageContent(state.data?.now ?? null))
  let art = $derived(state.data?.now.listening?.live ? state.data.now.listening.art : null)

  // When nothing is on, say what was, and when. Only with a real scrobble time.
  let last = $derived.by(() => {
    const t = state.data?.lastfm?.recent.find((r) => !r.live && r.played_at !== null)
    return c.empty && t ? `last played: ${t.name} by ${t.artist}, ${ago(Date.now() / 1000 - t.played_at!)}` : null
  })
</script>

<p class="label">{#if !c.empty && state.status === 'ready'}<span class="live" aria-hidden="true"></span>{/if}{c.label}</p>

{#if state.status === 'loading'}
  <Skeleton lines={2} />
{:else if state.status === 'error'}
  <p class="note">{SERVER_DOWN}</p>
{:else}
  <div class="row">
    {#if art}<img src={art} alt="" width="64" height="64" />{/if}
    <div>
      <p class="headline" class:muted={c.empty}>{c.headline}</p>
      {#if c.sub}<p class="sub">{c.sub}</p>{/if}
      {#if last}<p class="context">{last}</p>{/if}
      {#if c.context.length > 0}<p class="context num">{c.context.join('  ·  ')}</p>{/if}
    </div>
  </div>
{/if}

<style>
  .label { margin-bottom: var(--s2); }
  .row { display: flex; gap: var(--s3); align-items: flex-start; }
  .row img { flex: none; border: 1px solid var(--ink); }
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
