import type { ReactElement } from 'react'

import { MOON_SIGHTING_AUTHORITIES } from '@/content/moon-sighting'
import { MoonSightingScreen } from '@/screens/moon-sighting'

export default function MoonSightingRoute(): ReactElement {
  return <MoonSightingScreen authorities={MOON_SIGHTING_AUTHORITIES} />
}
