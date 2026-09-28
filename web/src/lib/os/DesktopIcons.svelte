<script lang="ts">
  import { profiles } from '../profiles'
  import { TITLES, WINDOW_IDS, type WinId } from './windows'

  let { offset, onopen }: { offset: number; onopen: (id: WinId) => void } = $props()

  let selected = $state<WinId | null>(null)
  let pointer = 'mouse'

  // Desktop convention for a mouse (select, then double-click to open), but
  // one tap or Enter opens straight away: detail is 0 for keyboard clicks.
  function activate(e: MouseEvent, id: WinId) {
    if (e.detail === 0 || pointer !== 'mouse') onopen(id)
    else selected = id
  }
</script>

<div class="icons" style:left="{offset + 14}px">
  {#each WINDOW_IDS as id (id)}
    <button
      type="button"
      class="ic"
      class:sel={selected === id}
      onpointerdown={(e) => { pointer = e.pointerType || 'mouse' }}
      onclick={(e) => activate(e, id)}
      ondblclick={() => onopen(id)}
    >
      <i aria-hidden="true"></i>{TITLES[id]}
    </button>
  {/each}
  <a class="ic link" href={profiles.github.url} target="_blank" rel="noopener">
    <i aria-hidden="true"></i>GitHub
  </a>
</div>

<style>
  .icons {
    position: absolute;
    top: 16px;
    display: grid;
    gap: var(--s2);
    z-index: 0;
  }
  .ic {
    display: block;
    width: 68px;
    padding: 4px 2px;
    background: none;
    border: 0;
    cursor: default;
    text-align: center;
    text-decoration: none;
    font-family: var(--mono);
    font-size: 0.625rem;
    color: var(--text);
  }
  .ic.sel { background: var(--bar); }
  /* The icon is a tiny kiiyoOS window: the brand's own shape, no drawn art. */
  i {
    position: relative;
    display: block;
    width: 34px;
    height: 28px;
    margin: 0 auto 4px;
    background: var(--win);
    border: 1px solid var(--ink);
    box-shadow: 3px 3px 0 var(--shadow);
  }
  i::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 6px;
    background: var(--bar);
    border-bottom: 1px solid var(--ink);
  }
  .link i::after {
    content: '↗';
    position: absolute;
    right: 3px;
    bottom: 0;
    font-size: 11px;
    color: var(--text-2);
  }
</style>
