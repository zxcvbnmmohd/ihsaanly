import { content } from '@ihsaanly/core/content'
import { useStrings } from '@ihsaanly/state/strings'
import { AboutScreen } from '@ihsaanly/ui/screens/about'
import Constants from 'expo-constants'
import type { ReactElement } from 'react'
import { Linking, Platform } from 'react-native'
import { LEGAL_URLS } from '@/cloud'

/** Shown as the row's detail, so the destination is known before the tap. */
const DONATION_HOST = 'donate.ihsaanly.app'

/**
 * The licences a reader might actually want in full. The rest are named in the
 * paragraph above them; these are the data this app redistributes — a font
 * face, a map and the city list — so the terms travel with it. GeoNames'
 * CC BY 4.0 asks for the credit, which is its label (localised, in the route).
 */
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

const GEONAMES = {
  destination: 'geonames.org',
  url: 'https://www.geonames.org/about.html',
}

/** Shown as a row's detail: the address without its scheme. */
function page(url: string): { destination: string; onPress: () => void } {
  return {
    destination: url.replace('https://', ''),
    onPress: (): void => {
      void Linking.openURL(url)
    },
  }
}

/**
 * Android hands off to the browser: a contribution where the whole amount
 * reaches the recipient and nothing in the app is unlocked sits outside Play's
 * billing requirement. iOS gets a purchase instead, and until that product
 * exists there is nothing to show there.
 */
function donation(): { destination: string; onPress: () => void } | null {
  if (Platform.OS !== 'android') return null

  return {
    destination: DONATION_HOST,
    onPress: (): void => {
      void Linking.openURL(`https://${DONATION_HOST}`)
    },
  }
}

export default function AboutRoute(): ReactElement {
  const strings = useStrings()
  const licences = [...LICENCES, { label: strings.about.geonames, ...GEONAMES }]

  return (
    <AboutScreen
      version={Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? '0'}
      build={Constants.nativeBuildVersion}
      itemCount={content.items.length}
      reviewedBy={content.reviewedBy}
      donate={donation()}
      privacy={page(LEGAL_URLS.privacy)}
      terms={page(LEGAL_URLS.terms)}
      licences={licences.map(({ label, destination, url }) => ({
        label,
        destination,
        onPress: (): void => {
          void Linking.openURL(url)
        },
      }))}
    />
  )
}
