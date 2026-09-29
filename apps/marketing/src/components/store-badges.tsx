// Marketing's own store buttons: both stores are always "coming soon" while
// there is no listing to link to. The shared visual and interaction (real
// link vs. aria-disabled toast) live in @ihsaanly/web/store-badges.
import { StoreBadges as SharedStoreBadges } from '@ihsaanly/web/store-badges'
import type { ReactNode } from 'react'
import { useSite } from '~/i18n/use-site'

export function StoreBadges(): ReactNode {
  const { t, a } = useSite()
  return (
    <SharedStoreBadges
      appStoreUrl={null}
      playUrl={null}
      soonMessage={(store) => a('home.stores.soon').replace('{store}', store)}
      appStorePrefix={t('home.stores.appStorePrefix')}
      playPrefix={t('home.stores.playPrefix')}
    />
  )
}
