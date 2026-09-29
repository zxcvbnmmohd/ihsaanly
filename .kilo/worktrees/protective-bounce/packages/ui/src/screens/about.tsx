import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { serif } from '../fonts'
import { useUi } from '../provider'

export interface AboutScreenProps {
  version: string
  build: string | null
  itemCount: number
  reviewedBy: string | null
  /** Null where there is nothing to offer yet, which is iOS until the gift exists. */
  donate: { destination: string; onPress: () => void } | null
  /** The licences worth reading in full, rather than only named in a paragraph. */
  licences: { label: string; destination: string; onPress: () => void }[]
  /** The published policy, which both stores require to be reachable. */
  privacy: { destination: string; onPress: () => void }
}

interface BlockProps {
  title: string
  children: ReactNode
}

function Block({ title, children }: BlockProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-2">
      <Text className="font-semibold text-xl" style={{ fontFamily: serif, color: colors.label }}>
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
  licences,
  privacy,
}: AboutScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

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
        <Row
          title={strings.about.privacyPolicy}
          detail={privacy.destination}
          onPress={privacy.onPress}
        />
      </Block>

      <Block title={strings.about.licences}>
        <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
          {strings.about.licencesBody}
        </Text>
        {licences.map((licence) => (
          <Row
            key={licence.destination}
            title={licence.label}
            detail={licence.destination}
            onPress={licence.onPress}
          />
        ))}
      </Block>
    </Screen>
  )
}
