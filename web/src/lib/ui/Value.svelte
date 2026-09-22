<script lang="ts">
  let { value }: { value: string | number } = $props()

  let shown = $state(value)
  let fading = $state(false)

  // MOTION 1's single exception: a changed value crossfades over 160ms so the
  // page visibly registers that it is live. Nothing else on the page moves.
  $effect(() => {
    if (value === shown) return
    fading = true
    const t = setTimeout(() => { shown = value; fading = false }, 160)
    return () => clearTimeout(t)
  })
</script>

<span class="v" class:fading>{shown}</span>

<style>
  .v { transition: opacity var(--t); }
  .fading { opacity: 0; }
  @media (prefers-reduced-motion: reduce) {
    .v { transition: none; }
    .fading { opacity: 1; }
  }
</style>
