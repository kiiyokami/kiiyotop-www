import { writable, type Readable } from 'svelte/store'
import type { Snapshot } from './types'

export interface SnapshotState {
  status: 'loading' | 'ready' | 'error'
  data: Snapshot | null
  error: string | null
}

const POLL_MS = 30_000

const store = writable<SnapshotState>({ status: 'loading', data: null, error: null })

export const snapshot: Readable<SnapshotState> = { subscribe: store.subscribe }

async function load() {
  try {
    const res = await fetch('/api/snapshot')
    if (!res.ok) throw new Error(`${res.status} from the API`)
    const data = (await res.json()) as Snapshot
    store.set({ status: 'ready', data, error: null })
  } catch (e) {
    // A failed poll keeps the last good data on screen: a dropped request
    // should not blank a page that was already showing something true.
    store.update((s) => ({
      status: s.data ? 'ready' : 'error',
      data: s.data,
      error: e instanceof Error ? e.message : 'could not reach the API',
    }))
  }
}

export function startPolling(): () => void {
  void load()
  const id = setInterval(() => void load(), POLL_MS)
  return () => clearInterval(id)
}

export function _reset() {
  store.set({ status: 'loading', data: null, error: null })
}
