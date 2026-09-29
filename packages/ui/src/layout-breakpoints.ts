// The pure half of layout.ts, split out so `layout.test.ts` can import
// `layoutFor` without pulling in `react-native`: every packages/ui test
// carefully avoids that import graph, because the published react-native
// package ships Flow syntax `bun test` cannot parse (Metro and Vite strip it;
// bun's test runner has nothing to). `layout.ts` re-exports all of this for
// `@ihsaanly/ui/layout` — this file has no export of its own in package.json.

/**
 * `compact` is every phone; `regular` is an iPad in portrait or a narrow
 * browser window; `wide` is an iPad in landscape or a laptop. Screens branch
 * on this with plain flexbox — no `md:` classes, no CSS grid — so the same
 * JSX renders correctly on the iPad and in the browser.
 */
export type Layout = 'compact' | 'regular' | 'wide'

/** `regular` starts at this width, `wide` at the next; below `regular` is `compact`. */
export const LAYOUT_BREAKPOINTS = { regular: 768, wide: 1100 } as const

export function layoutFor(width: number): Layout {
  if (width >= LAYOUT_BREAKPOINTS.wide) return 'wide'
  if (width >= LAYOUT_BREAKPOINTS.regular) return 'regular'
  return 'compact'
}
