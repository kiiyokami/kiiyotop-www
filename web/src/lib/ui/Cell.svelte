<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    number,
    title,
    href,
    live = false,
    children,
  }: {
    number: string
    title: string
    href?: string
    live?: boolean
    children: Snippet
  } = $props()
</script>

<section class="cell">
  <h3 class="label">
    <span class="decimal" class:live>{number}</span>
    {#if href}
      <a {href} target="_blank" rel="noopener">{title}</a>
    {:else}
      {title}
    {/if}
  </h3>
  {@render children()}
</section>

<style>
  .cell {
    padding: var(--s4) var(--s5);
    border-right: 1px solid var(--hairline);
    border-bottom: 1px solid var(--hairline);
  }
  h3 { margin-bottom: var(--s3); }
  /* The decimal is muted until the cell is live. This is the only accent an
     index cell ever gets, and it replaces the status pill entirely. */
  .decimal { color: var(--text-2); }
  .decimal.live { color: var(--accent); }
  a { text-decoration: none; }
  a:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
