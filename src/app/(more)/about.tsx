import Constants from 'expo-constants'
import type { ReactElement } from 'react'

import { content } from '@/content'
import { AboutScreen } from '@/screens/about'

export default function AboutRoute(): ReactElement {
  return (
    <AboutScreen
      version={Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? '0'}
      build={Constants.nativeBuildVersion}
      itemCount={content.items.length}
      reviewedBy={content.reviewedBy}
    />
  )
}
