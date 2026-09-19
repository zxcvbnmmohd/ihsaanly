import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ArabicText } from '@/components/arabic-text'
import { EmptyState } from '@/components/empty-state'
import { EvidencePanel } from '@/components/evidence-panel'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { Href } from 'expo-router'

import type { Evidence, Ruling } from '@/content/schema'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'

export interface ItemDetail {
  ruling: Ruling
  repeat: number
  arabic: string | null
  transliteration: string | null
  translation: string | null
  note: string | null
  evidence: Evidence[]
}

export interface ItemScreenProps {
  item: ItemDetail | null
  memoriseHref: Href | null
}

interface LabelledProps {
  label: string
  children: ReactNode
}

function Labelled({ label, children }: LabelledProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

export function ItemScreen({ item, memoriseHref }: ItemScreenProps): ReactElement {
  const strings = useStrings()
  useColorScheme()

  if (!item) {
    return <EmptyState message={strings.notFound.body} />
  }

  return (
    <Screen className="gap-6 p-4">
      <View className="gap-2">
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.ruling[item.ruling]}
        </Text>
        {item.repeat > 1 ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.item.repeat(item.repeat)}
          </Text>
        ) : null}
      </View>

      {item.arabic ? <ArabicText>{item.arabic}</ArabicText> : null}

      {item.transliteration ? (
        <Labelled label={strings.item.transliteration}>
          <Text className="text-base italic" style={{ color: colors.label }}>
            {item.transliteration}
          </Text>
        </Labelled>
      ) : null}

      {item.translation ? (
        <Labelled label={strings.item.translation}>
          <Text className="text-base" style={{ color: colors.label }}>
            {item.translation}
          </Text>
        </Labelled>
      ) : null}

      {item.note ? (
        <Labelled label={strings.item.note}>
          <Text className="text-sm" style={{ color: colors.label }}>
            {item.note}
          </Text>
        </Labelled>
      ) : null}

      {memoriseHref ? <Row href={memoriseHref} title={strings.memorise.start} /> : null}

      <EvidencePanel evidence={item.evidence} />
    </Screen>
  )
}
