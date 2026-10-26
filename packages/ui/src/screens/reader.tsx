import type { ReadingLayout } from '@ihsaanly/core/content/reading'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { type ReactElement, useId } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { ArabicText } from '../components/arabic-text'
import { Button } from '../components/button'
import { EmptyState } from '../components/empty-state'
import { Screen } from '../components/screen'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { CounterState } from './item'

/** One text to say: the item itself, or one of its parts. Resolved to the reader's language. */
export interface ReaderPage {
  id: string
  /** The part's own name; null for an item that is a single text. */
  title: string | null
  arabic: string
  transliteration: string | null
  translation: string | null
}

export interface ReaderScreenProps {
  /** The item's name, for the counter's spoken label. */
  title: string
  /** Empty when the item is unknown or has nothing to read. */
  pages: ReaderPage[]
  /** The page showing, an index into `pages`. */
  page: number
  onPage: (page: number) => void
  /** Present when the page showing is said more than once; the count lives with the route. */
  counter: CounterState | null
  onTapCounter: () => void
  onDone: () => void
  /** Opens the full item screen: why, evidence, reminders. */
  onMore: () => void
  /** The reader's order and alignment, as on the item screen. */
  reading: ReadingLayout
}

interface TapAreaProps {
  label: string
  counter: CounterState
  onTap: () => void
}

/** The whole width is the target, so counting needs no looking. */
function TapArea({ label, counter, onTap }: TapAreaProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const complete = counter.count >= counter.target
  const progressId = useId()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ now: counter.count, max: counter.target, min: 0 }}
      aria-describedby={progressId}
      onPress={onTap}
      disabled={complete}
      className="items-center justify-center gap-1"
      style={{
        minHeight: 220,
        borderRadius: 28,
        borderCurve: 'continuous',
        borderWidth: 2,
        borderColor: palette.accent,
        backgroundColor: complete ? palette.accent : undefined,
      }}>
      <View nativeID={progressId} className="items-center">
        <Text
          className="text-6xl"
          maxFontSizeMultiplier={2}
          style={{
            fontFamily: serif,
            fontWeight: '600',
            color: complete ? palette.onAccent : colors.label,
          }}>
          {complete ? '✓' : counter.count}
        </Text>
        <Text
          className="text-base"
          style={{ color: complete ? palette.onAccent : colors.secondaryLabel }}>
          {complete ? `${counter.target}` : `/ ${counter.target}`}
        </Text>
      </View>
      {complete ? null : (
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.panel.tapToCount}
        </Text>
      )}
    </Pressable>
  )
}

/**
 * Read it and mark it done: the words large, a counter when they are said
 * more than once, and one way out. Everything else about the item is a tap
 * away on its own screen.
 */
export function ReaderScreen({
  title,
  pages,
  page,
  onPage,
  counter,
  onTapCounter,
  onDone,
  onMore,
  reading,
}: ReaderScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const current = pages[page]

  if (!current) return <EmptyState message={strings.notFound.body} />

  const paged = pages.length > 1
  const last = page === pages.length - 1
  // The transliteration stays with the Arabic it spells out; only the meaning moves.
  const align = reading.align === 'center' ? 'text-center' : 'text-start'
  const meaning = current.translation ? (
    <Text className={`${align} text-lg leading-relaxed`} style={{ color: colors.label }}>
      {current.translation}
    </Text>
  ) : null

  return (
    <Screen palette={palette} className="grow justify-between gap-8 p-6">
      <View className="gap-6">
        {paged ? (
          <View className="flex-row flex-wrap items-baseline justify-between gap-2">
            <Text
              accessibilityRole="header"
              className="flex-1 font-semibold text-base"
              style={{ color: colors.label }}>
              {current.title}
            </Text>
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {strings.reader.page(page + 1, pages.length)}
            </Text>
          </View>
        ) : null}

        <View className="gap-4">
          {reading.arabicFirst ? null : meaning}
          <ArabicText variant="hero" align={reading.align}>
            {current.arabic}
          </ArabicText>
          {current.transliteration ? (
            <Text
              className={`${align} text-lg italic leading-relaxed`}
              style={{ color: colors.secondaryLabel }}>
              {current.transliteration}
            </Text>
          ) : null}
          {reading.arabicFirst ? meaning : null}
        </View>

        {counter ? <TapArea label={title} counter={counter} onTap={onTapCounter} /> : null}
      </View>

      <View className="gap-3">
        {paged ? (
          <View className="flex-row justify-between gap-3">
            <Button
              title={strings.reader.previous}
              onPress={() => onPage(page - 1)}
              variant="secondary"
              color={palette.accent}
              disabled={page === 0}
            />
            <Button
              title={strings.reader.next}
              onPress={() => onPage(page + 1)}
              variant="secondary"
              color={palette.accent}
              disabled={last}
            />
          </View>
        ) : null}
        <Button
          title={strings.item.done}
          onPress={onDone}
          color={palette.accent}
          onColor={palette.onAccent}
        />
        <Pressable accessibilityRole="link" onPress={onMore} className="items-center py-2">
          <Text
            className="font-semibold text-sm"
            style={{ color: palette.accent, textDecorationLine: 'underline' }}>
            {strings.reader.more}
          </Text>
        </Pressable>
      </View>
    </Screen>
  )
}
