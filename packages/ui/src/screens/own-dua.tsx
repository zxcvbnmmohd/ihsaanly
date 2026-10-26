import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors, usePalette } from '../colors'
import { ArabicText } from '../components/arabic-text'
import { Button } from '../components/button'
import { Counter } from '../components/counter'
import { EmptyState } from '../components/empty-state'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { useUi } from '../provider'
import type { CounterState } from './item'

/** A dua the user wrote, as they wrote it. */
export interface OwnDuaDetail {
  title: string
  arabic: string | null
  transliteration: string | null
  text: string | null
  repeat: number
  /** Its moment, already named ("After Fajr"); null when it has none. */
  moment: string | null
}

export interface OwnDuaScreenProps {
  dua: OwnDuaDetail | null
  done: boolean
  onToggleDone: () => void
  /** Present only when it is repeated; the count lives with the route. */
  counter: CounterState | null
  onTapCounter: () => void
  onResetCounter: () => void
  editHref: string
  /** The route confirms first. */
  onDelete: () => void
}

/**
 * The reader for one of the user's own duas. No ruling, no evidence and no
 * review line: none of those can be said of someone's own words.
 */
export function OwnDuaScreen({
  dua,
  done,
  onToggleDone,
  counter,
  onTapCounter,
  onResetCounter,
  editHref,
  onDelete,
}: OwnDuaScreenProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const palette = usePalette()

  if (!dua) {
    return <EmptyState message={strings.notFound.body} />
  }

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <View className="gap-1">
        <Text className="font-semibold text-sm" style={{ color: palette.accent }}>
          {strings.myDuas.yours}
        </Text>
        {dua.repeat > 1 ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.item.repeat(dua.repeat)}
          </Text>
        ) : null}
        {dua.moment ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {`${strings.myDuas.remind} · ${dua.moment}`}
          </Text>
        ) : null}
      </View>

      <Surface style={{ borderRadius: 24, padding: 22 }}>
        <View className="items-center gap-3">
          {dua.arabic ? <ArabicText variant="hero">{dua.arabic}</ArabicText> : null}
          {dua.transliteration ? (
            <Text className="text-center text-base italic" style={{ color: colors.secondaryLabel }}>
              {dua.transliteration}
            </Text>
          ) : null}
          {dua.text ? (
            <Text className="text-center text-base leading-relaxed" style={{ color: colors.label }}>
              {dua.text}
            </Text>
          ) : null}
        </View>
      </Surface>

      {counter && !done ? (
        <Counter
          label={dua.title}
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

      <View className="gap-3">
        <Row href={editHref} title={strings.myDuas.edit} />
        <Row title={strings.myDuas.delete} onPress={onDelete} />
      </View>
    </Screen>
  )
}
