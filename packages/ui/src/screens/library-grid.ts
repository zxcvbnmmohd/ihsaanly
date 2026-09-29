import type { Layout } from '../layout-breakpoints'

/**
 * The percentage `flexBasis` one `LibraryCard` takes in the wrapping grid:
 * one across (a full-width row, matching the phone) at compact, two across
 * at regular, three at wide. Split out from `library.tsx` (which imports
 * react-native) so `bun test` can exercise it directly — the same reason
 * `layout-breakpoints.ts` is split from `layout.ts`. No CSS grid: this is a
 * plain flexbox `flexBasis`, so it runs on native and the web alike.
 */
export function columnBasisFor(layout: Layout): `${number}%` {
  if (layout === 'wide') return '31%'
  if (layout === 'regular') return '48%'
  return '100%'
}
