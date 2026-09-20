import type { Evidence } from '@/content/schema'
import type { Strings } from '@/strings'

/** Where a text comes from, in one line, without the grading detail the panel shows. */
export function sourceFor(evidence: Evidence, strings: Strings): string {
  if (evidence.type === 'quran') return strings.item.quranReference(evidence.surah, evidence.ayah)
  return `${evidence.collection} ${evidence.reference}`
}

export interface ShareCardText {
  title: string
  arabic: string | null
  transliteration: string | null
  translation: string | null
  /** A citation line such as "Sahih Muslim 597", already formatted. */
  source: string | null
}

/** Plain text for the system share sheet: the dua, its meaning, where it is from. */
export function formatShareText(card: ShareCardText, strings: Strings): string {
  return [
    card.title,
    card.arabic,
    card.transliteration,
    card.translation,
    card.source,
    strings.item.sharedFrom,
  ]
    .filter((line): line is string => line !== null && line.trim() !== '')
    .join('\n\n')
}
