<script lang="ts">
  import { socials } from '../profiles'
</script>

<ul>
  {#each socials as p (p.url)}
    <li>
      <a href={p.url} target="_blank" rel="noopener">{p.label}</a>
      {#if p.handle}<span class="h">{p.handle}</span>{/if}
    </li>
  {/each}
</ul>

<style>
  ul { list-style: none; }
  li { display: flex; justify-content: space-between; gap: var(--s3); padding: 3px 0; font-size: 0.8125rem; }
  li + li { border-top: 1px dotted var(--dot); }
  .h { color: var(--text-2); }
</style>
