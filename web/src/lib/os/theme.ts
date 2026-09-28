import { writable, type Readable } from 'svelte/store'

export type Theme = 'light' | 'dark'

/** Read by the pre-paint script in web/index.html. Do not rename. */
export const THEME_KEY = 'kiiyo-theme'

const store = writable<Theme>('light')
export const theme: Readable<Theme> = { subscribe: store.subscribe }

function current(): Theme {
  const explicit = document.documentElement.getAttribute('data-theme')
  if (explicit === 'light' || explicit === 'dark') return explicit
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function syncTheme(): void {
  store.set(current())
}

export function toggleTheme(): Theme {
  const next: Theme = current() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  store.set(next)
  try {
    localStorage.setItem(THEME_KEY, next)
  } catch {
    // Private mode: the choice holds for this visit only.
  }
  return next
}
