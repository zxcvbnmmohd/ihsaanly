import { z } from 'zod'

import type { ContentDocument, GlossaryDocument } from './schema'

/**
 * Each language other than English lives in its own file,
 * `content/translations/<language>.json`, keyed by item and term id. They are
 * laid over the English documents at load, filling only what is absent, so a
 * translation can never overwrite text that `items.json` already carries.
 *
 * Transliteration is a romanisation rather than English, so a language without
 * its own falls back to the English one instead of hiding the line.
 */
const Text = z.string().min(1)

const ItemTranslation = z
  .object({
    title: Text,
    translation: Text,
    why: Text,
    how: z.array(Text),
    reminder: Text,
    note: Text,
    /** One entry per evidence, in order; null where the source is not translated. */
    evidence: z.array(Text.nullable()),
    parts: z.record(z.string(), z.object({ title: Text, translation: Text }).partial().strict()),
  })
  .partial()
  .strict()

export const TranslationFile = z
  .object({
    language: z.string().regex(/^[a-z]{2,3}$/),
    items: z.record(z.string(), ItemTranslation),
    glossary: z.record(z.string(), z.object({ term: Text, definition: Text }).partial().strict()),
  })
  .strict()

export type TranslationFile = z.infer<typeof TranslationFile>

type Localised = Record<string, string>

function fill(field: Localised, language: string, value: string | undefined): Localised {
  return value === undefined || field[language] !== undefined
    ? field
    : { ...field, [language]: value }
}

function fillNullable(
  field: Localised | null,
  language: string,
  value: string | undefined,
): Localised | null {
  if (field === null) return null
  return fill(field, language, value)
}

export function applyTranslations(
  document: ContentDocument,
  files: TranslationFile[],
): ContentDocument {
  const items = document.items.map((item) =>
    files.reduce((current, file) => {
      const { language } = file
      const t = file.items[current.id] ?? {}
      return {
        ...current,
        title: fill(current.title, language, t.title),
        transliteration: fillNullable(
          current.transliteration,
          language,
          current.transliteration?.en,
        ),
        translation: fillNullable(current.translation, language, t.translation),
        why: fillNullable(current.why, language, t.why),
        reminder: fillNullable(current.reminder, language, t.reminder),
        note: fillNullable(current.note, language, t.note),
        how: current.how.map((step, index) => fill(step, language, t.how?.[index])),
        evidence: current.evidence.map((evidence, index) => ({
          ...evidence,
          text: fill(evidence.text, language, t.evidence?.[index] ?? undefined),
        })),
        parts: current.parts?.map((part) => ({
          ...part,
          title: fill(part.title, language, t.parts?.[part.id]?.title),
          translation: fill(part.translation, language, t.parts?.[part.id]?.translation),
          transliteration: fillNullable(part.transliteration, language, part.transliteration?.en),
        })),
      }
    }, item),
  )

  const languages = [...new Set([...document.contentLanguages, ...files.map((f) => f.language)])]
  const translationSources = Object.fromEntries(
    languages.map((language) => [language, document.translationSources[language] ?? null]),
  )

  return { ...document, contentLanguages: languages, translationSources, items }
}

export function applyGlossaryTranslations(
  document: GlossaryDocument,
  files: TranslationFile[],
): GlossaryDocument {
  return {
    ...document,
    terms: document.terms.map((term) =>
      files.reduce((current, file) => {
        const t = file.glossary[current.id] ?? {}
        return {
          ...current,
          term: fill(current.term, file.language, t.term),
          definition: fill(current.definition, file.language, t.definition),
        }
      }, term),
    ),
  }
}

/** What a language still lacks, as `item.field` paths, for the build to report. */
export function missingIn(document: ContentDocument, language: string): string[] {
  return document.items.flatMap((item) => {
    const fields: [string, Localised | null][] = [
      ['title', item.title],
      // An Arabic reader needs no translation of Arabic.
      ['translation', language === 'ar' ? null : item.translation],
      ['why', item.why],
      ['reminder', item.reminder],
      ['note', item.note],
      ...item.how.map((step, index): [string, Localised] => [`how.${index}`, step]),
      ...(item.parts ?? []).flatMap((part): [string, Localised | null][] => [
        [`parts.${part.id}.title`, part.title],
        [`parts.${part.id}.translation`, language === 'ar' ? null : part.translation],
      ]),
    ]
    return fields
      .filter(([, field]) => field !== null && field[language] === undefined)
      .map(([name]) => `${item.id}.${name}`)
  })
}
