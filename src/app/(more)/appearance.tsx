import type { ReactElement } from 'react'

import { AppearanceScreen } from '@/screens/appearance'
import { setThemePreference, useThemePreference } from '@/theme/store'

export default function AppearanceRoute(): ReactElement {
  const preference = useThemePreference()

  return <AppearanceScreen preference={preference} onSelect={setThemePreference} />
}
