<script lang="ts">
  let { lines = 3 }: { lines?: number } = $props()
</script>

<div aria-hidden="true">
  {#each Array(lines) as _, i (i)}
    <div class="line" style:width={`${72 - i * 11}%`}></div>
  {/each}
</div>

<style>
  /* The only user of --surface. MOTION 1: this does not shimmer or pulse. */
  .line {
    height: 0.8125rem;
    margin-bottom: var(--s2);
    background: var(--surface);
    border-radius: var(--r-small);
  }
</style>
