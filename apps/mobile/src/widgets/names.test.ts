import { describe, expect, it } from 'bun:test'

import { WIDGET_NAMES } from './names'

describe('WIDGET_NAMES', () => {
  it('lists ten distinct widgets', () => {
    expect(WIDGET_NAMES).toHaveLength(10)
    expect(new Set(WIDGET_NAMES).size).toBe(10)
  })

  it('names each one like its component, ending in Widget', () => {
    for (const name of WIDGET_NAMES) expect(name).toMatch(/^[A-Z][A-Za-z]+Widget$/)
  })
})
