import { updateReaderPreferences, useReaderPreferences } from '@ihsaanly/state/reader/store'
import { setAccent, useAccent } from '@ihsaanly/state/theme/accent-store'
import { AppearanceScreen } from '@ihsaanly/ui/screens/appearance'
import type { ReactElement } from 'react'
import { setThemePreference, useThemePreference } from '@/theme/store'

export default function AppearanceRoute(): ReactElement {
  const preference = useThemePreference()
  const accent = useAccent()
  const reader = useReaderPreferences()

  return (
    <AppearanceScreen
      preference={preference}
      onSelect={setThemePreference}
      accent={accent}
      onSelectAccent={setAccent}
      reading={{ arabicFirst: reader.arabicFirst, align: reader.align }}
      onReading={updateReaderPreferences}
    />
  )
}
