import { afterEach, describe, expect, it } from 'bun:test'

import { SUPPORTED_LANGUAGES } from '../i18n/locale'
import { installPersonalItems, itemById, items, personalItems, resolveText } from './index'
import {
  draftOf,
  draftProblem,
  EMPTY_DRAFT,
  fromDraft,
  isOwnDuaId,
  MAX_OWN_DUA_REPEAT,
  MOMENTS,
  type Moment,
  newOwnDuaId,
  OWN_DUA_PREFIX,
  OwnDua,
  ownDuaItem,
  ownDuaItems,
  triggerFor,
  upsertOwnDua,
} from './my-duas'

const dua: OwnDua = {
  id: 'mine-abc',
  title: 'For my parents',
  arabic: 'رَبِّ ارْحَمْهُمَا',
  transliteration: 'Rabbi irhamhuma',
  text: 'My Lord, have mercy on them',
  repeat: 3,
  moment: 'evening',
}

afterEach(() => installPersonalItems([]))

describe('own dua ids', () => {
  it('starts every id with the prefix and tells it apart from content', () => {
    const id = newOwnDuaId(1_700_000_000_000, 0.5)
    expect(id.startsWith(OWN_DUA_PREFIX)).toBe(true)
    expect(isOwnDuaId(id)).toBe(true)
    expect(newOwnDuaId(1, 0)).toBe('mine-10000')
    expect(newOwnDuaId(1, 0.999_999)).not.toBe(newOwnDuaId(1, 0))
  })

  it('never collides with a content slug', () => {
    expect(items.filter((item) => isOwnDuaId(item.id))).toEqual([])
  })
})

describe('drafts', () => {
  it('needs a title, then words in Arabic or in the reader’s language', () => {
    expect(draftProblem(EMPTY_DRAFT)).toBe('title')
    expect(draftProblem({ ...EMPTY_DRAFT, title: '  ' })).toBe('title')
    expect(draftProblem({ ...EMPTY_DRAFT, title: 'A' })).toBe('words')
    expect(draftProblem({ ...EMPTY_DRAFT, title: 'A', arabic: 'ب' })).toBeNull()
    expect(draftProblem({ ...EMPTY_DRAFT, title: 'A', text: 'b' })).toBeNull()
  })

  it('saves trimmed, empty fields as absent and the count in bounds', () => {
    const saved = fromDraft(
      { ...EMPTY_DRAFT, title: ' Mine ', text: ' words ', arabic: '  ', repeat: 0 },
      'mine-1',
    )
    expect(saved).toEqual({
      id: 'mine-1',
      title: 'Mine',
      arabic: null,
      transliteration: null,
      text: 'words',
      repeat: 1,
      moment: null,
    })
    expect(fromDraft({ ...EMPTY_DRAFT, title: 'A', repeat: 1000 }, 'mine-1').repeat).toBe(
      MAX_OWN_DUA_REPEAT,
    )
    expect(OwnDua.safeParse(saved).success).toBe(true)
  })

  it('round-trips a saved dua through the form', () => {
    expect(fromDraft(draftOf(dua), dua.id)).toEqual(dua)
    expect(draftOf({ ...dua, arabic: null, transliteration: null, text: null })).toMatchObject({
      arabic: '',
      transliteration: '',
      text: '',
    })
  })

  it('replaces a dua by id, or adds it at the end', () => {
    const other = { ...dua, id: 'mine-other' }
    expect(upsertOwnDua([dua], other)).toEqual([dua, other])
    expect(upsertOwnDua([dua, other], { ...dua, title: 'New' })).toEqual([
      { ...dua, title: 'New' },
      other,
    ])
  })
})

describe('moments', () => {
  it.each([
    ['morning', { kind: 'window', window: 'morning' }],
    ['evening', { kind: 'window', window: 'evening' }],
    ['night', { kind: 'window', window: 'night' }],
    ['after-fajr', { kind: 'prayer', prayer: 'fajr', when: 'after' }],
    ['after-dhuhr', { kind: 'prayer', prayer: 'dhuhr', when: 'after' }],
    ['after-asr', { kind: 'prayer', prayer: 'asr', when: 'after' }],
    ['after-maghrib', { kind: 'prayer', prayer: 'maghrib', when: 'after' }],
    ['after-isha', { kind: 'prayer', prayer: 'isha', when: 'after' }],
    ['after-prayer', { kind: 'prayer', prayer: 'any', when: 'after' }],
  ] as const)('ties %s to the plan’s own trigger', (moment, trigger) => {
    expect(triggerFor(moment)).toEqual(trigger)
  })

  it('covers every moment', () => {
    MOMENTS.forEach((moment) => expect(triggerFor(moment)).toBeDefined())
    expect(() => triggerFor('noon' as Moment)).toThrow()
  })
})

describe('own duas as items', () => {
  it('reads the same in every language', () => {
    const item = ownDuaItem(dua, 'evening')
    SUPPORTED_LANGUAGES.forEach((language) => {
      expect(resolveText(item.title, language)).toBe(dua.title)
      expect(resolveText(item.translation, language)).toBe(dua.text)
      expect(resolveText(item.transliteration, language)).toBe(dua.transliteration)
    })
    expect(item).toMatchObject({ id: dua.id, arabic: dua.arabic, repeat: 3, category: 'mine' })
    const bare = ownDuaItem({ ...dua, text: null, transliteration: null }, 'night')
    expect(bare.translation).toBeNull()
    expect(bare.transliteration).toBeNull()
  })

  it('turns only the duas with a moment into items', () => {
    const list = ownDuaItems([dua, { ...dua, id: 'mine-none', moment: null }])
    expect(list.map((item) => item.id)).toEqual([dua.id])
  })

  it('is found by id once installed, after content', () => {
    expect(itemById(dua.id)).toBeUndefined()
    installPersonalItems(ownDuaItems([dua]))
    expect(personalItems()).toHaveLength(1)
    expect(itemById(dua.id)?.title.en).toBe(dua.title)
    const [first] = items
    if (!first) throw new Error('no items')
    expect(itemById(first.id)).toBe(first)
  })
})
