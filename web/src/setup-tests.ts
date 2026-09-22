import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/svelte'
import { afterEach } from 'vitest'

// @testing-library/svelte does not auto-register cleanup unless vitest's
// globals are enabled, and this project keeps globals off. Without this,
// components mounted by one test stay in the DOM for the next.
afterEach(() => cleanup())

// jsdom does not implement window.matchMedia. Components that read the
// user's colour-scheme preference (ThemeToggle) need it defined, so tests
// get a neutral stand-in that always reports "no preference" unless a test
// overrides it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}
