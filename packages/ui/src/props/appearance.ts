import type { Strings } from '@ihsaanly/core/strings/en'

import type { ThemePreference } from '../types'

/** What an appearance is called: System, Light and Dark, or a theme's own name. */
export function appearanceName(strings: Strings, preference: ThemePreference): string {
  return preference === 'system' || preference === 'light' || preference === 'dark'
    ? strings.appearance[preference]
    : strings.appearance.themes[preference]
}
