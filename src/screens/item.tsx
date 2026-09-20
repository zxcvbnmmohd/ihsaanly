import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ArabicText } from '@/components/arabic-text'
import { Button } from '@/components/button'
import { Counter } from '@/components/counter'
import { EmptyState } from '@/components/empty-state'
import { EvidencePanel } from '@/components/evidence-panel'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { SwitchRow } from '@/components/switch-row'
import type { Href } from 'expo-router'

import type { Evidence, Ruling } from '@/content/schema'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface ItemDetail {
  ruling: Ruling
  repeat: number
  arabic: string | null
  transliteration: string | null
  translation: string | null
  note: string | null
  evidence: Evidence[]
}

export interface CounterState {
  count: number
  target: number
}

export interface RemindState {
  value: boolean
  detail: string
}

export interface ItemScreenProps {
  item: ItemDetail | null
  memoriseHref: Href | null
  done: boolean
  onToggleDone: () => void
  /** Present only when the item is repeated; the count lives with the route. */
  counter: CounterState | null
  onTapCounter: () => void
  onResetCounter: () => void
  onToday: boolean
  onToggleOnToday: () => void
  /** Present only when a reminder can actually be scheduled for this item. */
  remind: RemindState | null
  onToggleRemind: (value: boolean) => void
  onShareText: () => void
  onShareImage: () => void
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

export function ItemScreen({
  item,
  memoriseHref,
  done,
  onToggleDone,
  counter,
  onTapCounter,
  onResetCounter,
  onToday,
  onToggleOnToday,
  remind,
  onToggleRemind,
  onShareText,
  onShareImage,
}: ItemScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
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

      {counter && !done ? (
        <Counter
          count={counter.count}
          target={counter.target}
          onTap={onTapCounter}
          onReset={onResetCounter}
          resetLabel={strings.item.counterReset}
          palette={palette}
        />
      ) : null}

      <View className="gap-2">
        <Button
          title={done ? strings.item.undo : strings.item.done}
          onPress={onToggleDone}
          variant={done ? 'secondary' : 'primary'}
          color={palette.accent}
          onColor={palette.onAccent}
        />
        {done ? (
          <Text className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.item.doneToday}
          </Text>
        ) : null}
      </View>

      <Labelled label={strings.item.yourDay}>
        <View className="gap-3">
          <SwitchRow
            title={strings.item.onToday}
            detail={strings.item.onTodayDetail}
            value={onToday}
            onValueChange={onToggleOnToday}
            accent={palette.accent}
            knob={palette.knob}
          />
          {remind ? (
            <SwitchRow
              title={strings.item.remind}
              detail={remind.detail}
              value={remind.value}
              onValueChange={onToggleRemind}
              accent={palette.accent}
              knob={palette.knob}
            />
          ) : null}
        </View>
      </Labelled>

      <View className="gap-3">
        {memoriseHref ? <Row href={memoriseHref} title={strings.memorise.start} /> : null}
        <Row title={strings.item.shareText} onPress={onShareText} />
        <Row title={strings.item.shareImage} onPress={onShareImage} />
      </View>

      <EvidencePanel evidence={item.evidence} />
    </Screen>
  )
}
