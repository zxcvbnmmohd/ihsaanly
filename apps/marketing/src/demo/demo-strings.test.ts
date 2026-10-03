import { describe, expect, test } from 'bun:test'
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import { demoCopyFor } from './demo-strings'

describe('demoCopyFor', () => {
  test.each([...SUPPORTED_LANGUAGES])(
    '%s has every line, and the prayer goes into the bubble',
    (language) => {
      const copy = demoCopyFor(language)
      expect(copy.tabsLabel).toBeTruthy()
      expect(copy.coachOpenItem).toBeTruthy()
      expect(copy.coachOpenLibrary).toBeTruthy()
      expect(copy.coachMarkPrayer('PRAYER-NAME')).toContain('PRAYER-NAME')
    },
  )

  test('English wording', () => {
    expect(demoCopyFor('en').coachMarkPrayer('Fajr')).toBe('Tap to mark Fajr as prayed')
  })
})
