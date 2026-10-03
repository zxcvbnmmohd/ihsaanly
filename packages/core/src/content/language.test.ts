import { afterEach, describe, expect, it } from 'bun:test'

import { resolveText, setContentLanguage } from './language'

afterEach(() => setContentLanguage('en'))

const field = { en: 'Hello', fr: 'Bonjour', 'pt-BR': 'Oi' }

describe('resolveText', () => {
  it('returns null for a missing field', () => {
    expect(resolveText(null)).toBeNull()
    expect(resolveText(undefined)).toBeNull()
  })

  it('reads the active language, English by default', () => {
    expect(resolveText(field)).toBe('Hello')
    setContentLanguage('fr')
    expect(resolveText(field)).toBe('Bonjour')
  })

  it('prefers an exact locale key, then falls back to its language', () => {
    expect(resolveText(field, 'pt-BR')).toBe('Oi')
    expect(resolveText(field, 'fr-CA')).toBe('Bonjour')
  })

  it('returns null when the language is absent, rather than another language', () => {
    expect(resolveText(field, 'ja')).toBeNull()
  })
})
