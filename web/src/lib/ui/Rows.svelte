<script lang="ts">
  let { rows }: { rows: { label: string, value: string }[] } = $props()
</script>

<dl>
  {#each rows as row (row.label)}
    <div class="row">
      <dt>{row.label}</dt>
      <dd class="num">{row.value}</dd>
    </div>
  {/each}
</dl>

<style>
  dl { display: grid; gap: var(--s1); }
  .row { display: flex; justify-content: space-between; gap: var(--s3); align-items: baseline; }
  dt { color: var(--text-2); font-size: 0.8125rem; }
  dd { font-size: 0.8125rem; }
</style>
