import Constants from 'expo-constants'
import type { ReactElement } from 'react'
import { Linking, Platform } from 'react-native'

import { content } from '@/content'
import { AboutScreen } from '@/screens/about'

/** Shown as the row's detail, so the destination is known before the tap. */
const DONATION_HOST = 'donate.ihsaanly.app'
const PRIVACY_URL = 'https://zxcvbnmmohd.github.io/ihsaanly/legal/privacy-policy'

/**
 * The two licences a reader might actually want in full. The rest are named in
 * the paragraph above them; these two are the ones this app redistributes —
 * a font face and a map — so the terms travel with it.
 *
 * The privacy policy is not here yet on purpose: its address is known, but a
 * link that answers 404 is worse than the paragraph beside it. It goes in when
 * the page is live.
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
  return (
    <AboutScreen
      version={Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? '0'}
      build={Constants.nativeBuildVersion}
      itemCount={content.items.length}
      reviewedBy={content.reviewedBy}
      donate={donation()}
      privacy={{
        destination: PRIVACY_URL.replace('https://', ''),
        onPress: (): void => {
          void Linking.openURL(PRIVACY_URL)
        },
      }}
      licences={LICENCES.map(({ label, destination, url }) => ({
        label,
        destination,
        onPress: (): void => {
          void Linking.openURL(url)
        },
      }))}
    />
  )
}
