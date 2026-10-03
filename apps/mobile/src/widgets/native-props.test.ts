import { describe, expect, it } from 'bun:test'

import { withoutNulls } from './native-props'

describe('withoutNulls', () => {
  it('drops null properties at every depth, since Swift cannot take them', () => {
    const value = {
      a: 1,
      b: null,
      c: { d: null, e: 'x', f: { g: null } },
      h: [1, null, { i: null, j: 2 }],
    }
    expect<unknown>(withoutNulls(value)).toEqual({
      a: 1,
      c: { e: 'x', f: {} },
      h: [1, null, { j: 2 }],
    })
  })

  it('keeps null array elements, so positions do not shift', () => {
    expect(withoutNulls([null, 1])).toEqual([null, 1])
  })

  it('keeps falsy values that are not null', () => {
    expect(withoutNulls({ zero: 0, empty: '', no: false, undef: undefined })).toEqual({
      zero: 0,
      empty: '',
      no: false,
      undef: undefined,
    })
  })

  it('returns primitives untouched', () => {
    expect(withoutNulls('text')).toBe('text')
    expect(withoutNulls(3)).toBe(3)
    expect(withoutNulls(null)).toBeNull()
  })
})
