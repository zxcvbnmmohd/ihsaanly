// Marketing's own store buttons, from the shared listing config: each store
// stays "coming soon" while its listing is null in @ihsaanly/web/app-links.
// The shared visual and interaction (real link vs. aria-disabled toast) live
// in @ihsaanly/web/store-badges.
import { APP_LINKS } from '@ihsaanly/web/app-links'
import { StoreBadges as SharedStoreBadges } from '@ihsaanly/web/store-badges'
import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'

export function StoreBadges(): ReactNode {
  const { t, a } = useSite()
  return (
    <SharedStoreBadges
      appStoreUrl={APP_LINKS.appStoreUrl}
      playUrl={APP_LINKS.playUrl}
      soonMessage={(store) => a('home.stores.soon').replace('{store}', store)}
      appStorePrefix={t('home.stores.appStorePrefix')}
      playPrefix={t('home.stores.playPrefix')}
      chromeWebStore={{
        url: APP_LINKS.chromeWebStoreUrl,
        // Google's official badge, downloaded from developer.chrome.com/docs/webstore/branding.
        imageSrc: '/assets/chrome-web-store-badge.png',
        alt: a('home.stores.chromeAlt'),
        soonPrefix: t('home.stores.chromePrefix'),
        soonMessage: a('home.stores.chromeSoon'),
      }}
    />
  )
}
