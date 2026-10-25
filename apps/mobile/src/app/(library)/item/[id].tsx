import { itemById, resolveText } from '@ihsaanly/core/content'
import { formatShareText, sourceFor } from '@ihsaanly/core/content/share-text'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows, windowAt } from '@ihsaanly/core/prayer/windows'
import { usePlace } from '@ihsaanly/state/location/store'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import {
  setNotificationPreferences,
  useNotificationPreferences,
} from '@ihsaanly/state/notifications/store'
import { completeItem, uncompleteItem, useCompletedToday } from '@ihsaanly/state/plan/completions'
import { toggleEnabled, useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { usePlan } from '@ihsaanly/state/plan/use-plan'
import { useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { useStrings } from '@ihsaanly/state/strings'
import { useAccent } from '@ihsaanly/state/theme/accent-store'
import { useNow } from '@ihsaanly/state/time/use-now'
import { ShareCard } from '@ihsaanly/ui/components/share-card'
import { ShareStudio } from '@ihsaanly/ui/components/share-studio'
import { cardFor, remindFor } from '@ihsaanly/ui/props/item'
import {
  DEFAULT_SHARE_OPTIONS,
  type ShareCardOptions,
  shareCardTheme,
} from '@ihsaanly/ui/props/share-card'
import { ItemScreen } from '@ihsaanly/ui/screens/item'
import * as Haptics from 'expo-haptics'
import { Stack, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { type ComponentRef, type ReactElement, useRef, useState } from 'react'
// Clipboard is deprecated in React Native core but still ships its native
// module, so Copy text needs no new native dependency or rebuild. Swap for
// expo-clipboard when the next native build goes out anyway.
import { Clipboard, Share, View } from 'react-native'
import { captureRef } from 'react-native-view-shot'
import { paletteFor } from '@/theme/colors'
import { usePalette } from '@/theme/store'

interface Thing {
  count: number
  /** The share studio is open. */
  studio: boolean
  share: ShareCardOptions
  /** A line under the studio's actions, such as "Copied". */
  notice: string | null
}

export default function ItemRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({
    count: 0,
    studio: false,
    share: DEFAULT_SHARE_OPTIONS,
    notice: null,
  })
  const cardRef = useRef<ComponentRef<typeof View>>(null)
  const strings = useStrings()
  const palette = usePalette()
  const accent = useAccent()
  const { id } = useLocalSearchParams<{ id: string }>()
  const item = itemById(id)
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const now = useNow()
  const planned = usePlan()
  const completedToday = useCompletedToday(place?.timeZone ?? 'UTC', now)
  const enabled = useEnabledItems()
  const known = useKnownItems()
  const notifications = useNotificationPreferences()

  const title = item ? resolveText(item.title) : null
  const timeZone = place?.timeZone ?? 'UTC'
  const isEnabled = item ? enabled.includes(item.id) : false
  // Open in the plan means the completion, if any, belongs to an earlier occasion.
  const open = item
    ? (planned?.today.now.some((entry) => entry.itemId === item.id) ?? false)
    : false
  const done = item ? completedToday[item.id] !== undefined && !open : false

  const currentWindow = (): { startsAt: Date; endsAt: Date } | undefined => {
    if (!place) return undefined
    return windowAt(now, buildWindows(prayerTimesAcross(place, now, calculation))) ?? undefined
  }

  const complete = (): void => {
    if (!item) return
    completeItem(item.id, new Date(), timeZone, currentWindow())
  }

  const toggleDone = (): void => {
    if (!item) return
    if (done) {
      uncompleteItem(item.id, new Date(), timeZone)
      setThing((current) => ({ ...current, count: 0 }))
      return
    }
    complete()
  }

  const tapCounter = (): void => {
    if (!item) return
    const next = thing.count + 1
    if (next >= item.repeat) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setThing((current) => ({ ...current, count: item.repeat }))
      complete()
      return
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setThing((current) => ({ ...current, count: next }))
  }

  const toggleRemind = (value: boolean): void => {
    if (!item) return
    setNotificationPreferences({
      ...notifications,
      perItem: { ...notifications.perItem, [item.id]: value },
    })
  }

  const shareText = (): void => {
    if (!item) return
    void Share.share({ message: formatShareText(cardFor(item, strings), strings) })
  }

  const notify = (notice: string | null): void => setThing((current) => ({ ...current, notice }))

  const copyText = (): void => {
    if (!item) return
    try {
      Clipboard.setString(formatShareText(cardFor(item, strings), strings))
      notify(strings.share.copied)
    } catch {
      shareText()
    }
  }

  /**
   * PNG keeps the alpha, so a transparent card arrives as a sticker. There is
   * no direct save: expo-media-library is not installed and would add a
   * native module and a Photos permission, so saving goes through the share
   * sheet ("Save Image" on iOS, the gallery or Files on Android).
   */
  const shareImage = async (): Promise<void> => {
    if (!item) return
    notify(null)
    try {
      const uri = await captureRef(cardRef, { format: 'png', result: 'tmpfile', width: 1080 })
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable')
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' })
    } catch {
      shareText()
    }
  }

  const sharePalettes = {
    light: paletteFor('light', accent),
    dark: paletteFor('dark', accent),
    current: palette,
  }

  return (
    <>
      <Stack.Screen options={{ title: title ?? strings.notFound.title }} />
      <ItemScreen
        title={title ?? strings.notFound.title}
        memoriseHref={item && item.arabic ? `/item/memorise/${item.id}` : null}
        item={
          item
            ? {
                ruling: item.ruling,
                rulingHref: `/glossary?term=${item.ruling}`,
                reviewed: item.reviewed,
                why: resolveText(item.why),
                how: item.how.flatMap((step) => resolveText(step) ?? []),
                repeat: item.repeat,
                arabic: item.arabic,
                transliteration: resolveText(item.transliteration),
                translation: resolveText(item.translation),
                note: resolveText(item.note),
                evidence: item.evidence,
                parts: (item.parts ?? []).map((part) => ({
                  id: part.id,
                  title: resolveText(part.title) ?? part.id,
                  arabic: part.arabic,
                  transliteration: resolveText(part.transliteration),
                  translation: resolveText(part.translation),
                  repeat: part.repeat,
                  source: part.evidence.map((evidence) => sourceFor(evidence, strings)).join(' · '),
                })),
              }
            : null
        }
        done={done}
        onToggleDone={toggleDone}
        counter={item && item.repeat > 1 ? { count: thing.count, target: item.repeat } : null}
        onTapCounter={tapCounter}
        onResetCounter={() => setThing((current) => ({ ...current, count: 0 }))}
        onToday={isEnabled}
        onToggleOnToday={() => {
          if (item) toggleEnabled(item.id)
        }}
        remind={
          item
            ? remindFor(
                item,
                isEnabled,
                known.includes(item.id),
                notifications.perItem,
                notifications,
                strings,
              )
            : null
        }
        onToggleRemind={toggleRemind}
        onShareText={shareText}
        onShareImage={() => {
          if (item) setThing((current) => ({ ...current, studio: true, notice: null }))
        }}
      />
      {item && thing.studio ? (
        <>
          {/* The full-size card the studio previews, captured off-screen at 1080 wide. */}
          <View
            ref={cardRef}
            collapsable={false}
            pointerEvents="none"
            style={{ position: 'absolute', top: -10000, start: 0 }}>
            <ShareCard
              card={cardFor(item, strings)}
              theme={shareCardTheme(thing.share.style, sharePalettes)}
              background={thing.share.background}
              aspect={thing.share.aspect}
            />
          </View>
          <ShareStudio
            card={cardFor(item, strings)}
            options={thing.share}
            palettes={sharePalettes}
            onChange={(share) => setThing((current) => ({ ...current, share, notice: null }))}
            onCopyText={copyText}
            onShareImage={() => void shareImage()}
            onSaveImage={null}
            notice={thing.notice}
            onClose={() => setThing((current) => ({ ...current, studio: false, notice: null }))}
          />
        </>
      ) : null}
    </>
  )
}
