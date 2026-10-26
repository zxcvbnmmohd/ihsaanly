/**
 * How a dua or dhikr is laid out wherever it is read: the item screen, the
 * focused reader and the widgets that show Arabic.
 *
 * - `arabicFirst`: the Arabic (and its transliteration) above the
 *   translation; off puts the meaning first.
 * - `align`: `start` hugs the edge each script starts from (the right for
 *   Arabic, the layout's start for the rest); `center` centres them all.
 */
export interface ReadingLayout {
  arabicFirst: boolean
  align: 'start' | 'center'
}

/** How much of an item's why and evidence shows: its first sentence, or everything. */
export type DetailLevel = 'brief' | 'detailed'

export interface ReaderPreferences extends ReadingLayout {
  detail: DetailLevel
}

/** What the app showed before these were choices: Arabic first, centred, in full. */
export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  arabicFirst: true,
  align: 'center',
  detail: 'detailed',
}

/** Sentence ends; the CJK and full-width ones need no space after them. */
const FIRST_SENTENCE = /^[\s\S]*?(?:[.!?؟۔](?=\s|$)|[。！？])/u

/** The first sentence of a text, or the whole of it when it is one sentence. */
export function firstSentence(text: string): string {
  const trimmed = text.trim()
  return FIRST_SENTENCE.exec(trimmed)?.[0] ?? trimmed
}
