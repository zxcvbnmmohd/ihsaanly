import Constants from 'expo-constants'
import type { ReactElement } from 'react'
import { Linking, Platform } from 'react-native'

import { content } from '@/content'
import { AboutScreen } from '@/screens/about'

/** Shown as the row's detail, so the destination is known before the tap. */
const DONATION_HOST = 'donate.ihsaanly.com'

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
    />
  )
}
