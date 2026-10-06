<script lang="ts">
  import { sites } from '../profiles'
  import { TITLES, WINDOW_IDS, type WinId } from './windows'

  let { onopen }: { onopen: (id: WinId) => void } = $props()

  let selected = $state<WinId | null>(null)
  let pointer = 'mouse'

  // Desktop convention for a mouse (select, then double-click to open), but
  // one tap or Enter opens straight away: detail is 0 for keyboard clicks.
  function activate(e: MouseEvent, id: WinId) {
    if (e.detail === 0 || pointer !== 'mouse') onopen(id)
    else selected = id
  }
</script>

<div class="icons">
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
  {#each sites as s (s.url)}
    <a class="ic link" href={s.url} target="_blank" rel="noopener">
      <i aria-hidden="true"></i>{s.label}
    </a>
  {/each}
</div>

<style>
  /* Pinned to the desktop's own edge, like a real desktop, whatever the
     width: the windows centre, the icons do not. */
  .icons {
    position: absolute;
    top: 16px;
    left: 16px;
    display: grid;
    gap: var(--s3);
    z-index: 0;
  }
  .ic {
    display: block;
    width: 84px;
    padding: 6px 2px;
    background: none;
    border: 0;
    cursor: default;
    text-align: center;
    text-decoration: none;
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text);
  }
  .ic.sel { background: var(--bar); }
  /* The icon is a tiny kiiyoOS window: the brand's own shape, no drawn art. */
  i {
    position: relative;
    display: block;
    width: 48px;
    height: 40px;
    margin: 0 auto 6px;
    background: var(--win);
    border: 1px solid var(--ink);
    box-shadow: 4px 4px 0 var(--shadow);
  }
  i::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 8px;
    background: var(--bar);
    border-bottom: 1px solid var(--ink);
  }
  .link i::after {
    content: '↗';
    position: absolute;
    right: 4px;
    bottom: 1px;
    font-size: 14px;
    color: var(--text-2);
  }
</style>
