<script lang="ts">
  import { tick } from 'svelte'
  import type { SnapshotState } from '../snapshot'
  import { count, decimal, hours, percent } from '../format'
  import { HINTS } from '../glossary'
  import { profiles } from '../profiles'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN, unreachable } from './notes'

  type Game = 'steam' | 'cs2' | 'osu'

  // Renamed locally: with a binding called `state` in scope, Svelte reads the
  // `$state` runes below as store subscriptions to it.
  let { state: snapshot }: { state: SnapshotState } = $props()
  let steam = $derived(snapshot.data?.steam ?? null)
  let cs2 = $derived(snapshot.data?.cs2 ?? null)
  let osu = $derived(snapshot.data?.osu ?? null)

  const LINK: Record<Game, { label: string; url: string }> = {
    steam: profiles.steam,
    cs2: profiles.cs2,
    osu: profiles.osu,
  }
  const SOURCE: Record<Game, string> = { steam: 'Steam', cs2: 'Leetify', osu: 'osu!' }

  let view = $state<Game | null>(null)
  let back: HTMLButtonElement | undefined = $state()
  let rowButtons: Partial<Record<Game, HTMLButtonElement>> = $state({})

  // Focus follows the view, so keyboard users land on the new content and
  // come back to the row they left from.
  async function show(next: Game | null) {
    const from = view
    view = next
    await tick()
    if (next) back?.focus()
    else if (from) rowButtons[from]?.focus()
  }

  let cs2Text = $derived(
    !cs2 ? ''
    : cs2.premier !== null ? `Premier ${count(cs2.premier)}`
    : cs2.rating !== null ? `Leetify ${cs2.rating.toFixed(2)}`
    : 'No rating yet'
  )

  let cs2Stats = $derived(cs2 ? [
    ...(cs2.rating !== null ? [['Leetify rating', decimal(cs2.rating, 2)]] : []),
    ...(cs2.premier !== null ? [['Premier', count(cs2.premier)]] : []),
    ...(cs2.faceit !== null ? [['FACEIT level', String(cs2.faceit)]] : []),
    ['Aim', decimal(cs2.aim, 1)],
    ['Utility', decimal(cs2.utility, 1)],
    ['Positioning', decimal(cs2.positioning, 1)],
    ['Opening duels', decimal(cs2.opening, 1)],
    ['Clutch', decimal(cs2.clutch, 1)],
    ['Headshot', percent(cs2.hs_percent)],
    ['Winrate', percent(cs2.winrate)],
    ['Matches', count(cs2.matches)],
  ] : [])

  let osuStats = $derived(osu ? [
    ['pp', count(osu.pp)],
    ['Global rank', `#${count(osu.rank)}`],
    ['Country rank', `#${count(osu.country_rank)}`],
    ['Accuracy', percent(osu.accuracy)],
    ['Level', String(osu.level)],
    ['Play count', count(osu.playcount)],
    ['SS / S / A', `${count(osu.ss)} / ${count(osu.s)} / ${count(osu.a)}`],
  ] : [])

  let steamStats = $derived(steam ? [
    ['Level', String(steam.level)],
    ['Friends', count(steam.friends)],
  ] : [])

  // The three Leetify skill scores are out of 100, so they read best as bars.
  const METERS = new Set(['Aim', 'Utility', 'Positioning'])

  // osu! reports silver grades separately; people read them as SS and S.
  const grade = (r: string) => (r === 'X' || r === 'XH' ? 'SS' : r === 'SH' ? 'S' : r)

  /** Only for a single failed source; a whole-API failure is said once. */
  const missing = (source: string) => (snapshot.status === 'ready' ? unreachable(source) : '')
</script>

{#if view === null}
  <ul class="list">
    <li>
      <button type="button" bind:this={rowButtons.steam} onclick={() => show('steam')}>Steam</button>
      {#if steam}
        <!-- The word carries the state; the square only marks "online". -->
        <span class="v">{#if steam.state === 'online'}<span class="live" aria-hidden="true"></span>{/if}{steam.state}</span>
      {:else}
        <span class="v note">{missing('Steam')}</span>
      {/if}
    </li>
    <li>
      <button type="button" bind:this={rowButtons.cs2} onclick={() => show('cs2')}>CS2</button>
      <span class="v num" class:note={!cs2}>{cs2 ? cs2Text : missing('Leetify')}</span>
    </li>
    <li>
      <button type="button" bind:this={rowButtons.osu} onclick={() => show('osu')}>osu!</button>
      <span class="v num" class:note={!osu}>{osu ? `#${count(osu.rank)} · ${percent(osu.accuracy)}` : missing('osu!')}</span>
    </li>
  </ul>
  {#if snapshot.status === 'error'}
    <p class="note">{SERVER_DOWN}</p>
  {/if}
{:else}
  <div class="head">
    <button type="button" class="back" bind:this={back} onclick={() => show(null)}>← games</button>
    <a href={LINK[view].url} target="_blank" rel="noopener">{LINK[view].label} ↗</a>
  </div>

  {#if snapshot.status === 'loading'}
    <Skeleton lines={4} />
  {:else if snapshot.status === 'error'}
    <p class="note">{SERVER_DOWN}</p>
  {:else if (view === 'steam' && !steam) || (view === 'cs2' && !cs2) || (view === 'osu' && !osu)}
    <p class="note">{unreachable(SOURCE[view])}</p>
  {:else}
    {#if view === 'steam' && steam}
      <p class="who">
        {#if steam.avatar}<img src={steam.avatar} alt={steam.persona} width="40" height="40" />{/if}
        <span>
          <span class="persona">{steam.persona}</span>
          <span class="state">{#if steam.state === 'online'}<span class="live" aria-hidden="true"></span>{/if}{steam.state}</span>
        </span>
      </p>
    {/if}

    <dl>
      {#each view === 'steam' ? steamStats : view === 'cs2' ? cs2Stats : osuStats as [label, value] (label)}
        <div>
          <dt>{#if HINTS[label]}<abbr title={HINTS[label]}>{label}</abbr>{:else}{label}{/if}</dt>
          <dd class="num">
            {#if METERS.has(label)}<meter min="0" max="100" value={Number(value)} aria-label={label}></meter>{/if}{value}
          </dd>
        </div>
      {/each}
    </dl>

    {#if view === 'steam' && steam && steam.recent.length > 0}
      <p class="label sub">recently played</p>
      <ul class="plays">
        {#each steam.recent.slice(0, 3) as g, i (i)}
          <li class="game">
            {#if g.thumb}<img src={g.thumb} alt="" width="92" height="43" loading="lazy" />{/if}
            <span class="name">{g.name}</span>
            <span class="num">{hours(g.minutes_2weeks)}h<span class="d2"> in two weeks</span></span>
            <span class="num d2 total">{hours(g.minutes_total)}h total</span>
          </li>
        {/each}
      </ul>
    {:else if view === 'osu' && osu && osu.best.length > 0}
      <p class="label sub">top plays</p>
      <ul class="plays">
        {#each osu.best.slice(0, 3) as s, i (i)}
          <li>
            <span class="name">{s.title ? `${s.title} [${s.version}]` : 'Unknown beatmap'}</span>
            <span class="num">{#if s.stars > 0}<span class="d2">★ {s.stars.toFixed(2)} · </span>{/if}{count(s.pp)}pp · {grade(s.rank)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
{/if}

<style>
  ul { list-style: none; }
  .list li, .plays li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--s3);
    padding: 3px 0;
    font-size: 0.8125rem;
  }
  .list li + li, .plays li + li { border-top: 1px dotted var(--dot); }

  /* Rows read like links: they open the game's details in this window. */
  .list button, .back {
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--dot);
    text-underline-offset: 3px;
  }
  .list button:hover, .back:hover { text-decoration-color: currentColor; }

  .v { text-align: right; }
  .note { color: var(--text-2); font-size: 0.75rem; }
  p.note { margin-top: var(--s2); }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--s3);
    margin-bottom: var(--s2);
    padding-bottom: var(--s1);
    border-bottom: 1px solid var(--ink);
  }
  .back { font-family: var(--mono); font-size: 0.6875rem; color: var(--text-2); }
  .head a { font-weight: 600; }

  dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); column-gap: var(--s4); }
  dl div {
    display: flex;
    justify-content: space-between;
    gap: var(--s3);
    padding: 2px 0;
    border-bottom: 1px dotted var(--dot);
    font-size: 0.8125rem;
  }
  dt { color: var(--text-2); }

  .who { display: flex; align-items: center; gap: var(--s3); margin-bottom: var(--s2); }
  .who img { border: 1px solid var(--ink); }
  .persona { display: block; font-size: 0.8125rem; font-weight: 600; }
  .state { display: block; color: var(--text-2); font-size: 0.75rem; }

  .sub { margin: var(--s3) 0 var(--s1); }
  .d2 { color: var(--text-2); }
  .game { display: grid !important; grid-template-columns: auto 1fr auto; gap: 0 var(--s3); align-items: center; }
  .game img { grid-row: span 2; border: 1px solid var(--ink); }
  .game .total { grid-column: 3; font-size: 0.6875rem; text-align: right; }
  meter { width: 56px; height: 8px; margin-right: var(--s2); vertical-align: middle; }
  abbr { text-decoration: underline dotted; text-decoration-color: var(--dot); text-underline-offset: 3px; cursor: help; }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .plays .num { flex: none; color: var(--text-2); }

  @media (pointer: coarse) {
    .list button, .back { min-height: 44px; }
  }
</style>
