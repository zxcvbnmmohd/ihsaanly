/**
 * The device's locale, from the JavaScript runtime rather than a native module.
 * expo-localization is deliberately not installed: its module rewrote the RTL
 * flags from static resources on every React instance start, which undid a
 * runtime language change on the very reload meant to apply it.
 */
export function deviceLocaleTags(): string[] {
  try {
    return [Intl.DateTimeFormat().resolvedOptions().locale]
  } catch {
    return []
  }
}
