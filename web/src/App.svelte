<script lang="ts">
  import { onMount } from 'svelte'
  import { snapshot, startPolling } from './lib/snapshot'
  import Desktop from './lib/os/Desktop.svelte'

  onMount(() => startPolling())
</script>

<Desktop state={$snapshot} />
