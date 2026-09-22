import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { usePalette } from '@/theme/store'

export interface AboutScreenProps {
  version: string
  build: string | null
  itemCount: number
  reviewedBy: string | null
  /** Null where there is nothing to offer yet, which is iOS until the gift exists. */
  donate: { destination: string; onPress: () => void } | null
}

interface BlockProps {
  title: string
  children: ReactNode
}

function Block({ title, children }: BlockProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-2">
      <Text
        className="text-xl"
        style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

/** What this is, what it holds, and what it promises about your data. */
export function AboutScreen({
  version,
  build,
  itemCount,
  reviewedBy,
  donate,
}: AboutScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-8 p-4">
      <View className="gap-3">
        <Row title={strings.about.version} detail={build ? `${version} (${build})` : version} />
        <Row
          title={strings.about.content}
          detail={
            reviewedBy
              ? strings.about.contentReviewedBy(reviewedBy, itemCount)
              : strings.about.contentUnreviewed(itemCount)
          }
        />
      </View>

      {donate ? (
        <View className="gap-3">
          <Row title={strings.about.donate} detail={donate.destination} onPress={donate.onPress} />
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.about.donateBody}
          </Text>
        </View>
      ) : null}

      <Block title={strings.about.privacyTitle}>
        <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
          {strings.about.privacyBody}
        </Text>
      </Block>

      <Block title={strings.about.licences}>
        <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
          {strings.about.licencesBody}
        </Text>
      </Block>
    </Screen>
  )
}
