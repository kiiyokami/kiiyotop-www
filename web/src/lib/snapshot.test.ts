import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { get } from 'svelte/store'

const empty = {
  now: { discord: null, listening: null, playing: null },
  lastfm: null, steam: null, cs2: null, osu: null, vndb: null, github: null,
}

let snapshot: typeof import('./snapshot').snapshot
let startPolling: typeof import('./snapshot').startPolling

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  ;({ snapshot, startPolling } = await import('./snapshot'))
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('snapshot store', () => {
  it('starts in the loading state with no data', () => {
    expect(get(snapshot).status).toBe('loading')
    expect(get(snapshot).data).toBeNull()
  })

  it('moves to ready and holds the parsed body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve(empty),
    }))
    const stop = startPolling()
    await vi.waitFor(() => expect(get(snapshot).status).toBe('ready'))
    expect(get(snapshot).data).toEqual(empty)
    stop()
  })

  it('records an error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const stop = startPolling()
    await vi.waitFor(() => expect(get(snapshot).status).toBe('error'))
    expect(get(snapshot).error).toBeTruthy()
    stop()
  })

  it('keeps the last good data when a later poll fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(empty) })
      .mockRejectedValueOnce(new Error('offline'))
    vi.stubGlobal('fetch', fetchMock)

    const stop = startPolling()
    await vi.waitFor(() => expect(get(snapshot).status).toBe('ready'))
    await vi.advanceTimersByTimeAsync(30_000)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expect(get(snapshot).data).toEqual(empty)
    stop()
  })

  it('stops polling once the returned function is called', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(empty) })
    vi.stubGlobal('fetch', fetchMock)
    const stop = startPolling()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    stop()
    await vi.advanceTimersByTimeAsync(90_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
