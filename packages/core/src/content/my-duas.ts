import { z } from 'zod'

import { assertNever } from '../assert-never'
import { SUPPORTED_LANGUAGES } from '../i18n/locale'
import type { Item, Trigger } from './schema'

/**
 * A dua the user wrote themselves. Kept apart from content: it carries no
 * ruling, no evidence and no review, because none of those can be said of
 * someone's own words. Its id starts with `mine-`, which no content slug may
 * share, so every place that opens `/item/<id>` can tell the two apart.
 */
export const OWN_DUA_PREFIX = 'mine-'

/** Enough for a personal set; small enough that the synced row stays light. */
export const MAX_OWN_DUAS = 30

/** The same bound for pinned library items. */
export const MAX_PINNED = 30

/** Field limits the form enforces; the stored schema stays lenient so a row never fails to load. */
export const OWN_DUA_LIMITS = { title: 80, arabic: 1500, transliteration: 1500, text: 1500 }

export const MAX_OWN_DUA_REPEAT = 100

/**
 * The moments a reminder can be tied to: the plan's own windows and the
 * after-prayer moments, never a clock time. Morning, evening and night are
 * windows, so a reminder goes out as each opens, inside quiet hours and the
 * daily cap. After a prayer it appears on Today once that prayer is marked:
 * the user is in the app then, so nothing is sent.
 */
export const MOMENTS = [
  'after-fajr',
  'morning',
  'after-dhuhr',
  'after-asr',
  'evening',
  'after-maghrib',
  'after-isha',
  'after-prayer',
  'night',
] as const

export const Moment = z.enum(MOMENTS)
export type Moment = z.infer<typeof Moment>

export const OwnDua = z.object({
  id: z.string().startsWith(OWN_DUA_PREFIX),
  title: z.string().min(1),
  arabic: z.string().min(1).nullable(),
  transliteration: z.string().min(1).nullable(),
  text: z.string().min(1).nullable(),
  repeat: z.number().int().positive(),
  moment: Moment.nullable(),
})
export type OwnDua = z.infer<typeof OwnDua>

/** What the form edits: plain strings, so a half-typed field is never a null. */
export interface OwnDuaDraft {
  title: string
  arabic: string
  transliteration: string
  text: string
  repeat: number
  moment: Moment | null
}

export const EMPTY_DRAFT: OwnDuaDraft = {
  title: '',
  arabic: '',
  transliteration: '',
  text: '',
  repeat: 1,
  moment: null,
}

/** Why a draft cannot be saved yet: it needs a name, and words in some language. */
export type DraftProblem = 'title' | 'words'

export function isOwnDuaId(id: string): boolean {
  return id.startsWith(OWN_DUA_PREFIX)
}

/** Unique enough on one person's devices: the instant in base 36 and a random tail. */
export function newOwnDuaId(now: number, random: number): string {
  const tail = Math.floor(random * 36 ** 4)
    .toString(36)
    .padStart(4, '0')
  return `${OWN_DUA_PREFIX}${now.toString(36)}${tail}`
}

export function draftOf(dua: OwnDua): OwnDuaDraft {
  return {
    title: dua.title,
    arabic: dua.arabic ?? '',
    transliteration: dua.transliteration ?? '',
    text: dua.text ?? '',
    repeat: dua.repeat,
    moment: dua.moment,
  }
}

export function draftProblem(draft: OwnDuaDraft): DraftProblem | null {
  if (draft.title.trim() === '') return 'title'
  if (draft.arabic.trim() === '' && draft.text.trim() === '') return 'words'
  return null
}

const optional = (value: string): string | null => (value.trim() === '' ? null : value.trim())

const clampRepeat = (repeat: number): number =>
  Math.min(MAX_OWN_DUA_REPEAT, Math.max(1, Math.round(repeat)))

/** The dua a valid draft saves as; trimmed, with an empty field stored as absent. */
export function fromDraft(draft: OwnDuaDraft, id: string): OwnDua {
  return {
    id,
    title: draft.title.trim(),
    arabic: optional(draft.arabic),
    transliteration: optional(draft.transliteration),
    text: optional(draft.text),
    repeat: clampRepeat(draft.repeat),
    moment: draft.moment,
  }
}

/** Replaces the dua with the same id, or adds it at the end. */
export function upsertOwnDua(list: OwnDua[], dua: OwnDua): OwnDua[] {
  return list.some((entry) => entry.id === dua.id)
    ? list.map((entry) => (entry.id === dua.id ? dua : entry))
    : [...list, dua]
}

export function triggerFor(moment: Moment): Trigger {
  switch (moment) {
    case 'morning':
    case 'evening':
    case 'night':
      return { kind: 'window', window: moment }
    case 'after-fajr':
      return { kind: 'prayer', prayer: 'fajr', when: 'after' }
    case 'after-dhuhr':
      return { kind: 'prayer', prayer: 'dhuhr', when: 'after' }
    case 'after-asr':
      return { kind: 'prayer', prayer: 'asr', when: 'after' }
    case 'after-maghrib':
      return { kind: 'prayer', prayer: 'maghrib', when: 'after' }
    case 'after-isha':
      return { kind: 'prayer', prayer: 'isha', when: 'after' }
    case 'after-prayer':
      return { kind: 'prayer', prayer: 'any', when: 'after' }
    default:
      return assertNever(moment)
  }
}

/** The user's words in every language, since they are the same whichever the app is in. */
function everywhere(text: string): Record<string, string> {
  return Object.fromEntries(SUPPORTED_LANGUAGES.map((language) => [language, text]))
}

/**
 * A dua with a moment, as an item the planner can place on Today and remind
 * of like any other. Built in memory, never validated as content: it cites no
 * evidence, and `mubah` is only a rank (it sorts after everything the
 * content asks of the user), never shown for it.
 */
export function ownDuaItem(dua: OwnDua, moment: Moment): Item {
  return {
    id: dua.id,
    category: 'mine',
    title: everywhere(dua.title),
    ruling: 'mubah',
    arabic: dua.arabic,
    transliteration: dua.transliteration ? everywhere(dua.transliteration) : null,
    translation: dua.text ? everywhere(dua.text) : null,
    repeat: dua.repeat,
    evidence: [],
    trigger: triggerFor(moment),
    defaultOn: false,
    note: null,
    why: null,
    how: [],
    reminder: null,
    reviewed: true,
    audio: null,
    audioTranslation: null,
  }
}

/** The own duas that have a moment, as items for the plan. */
export function ownDuaItems(list: OwnDua[]): Item[] {
  return list.flatMap((dua) => (dua.moment ? [ownDuaItem(dua, dua.moment)] : []))
}
