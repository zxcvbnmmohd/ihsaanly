import { describe, expect, it } from 'bun:test'

import { assertNever } from './assert-never'

describe('assertNever', () => {
  it('throws, naming the unhandled value', () => {
    expect(() => assertNever('friday' as never)).toThrow('Unhandled case: "friday"')
  })

  it('serialises object values so a bad trigger is identifiable', () => {
    expect(() => assertNever({ kind: 'moon' } as never)).toThrow('Unhandled case: {"kind":"moon"}')
  })
})
