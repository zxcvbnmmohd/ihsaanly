import { useMoreGroups } from '@ihsaanly/state/more/rows'
import { useStrings } from '@ihsaanly/state/strings'
import { MoreScreen } from '@ihsaanly/ui/screens/more'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { cloudEnabled } from '~/cloud'
import { PageHeader } from '~/components/page-header'
import { useThemePreference } from '~/theme/store'

export const Route = createFileRoute('/settings')({ component: SettingsRoute })

/** The rows of the app's More list that have a screen in the popup. */
const IN_POPUP = new Set([
  '/location',
  '/calculation',
  '/hijri',
  '/notifications',
  '/language',
  '/appearance',
  '/qada',
  '/account',
])

function SettingsRoute(): ReactElement {
  const strings = useStrings()
  const groups = useMoreGroups(useThemePreference(), cloudEnabled)
    .map((group) => ({ ...group, rows: group.rows.filter((row) => IN_POPUP.has(row.href)) }))
    .filter((group) => group.rows.length > 0)

  return (
    <>
      <PageHeader title={strings.more.title} />
      <MoreScreen groups={groups} />
    </>
  )
}
