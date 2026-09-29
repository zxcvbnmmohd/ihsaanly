import { MOON_SIGHTING_AUTHORITIES } from '@ihsaanly/core/content/moon-sighting'
import { setHijriOffset, useHijriOffset } from '@ihsaanly/state/hijri/store'
import { useHijriDate } from '@ihsaanly/state/hijri/use-hijri-date'
import { useStrings } from '@ihsaanly/state/strings'
import { HijriScreen } from '@ihsaanly/ui/screens/hijri'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_more/hijri')({ component: HijriRoute })

function HijriRoute(): ReactElement {
  const strings = useStrings()
  const offset = useHijriOffset()
  const preview = useHijriDate()

  return (
    <>
      <PageHeader title={strings.hijri.title} />
      <HijriScreen
        offset={offset}
        preview={preview}
        authorities={MOON_SIGHTING_AUTHORITIES}
        onChange={setHijriOffset}
      />
    </>
  )
}
