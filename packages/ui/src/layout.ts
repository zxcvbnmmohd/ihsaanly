import { useWindowDimensions } from 'react-native'

import { type Layout, layoutFor } from './layout-breakpoints'
import { useUi } from './provider'

export { LAYOUT_BREAKPOINTS, type Layout, layoutFor } from './layout-breakpoints'

/**
 * `useWindowDimensions()` works on native and react-native-web, so this needs
 * no platform split. `UiContextValue.layout`, when a host sets it, wins over
 * the measurement — that is what lets a fixture or a test render any of the
 * three layouts without a real window.
 */
export function useLayout(): Layout {
  const { layout } = useUi()
  const { width } = useWindowDimensions()
  return layout ?? layoutFor(width)
}
