import { updateReaderPreferences, useReaderPreferences } from '@ihsaanly/state/reader/store'
import { AppearanceScreen } from '@ihsaanly/ui/screens/appearance'
import type { ReactElement } from 'react'
import { setThemePreference, useThemePreference } from '@/theme/store'

export default function AppearanceRoute(): ReactElement {
  const preference = useThemePreference()
  const reader = useReaderPreferences()

  return (
    <AppearanceScreen
      preference={preference}
      onSelect={setThemePreference}
      reading={{ arabicFirst: reader.arabicFirst, align: reader.align }}
      onReading={updateReaderPreferences}
    />
  )
}
