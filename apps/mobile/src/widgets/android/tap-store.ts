import { File, Paths } from 'expo-file-system'

import type { WidgetTap, WidgetTapKind } from '../model'
import { TAP_ACTION } from './tap-action'

/**
 * Android widget taps wait in a JSON file beside the timeline until the app
 * files them. The widget task runs headless in the app's own process and JS
 * runtime, so the task and the app share this module; every read and write
 * is synchronous, so a tap recorded while the app is filing others can never
 * land between a read and its write and be lost.
 */
function tapsFile(): File {
  return new File(Paths.document, 'widget-taps.json')
}

/** Taps older than this are dropped when another is recorded: the app missed nothing it can still file. */
const KEEP_MS = 2 * 24 * 60 * 60_000

const KINDS: readonly WidgetTapKind[] = ['done', 'prayer', 'count']

function isKind(value: unknown): value is WidgetTapKind {
  return KINDS.some((kind) => kind === value)
}

function isTap(value: unknown): value is WidgetTap {
  if (value === null || typeof value !== 'object') return false
  const { kind, id, at } = value as Record<string, unknown>
  return (
    (kind === undefined || isKind(kind)) &&
    typeof id === 'string' &&
    typeof at === 'number' &&
    Number.isFinite(at)
  )
}

/** Every tap kept; none when nothing has been tapped or the file cannot be read. */
export function readTaps(): WidgetTap[] {
  try {
    const file = tapsFile()
    if (!file.exists) return []
    const parsed: unknown = JSON.parse(file.textSync())
    return Array.isArray(parsed) ? parsed.filter(isTap) : []
  } catch {
    return []
  }
}

function writeTaps(taps: WidgetTap[]): void {
  tapsFile().writeSync(JSON.stringify(taps))
}

const listeners = new Set<() => void>()

/** Calls `listener` when a widget tap is recorded while the app runs. Returns the unsubscribe. */
export function onTapRecorded(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

/** Keeps a tap for the app and returns every tap now kept, for the widget to draw. */
export function recordTap(tap: WidgetTap): WidgetTap[] {
  const taps = [...readTaps().filter((kept) => kept.at > tap.at - KEEP_MS), tap]
  writeTaps(taps)
  listeners.forEach((listener) => listener())
  return taps
}

/** Drops the taps the app has filed, up to and including `through`. */
export function dropTaps(through: number): void {
  const taps = readTaps()
  const kept = taps.filter((tap) => tap.at > through)
  if (kept.length !== taps.length) writeTaps(kept)
}

/**
 * The tap a click asks for, from its `clickActionData`; null for any other
 * click or data that is not one. The moment is the click's, not the data's.
 */
export function tapFromClick(
  action: string | undefined,
  data: Record<string, unknown> | undefined,
  at: number,
): WidgetTap | null {
  if (action !== TAP_ACTION || !data) return null
  const { kind, id } = data
  if (!isKind(kind) || typeof id !== 'string' || id.length === 0) return null
  return { kind, id, at }
}
