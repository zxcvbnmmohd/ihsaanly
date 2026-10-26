import { updateReaderPreferences, useReaderPreferences } from '@ihsaanly/state/reader/store'
import { useStrings } from '@ihsaanly/state/strings'
import { AppearanceScreen } from '@ihsaanly/ui/screens/appearance'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'
import { setThemePreference, useThemePreference } from '~/theme/store'

export const Route = createFileRoute('/appearance')({ component: AppearanceRoute })

function AppearanceRoute(): ReactElement {
  const strings = useStrings()
  const preference = useThemePreference()
  const reader = useReaderPreferences()

  return (
    <>
      <PageHeader title={strings.appearance.title} />
      <AppearanceScreen
        preference={preference}
        onSelect={setThemePreference}
        reading={{ arabicFirst: reader.arabicFirst, align: reader.align }}
        onReading={updateReaderPreferences}
      />
    </>
  )
}
