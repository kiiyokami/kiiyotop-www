<script lang="ts">
  import type { SnapshotState } from '../snapshot'
  import { count } from '../format'
  import { profiles } from '../profiles'
  import Skeleton from '../ui/Skeleton.svelte'
  import { SERVER_DOWN, unreachable } from './notes'

  let { state }: { state: SnapshotState } = $props()
  let d = $derived(state.data?.vndb ?? null)
</script>

{#if state.status === 'loading'}
  <Skeleton lines={4} />
{:else if state.status === 'error'}
  <p class="note">{SERVER_DOWN}</p>
{:else if !d}
  <p class="note">{unreachable('VNDB')}</p>
{:else}
  <div class="cols">
    <section>
      <p class="label">reading</p>
      {#if d.reading.length > 0}
        <ul class="covers">
          <!-- Keyed by position: two entries can share a title. -->
          {#each d.reading.slice(0, 3) as vn, i (i)}
            <li>
              <!-- The server withholds covers VNDB voters flag; those get a blank tile. -->
              {#if vn.image}
                <img class="tile" src={vn.image} alt="" loading="lazy" referrerpolicy="no-referrer" />
              {:else}
                <span class="tile blank" aria-hidden="true"></span>
              {/if}
              <span class="t">{vn.title}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="note">Not reading anything on VNDB right now.</p>
      {/if}
    </section>

    <section>
      <p class="label">favourites</p>
      {#if d.rated.length > 0}
        <ol>
          {#each d.rated.slice(0, 5) as vn, i (i)}
            <li><span class="name">{vn.title}</span> <span class="num">{vn.score.toFixed(1)}</span></li>
          {/each}
        </ol>
      {:else}
        <p class="note">No rated VNs yet.</p>
      {/if}
    </section>
  </div>
{/if}

<p class="foot">
  {#if d}<span class="num">{count(d.finished)}{d.finished_more ? '+' : ''} finished · {count(d.wishlist)}{d.wishlist_more ? '+' : ''} wishlist</span>{/if}
  <a href={profiles.vndb.url} target="_blank" rel="noopener">VNDB</a>
</p>

<style>
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: var(--s4); }
  .label { margin-bottom: var(--s2); }

  .covers { list-style: none; display: grid; grid-template-columns: repeat(3, 64px); gap: var(--s2); }
  .tile {
    display: block;
    width: 64px;
    height: 88px;
    object-fit: cover;
    border: 1px solid var(--ink);
    background: var(--bar);
  }
  .t {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-top: var(--s1);
    font-size: 0.6875rem;
    line-height: 1.3;
  }

  ol { list-style: none; }
  ol li { display: flex; justify-content: space-between; gap: var(--s3); padding: 2px 0; font-size: 0.8125rem; }
  ol li + li { border-top: 1px dotted var(--dot); }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .num, .note { color: var(--text-2); }
  .note { font-size: 0.75rem; }
  .foot { display: flex; justify-content: space-between; gap: var(--s3); margin-top: var(--s3); font-size: 0.75rem; }
</style>
