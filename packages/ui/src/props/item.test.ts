import { describe, expect, it } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import { en } from '@ihsaanly/core/strings/en'
import { cardFor, remindFor } from './item'

const windowItem = itemById('evening-adhkar')
const dayItem = itemById('fast-monday')
const eventItem = itemById('dua-leaving-home')

if (!windowItem || !dayItem || !eventItem) {
  throw new Error('fixture items missing from content')
}

const defaults = { windows: true, lookAhead: false }

describe('remindFor', () => {
  it('offers nothing when the item is not on today', () => {
    expect(remindFor(windowItem, false, false, {}, defaults, en)).toBeNull()
  })

  it('offers nothing for an item already known', () => {
    expect(remindFor(windowItem, true, true, {}, defaults, en)).toBeNull()
  })

  it('offers a window reminder, falling back to the default', () => {
    expect(remindFor(windowItem, true, false, {}, defaults, en)).toEqual({
      value: defaults.windows,
      detail: en.item.remindWindow,
    })
  })

  it('prefers a stored per-item value over the default', () => {
    expect(remindFor(windowItem, true, false, { [windowItem.id]: false }, defaults, en)).toEqual({
      value: false,
      detail: en.item.remindWindow,
    })
  })

  it('offers a look-ahead reminder for a day-triggered item', () => {
    expect(remindFor(dayItem, true, false, {}, defaults, en)).toEqual({
      value: defaults.lookAhead,
      detail: en.item.remindLookAhead,
    })
  })

  it('offers nothing for an item that is never scheduled', () => {
    expect(remindFor(eventItem, true, false, {}, defaults, en)).toBeNull()
  })
})

describe('cardFor', () => {
  it('carries the first evidence as the source', () => {
    const card = cardFor(windowItem, en)
    expect(card.title).toBeTruthy()
    expect(card.source).toBeTruthy()
  })
})
