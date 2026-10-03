import { useMoreGroups } from '@ihsaanly/state/more/rows'
import { useStrings } from '@ihsaanly/state/strings'
import { MoreScreen } from '@ihsaanly/ui/screens/more'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { cloudEnabled } from '~/cloud'
import { PageHeader } from '~/components/page-header'
import { GEONAMES_URL, PRIVACY_URL, TERMS_URL } from '~/legal'
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
  '/feedback',
])

/**
 * The popup has no About screen, so the pages the stores and the sign-in
 * notice point to are linked here, with the GeoNames credit its licence asks for.
 */
const LINKS = [
  { key: 'privacy', url: PRIVACY_URL },
  { key: 'terms', url: TERMS_URL },
  { key: 'geonames', url: GEONAMES_URL },
] as const

function SettingsRoute(): ReactElement {
  const strings = useStrings()
  const groups = useMoreGroups(useThemePreference(), cloudEnabled)
    .map((group) => ({ ...group, rows: group.rows.filter((row) => IN_POPUP.has(row.href)) }))
    .filter((group) => group.rows.length > 0)

  return (
    <>
      <PageHeader title={strings.more.title} />
      <MoreScreen groups={groups} />
      <nav className="flex flex-none flex-wrap gap-x-4 gap-y-1 px-4 pb-4 text-sm">
        {LINKS.map(({ key, url }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-ink underline">
            {key === 'privacy'
              ? strings.about.privacyPolicy
              : key === 'terms'
                ? strings.about.termsOfUse
                : strings.about.geonames}
          </a>
        ))}
      </nav>
    </>
  )
}
