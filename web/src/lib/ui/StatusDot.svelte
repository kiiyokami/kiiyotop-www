<script lang="ts">
  let { status }: { status: 'online' | 'idle' | 'dnd' | 'offline' } = $props()
</script>

<span class="dot" data-status={status} title={status}></span>
<span class="sr">{status}</span>

<style>
  /* Marks a real state. No glow, no pulse: the glow marked nothing. */
  .dot {
    display: inline-block;
    width: 0.5rem; height: 0.5rem;
    border-radius: 50%;
    background: var(--text-2);
    vertical-align: baseline;
  }
  .dot[data-status='online'] { background: var(--accent); }
  .dot[data-status='idle'],
  .dot[data-status='dnd']    { background: var(--text-2); }
  .dot[data-status='offline']{ background: transparent; border: 1px solid var(--hairline); }

  /* Colour is never the only carrier: the status word is available to AT. */
  .sr {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
</style>
