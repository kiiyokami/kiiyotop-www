<script lang="ts">
  const KEY = 'kiiyo-theme'

  function current(): 'light' | 'dark' {
    const explicit = document.documentElement.getAttribute('data-theme')
    if (explicit === 'light' || explicit === 'dark') return explicit
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  let theme = $state<'light' | 'dark'>('light')

  $effect(() => { theme = current() })

  function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    theme = next
    try {
      localStorage.setItem(KEY, next)
    } catch (e) {
      // Private mode. The choice holds for this page view and is not persisted.
    }
  }
</script>

<button
  type="button"
  class="label"
  aria-pressed={theme === 'dark'}
  onclick={toggle}
>
  {theme === 'dark' ? 'Day' : 'Night'}
</button>

<style>
  button {
    background: none;
    border: 1px solid var(--hairline);
    border-radius: var(--r-small);
    color: var(--text-2);
    cursor: pointer;
    /* 44px tap target without a 44px-looking control. */
    min-height: 44px;
    padding: 0 var(--s3);
    transition: color var(--t), border-color var(--t);
  }
  button:hover { color: var(--text); border-color: var(--text-2); }
</style>
