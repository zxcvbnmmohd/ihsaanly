import { AppearanceScreen } from '@ihsaanly/ui/screens/appearance'
import type { ReactElement } from 'react'
import { setThemePreference, useThemePreference } from '@/theme/store'

export default function AppearanceRoute(): ReactElement {
  const preference = useThemePreference()

  return <AppearanceScreen preference={preference} onSelect={setThemePreference} />
}
