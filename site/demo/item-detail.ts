// Mirrors src/app/(library)/item/[id].tsx and src/components/evidence-panel.tsx:
// the read-only parts of item detail. The demo has no "done", counter or
// reminder controls, since marking prayers and opening items are the two
// interactions the brief asks for.

import { resolveText } from '@/content'
import type { Evidence, Item } from '@/content/schema'
import type { Strings } from '@/strings/en'

export interface ItemPartDetail {
  id: string
  title: string
  arabic: string
  transliteration: string | null
  translation: string | null
  repeat: number
  source: string
}

export interface EvidenceDetail {
  citation: string
  narration: string | null
}

export interface ItemDetailView {
  id: string
  title: string
  rulingLabel: string
  reviewed: boolean
  why: string | null
  how: string[]
  repeat: number
  arabic: string | null
  transliteration: string | null
  translation: string | null
  note: string | null
  evidence: EvidenceDetail[]
  parts: ItemPartDetail[]
}

function quranCitation(surah: number, ayah: number, strings: Strings): string {
  return strings.item.quranReference(surah, ayah)
}

/** The line shown under each piece of evidence: collection, reference, grading and grader, or surah:ayah. */
function citationFor(evidence: Evidence, strings: Strings): string {
  if (evidence.type === 'quran') return quranCitation(evidence.surah, evidence.ayah, strings)

  const grading = strings.grading[evidence.grading]
  const attribution = evidence.gradedBy ? ` — ${strings.item.gradedBy(evidence.gradedBy)}` : ''
  return `${evidence.collection} ${evidence.reference} · ${grading}${attribution}`
}

/** The shorter citation used under a composite item's individual parts. */
function sourceFor(evidence: Evidence, strings: Strings): string {
  if (evidence.type === 'quran') return quranCitation(evidence.surah, evidence.ayah, strings)
  return `${evidence.collection} ${evidence.reference}`
}

export function buildItemDetail(item: Item, strings: Strings): ItemDetailView {
  return {
    id: item.id,
    title: resolveText(item.title) ?? item.id,
    rulingLabel: strings.ruling[item.ruling],
    reviewed: item.reviewed,
    why: resolveText(item.why),
    how: item.how.flatMap((step) => resolveText(step) ?? []),
    repeat: item.repeat,
    arabic: item.arabic,
    transliteration: resolveText(item.transliteration),
    translation: resolveText(item.translation),
    note: resolveText(item.note),
    evidence: item.evidence.map((entry) => ({
      citation: citationFor(entry, strings),
      narration: resolveText(entry.text),
    })),
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
}
