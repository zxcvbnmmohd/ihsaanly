export interface Reveal {
  transliteration: boolean
  translation: boolean
}

export const FULLY_REVEALED: Reveal = { transliteration: true, translation: true }

/**
 * Listen, repeat, check. Hiding the transliteration first and the translation
 * second is the order the aids actually stop being needed in.
 */
export function nextStage(reveal: Reveal): Reveal {
  if (reveal.transliteration) return { transliteration: false, translation: true }
  if (reveal.translation) return { transliteration: false, translation: false }
  return FULLY_REVEALED
}

export function stageLabel(reveal: Reveal): 'both' | 'translation-only' | 'arabic-only' {
  if (reveal.transliteration) return 'both'
  if (reveal.translation) return 'translation-only'
  return 'arabic-only'
}
