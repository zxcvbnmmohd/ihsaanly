import { content } from '@ihsaanly/core/content'
import { useStrings } from '@ihsaanly/state/strings'
import { AboutScreen } from '@ihsaanly/ui/screens/about'
import { APP_LINKS } from '@ihsaanly/web/app-links'
import { StoreBadges } from '@ihsaanly/web/store-badges'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'
import { openUrl } from '~/platform/open-url'

export const Route = createFileRoute('/_more/about')({ component: AboutRoute })

const PRIVACY_URL = 'https://ihsaanly.app/legal/privacy'
const TERMS_URL = 'https://ihsaanly.app/legal/terms'

const GEONAMES = { destination: 'geonames.org', url: 'https://www.geonames.org/about.html' }

/** Shown as a row's detail: the address without its scheme. Opens in a new tab. */
function page(url: string): { destination: string; onPress: () => void } {
  return {
    destination: url.replace('https://', ''),
    onPress: () => openUrl(url),
  }
}

const LICENCES = [
  {
    label: 'Amiri font (SIL Open Font Licence)',
    destination: 'scripts.sil.org/OFL',
    url: 'https://openfontlicense.org',
  },
  {
    label: 'Natural Earth map data',
    destination: 'naturalearthdata.com',
    url: 'https://www.naturalearthdata.com/about/terms-of-use/',
  },
]

function AboutRoute(): ReactElement {
  const strings = useStrings()
  const licences = [...LICENCES, { label: strings.about.geonames, ...GEONAMES }]

  return (
    <>
      <PageHeader title={strings.about.title} />
      <AboutScreen
        version="1.0.0"
        build={null}
        itemCount={content.items.length}
        reviewedBy={content.reviewedBy}
        // A donation product needs an in-app purchase or a store-billed page,
        // neither of which exists yet — nothing to offer here either.
        donate={null}
        privacy={page(PRIVACY_URL)}
        terms={page(TERMS_URL)}
        licences={licences.map(({ label, destination, url }) => ({
          label,
          destination,
          onPress: () => openUrl(url),
        }))}
      />
      <div className="flex-none p-4">
        <StoreBadges
          appStoreUrl={APP_LINKS.appStoreUrl}
          playUrl={APP_LINKS.playUrl}
          soonMessage={() => strings.web.getApp}
        />
      </div>
    </>
  )
}
