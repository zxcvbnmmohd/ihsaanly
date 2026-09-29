// The active content language and the lookup that reads it. Kept apart from
// `./index` (which lays every translation over the English document at
// import) so a caller that brings its own content — the marketing site's
// demo, loading one language on demand — can resolve text without pulling in
// every translation file.

let currentLanguage = 'en'

/** Set once at startup from the chosen locale; content is keyed by language. */
export function setContentLanguage(language: string): void {
  currentLanguage = language
}

export function resolveText(
  field: Record<string, string> | null | undefined,
  locale: string = currentLanguage,
): string | null {
  if (!field) return null
  const language = locale.split('-')[0] ?? locale
  return field[locale] ?? field[language] ?? null
}
