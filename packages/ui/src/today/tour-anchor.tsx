import { createContext, type ReactNode } from 'react'

/**
 * Which Today row the first-run tour points at, and the coach mark to draw
 * under it. Today decides the row; whichever list renders that row draws the
 * mark, so the tour needs no measuring and lays out like everything else.
 */
export interface TourAnchor {
  id: string | null
  node: ReactNode
}

export const TourAnchorContext = createContext<TourAnchor>({ id: null, node: null })
