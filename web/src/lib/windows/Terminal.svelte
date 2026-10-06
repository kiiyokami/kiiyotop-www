<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { BIO, ECHO_MAX, PROMPT, SCROLLBACK, append, run, type Action } from '../os/terminal'
  import { theme } from '../os/theme'

  // Renamed locally: with a binding called `state` in scope, Svelte reads the
  // `$state` rune below as a store subscription to it.
  let { state: snapshot, onaction }: { state: SnapshotState; onaction: (a: Action) => void } = $props()

  // The terminal opens on startup, so the bio is the first thing anyone reads.
  let lines = $state<string[]>([...BIO, '', 'type help for commands.'])
  let input = $state('')
  let log: HTMLDivElement | undefined = $state()
  let field: HTMLInputElement | undefined = $state()

  // A real terminal takes the caret wherever you click in it, except when you
  // are selecting output to copy.
  function focusField() {
    if (window.getSelection()?.toString()) return
    field?.focus()
  }

  // Newest first, so index 0 is the last command and -1 is the empty line.
  let history = $state<string[]>([])
  let at = $state(-1)

  function recall(e: KeyboardEvent) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    at = Math.min(Math.max(at + (e.key === 'ArrowUp' ? 1 : -1), -1), history.length - 1)
    input = at < 0 ? '' : history[at]
  }

  function submit(e: SubmitEvent) {
    e.preventDefault()
    const typed = input.trim()
    input = ''
    at = -1
    if (!typed) return
    history = [typed, ...history].slice(0, SCROLLBACK)

    const result = run(typed, { snapshot, theme: $theme })
    if (result.action?.type === 'clear') {
      lines = []
      return
    }
    lines = append(lines, [`${PROMPT} ${typed.slice(0, ECHO_MAX)}`, ...result.lines])
    if (result.action) onaction(result.action)
  }

  $effect(() => {
    void lines.length
    if (log) log.scrollTop = log.scrollHeight
  })
</script>

<!-- The input is the keyboard path; this only saves a precise click. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="term" onclick={focusField}>
  <div class="log" bind:this={log} aria-live="polite">
    {#each lines as line}
      <p>{line}</p>
    {/each}
  </div>
  <form onsubmit={submit}>
    <span class="prompt" aria-hidden="true">{PROMPT}</span>
    <input
      bind:this={field}
      bind:value={input}
      onkeydown={recall}
      aria-label="terminal command"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      maxlength="200"
    />
  </form>
</div>

<style>
  .term {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 16rem;
    font-family: var(--mono);
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  /* The window fits its content, so the log needs its own cap or every
     command would grow the terminal down the page. */
  .log { flex: 1; overflow: auto; max-height: 28rem; color: var(--text-2); white-space: pre-wrap; overflow-wrap: anywhere; }
  form { display: flex; gap: var(--s2); align-items: baseline; }
  .prompt { color: var(--accent); flex: none; }
  input {
    flex: 1;
    min-width: 0;
    background: none;
    border: 0;
    color: var(--text);
    font: inherit;
  }
</style>
