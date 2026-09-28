<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { ECHO_MAX, PROMPT, append, run, type Action } from '../os/terminal'
  import { theme } from '../os/theme'

  // Renamed locally: with a binding called `state` in scope, Svelte reads the
  // `$state` rune below as a store subscription to it.
  let { state: snapshot, onaction }: { state: SnapshotState; onaction: (a: Action) => void } = $props()

  let lines = $state<string[]>(['kiiyoOS terminal. type help for commands.'])
  let input = $state('')
  let log: HTMLDivElement | undefined = $state()

  function submit(e: SubmitEvent) {
    e.preventDefault()
    const typed = input.trim()
    input = ''
    if (!typed) return

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

<div class="term">
  <div class="log" bind:this={log} aria-live="polite">
    {#each lines as line}
      <p>{line}</p>
    {/each}
  </div>
  <form onsubmit={submit}>
    <span class="prompt" aria-hidden="true">{PROMPT}</span>
    <input
      bind:value={input}
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
