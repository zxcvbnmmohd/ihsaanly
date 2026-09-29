// The fourteen settings pages that live inside the More layout
// (routes/_more/route.tsx) and its index redirect (routes/_more/more.tsx)
// share this list: the local-storage key that remembers the last one
// visited, and the literal paths valid to redirect or highlight.
export const LAST_MORE_PAGE_KEY = 'ihsaanly.more.last'

export const MORE_PATHS = [
  '/about',
  '/account',
  '/appearance',
  '/calculation',
  '/data',
  '/diagnostics',
  '/events',
  '/hijri',
  '/history',
  '/language',
  '/location',
  '/notifications',
  '/qada',
  '/tracking',
] as const

export type MorePath = (typeof MORE_PATHS)[number]
