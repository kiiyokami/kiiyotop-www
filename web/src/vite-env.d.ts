/// <reference types="vite/client" />

// svelte-check 4.7.6 does not resolve the ambient `*.svelte` module
// declaration shipped inside node_modules/svelte/types/index.d.ts when
// TypeScript 6 is the active compiler (plain `tsc --noEmit` is unaffected;
// this is specific to svelte-check's bundled language service). Declaring
// it locally works around that until upstream catches up with TS 6.
declare module '*.svelte' {
  import type { Component } from 'svelte'
  const component: Component<any>
  export default component
}
