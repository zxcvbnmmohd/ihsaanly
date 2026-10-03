import { afterEach, expect, it } from 'bun:test'

import { deviceLocaleTags } from './device'

const real = Intl.DateTimeFormat

afterEach(() => {
  Intl.DateTimeFormat = real
})

it('reads the locale from the JavaScript runtime', () => {
  expect(deviceLocaleTags()).toEqual([real().resolvedOptions().locale])
})

it('has no locale to offer when the runtime cannot say', () => {
  Intl.DateTimeFormat = (() => {
    throw new Error('no Intl')
  }) as unknown as typeof Intl.DateTimeFormat

  expect(deviceLocaleTags()).toEqual([])
})
