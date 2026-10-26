import { describe, expect, it } from 'bun:test'
import { DEFAULT_READER_PREFERENCES, firstSentence } from './reading'

describe('firstSentence', () => {
  it('keeps the first sentence and its stop', () => {
    expect(firstSentence('It protects you. It was the practice of the Prophet.')).toBe(
      'It protects you.',
    )
    expect(firstSentence('Did he not do it? He did.')).toBe('Did he not do it?')
  })

  it('does not stop inside a number or a reference', () => {
    expect(firstSentence('Recite 2.5 pages, as in 2:255. Then rest.')).toBe(
      'Recite 2.5 pages, as in 2:255.',
    )
  })

  it('stops at Arabic, Urdu and CJK sentence ends', () => {
    expect(firstSentence('هل صليت؟ نعم')).toBe('هل صليت؟')
    expect(firstSentence('یہ سنت ہے۔ اور')).toBe('یہ سنت ہے۔')
    expect(firstSentence('这是圣行。它保护你。')).toBe('这是圣行。')
  })

  it('is the whole text when there is one sentence or no stop', () => {
    expect(firstSentence('  One sentence.  ')).toBe('One sentence.')
    expect(firstSentence('no stop at all')).toBe('no stop at all')
  })
})

it('defaults to what the app showed before: Arabic first, centred, in full', () => {
  expect(DEFAULT_READER_PREFERENCES).toEqual({
    arabicFirst: true,
    align: 'center',
    detail: 'detailed',
  })
})
