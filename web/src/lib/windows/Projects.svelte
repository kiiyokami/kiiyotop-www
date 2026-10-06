<script lang="ts">
  import { profiles, projects } from '../profiles'
</script>

<ul>
  {#each projects as p (p.url)}
    <li>
      <div class="top">
        <a class="name" href={p.url} target="_blank" rel="noopener">{p.name}</a>
        <span class="meta num">{p.lang}</span>
      </div>
      {#if p.blurb}<p class="desc">{p.blurb}</p>{/if}
    </li>
  {/each}
</ul>

<p class="foot"><a href={profiles.github.url} target="_blank" rel="noopener">all repos on GitHub</a></p>

<style>
  ul { list-style: none; }
  li { padding: var(--s1) 0; }
  li + li { border-top: 1px dotted var(--dot); }
  .top { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s3); }
  .name { font-weight: 600; font-size: 0.8125rem; }
  .meta, .desc { color: var(--text-2); font-size: 0.75rem; }
  .meta { flex: none; }
  .foot { margin-top: var(--s2); font-size: 0.75rem; }
</style>
