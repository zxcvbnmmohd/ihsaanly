import { describe, expect, it } from 'bun:test'

import { en } from '@/strings/en'

import { formatShareText, sourceFor } from './share-text'

const strings = en

describe('share text', () => {
  it('lists what is present and ends with where it came from', () => {
    const text = formatShareText(
      {
        title: 'Before eating',
        arabic: 'بِسْمِ اللَّهِ',
        transliteration: null,
        translation: 'In the name of Allah',
        source: 'Sahih al-Bukhari 5376',
      },
      strings,
    )
    expect(text.split('\n\n')).toEqual([
      'Before eating',
      'بِسْمِ اللَّهِ',
      'In the name of Allah',
      'Sahih al-Bukhari 5376',
      strings.item.sharedFrom,
    ])
  })

  it('cites the Quran by surah and ayah', () => {
    expect(sourceFor({ type: 'quran', surah: 2, ayah: 255, text: { en: '' } }, strings)).toBe(
      strings.item.quranReference(2, 255),
    )
  })
})
