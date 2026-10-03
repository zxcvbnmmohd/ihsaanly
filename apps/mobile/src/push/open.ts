import type { NotificationData } from '@ihsaanly/state/notifications/payload'
import { type Href, router } from 'expo-router'
import { Linking } from 'react-native'

type Announcement = Extract<NotificationData, { kind: 'announcement' }>

/** Long enough to cover one tap reported by two doors, short enough to allow a real second tap. */
const REPEAT_MS = 3_000

let last: { target: string; at: number } | null = null

/**
 * Where a tapped announcement goes: its in-app route, else its web page, else
 * Today. On iOS one tap can arrive twice (Firebase and expo-notifications both
 * see it), so the same target within a moment is followed once.
 */
export function openAnnouncement(data: Announcement, now = Date.now()): void {
  const target = data.route ?? data.url ?? '/'
  if (last && last.target === target && now - last.at < REPEAT_MS) return
  last = { target, at: now }

  if (data.route === null && data.url !== null) {
    Linking.openURL(data.url).catch(() => {
      // No browser to open it in; the tap opened the app, which is something.
    })
  } else {
    router.push(target as Href)
  }
}
