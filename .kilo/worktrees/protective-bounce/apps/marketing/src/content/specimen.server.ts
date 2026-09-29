// Server-only: the dua specimen reads the mobile app's own content files at
// build time, so the site never ships the whole library.
import type { LocaleCode } from '~/i18n/locales'
import type { Strings } from '~/i18n/messages.server'

interface LocalText {
  [language: string]: string | undefined
}

interface ContentItem {
  id: string
  title: LocalText
  arabic: string
  transliteration: LocalText
  translation: LocalText
}

export interface SpecimenDua {
  title: string
  /** Set when the title falls back to English on a page in another language. */
  titleLang: string | null
  arabic: string
  transliteration: string
  /** Null when the page language has none, as for Arabic: the app omits it too. */
  translation: string | null
  source: string
  grading: string
}

const ITEMS = import.meta.glob<{ default: unknown }>(
  '../../../../packages/core/content/items.json',
  {
    eager: true,
  },
)
const TRANSLATIONS = import.meta.glob<{ default: unknown }>(
  '../../../../packages/core/content/translations/*.json',
  { eager: true },
)

const SPECIMEN = [
  { id: 'dua-leaving-home', key: 'leaving', grading: true },
  { id: 'dua-riding', key: 'riding', grading: true },
  { id: 'dua-entering-home', key: 'entering', grading: false },
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isContentItem(value: unknown): value is ContentItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.arabic === 'string' &&
    isRecord(value.title) &&
    isRecord(value.transliteration) &&
    isRecord(value.translation)
  )
}

function readContent(): ContentItem[] {
  const parsed = Object.values(ITEMS)[0]?.default
  const items = isRecord(parsed) && Array.isArray(parsed.items) ? parsed.items : []
  return items.filter(isContentItem)
}

function readTranslated(code: LocaleCode): Map<string, { title?: string; translation?: string }> {
  const parsed =
    TRANSLATIONS[`../../../../packages/core/content/translations/${code}.json`]?.default
  const found = new Map<string, { title?: string; translation?: string }>()
  const items = isRecord(parsed) && isRecord(parsed.items) ? parsed.items : {}
  for (const [id, item] of Object.entries(items)) {
    if (!isRecord(item)) continue
    found.set(id, {
      title: typeof item.title === 'string' ? item.title : undefined,
      translation: typeof item.translation === 'string' ? item.translation : undefined,
    })
  }
  return found
}

export function specimenDuas(code: LocaleCode, strings: Strings): SpecimenDua[] {
  const content = readContent()
  const translated = readTranslated(code)
  const get = (key: string): string => {
    const value = strings[key]
    if (value === undefined) throw new Error(`Unknown string "${key}"`)
    return value
  }
  return SPECIMEN.map(({ id, key, grading }) => {
    const item = content.find((candidate) => candidate.id === id)
    if (!item) throw new Error(`No content item ${id}`)
    const own = translated.get(id)
    const title = own?.title ?? item.title[code] ?? null
    // The meaning is content, so it follows the app's resolveText: a language
    // without one gets none rather than English (Arabic has none by design).
    const translation = own?.translation ?? item.translation[code] ?? null
    return {
      title: title ?? get(`home.specimen.${key}Title`),
      titleLang: title === null && code !== 'en' ? 'en' : null,
      arabic: item.arabic,
      transliteration: item.transliteration.en ?? '',
      translation,
      source: get(`home.specimen.${key}Source`),
      grading: grading ? get(`home.specimen.${key}Grading`) : '',
    }
  })
}
