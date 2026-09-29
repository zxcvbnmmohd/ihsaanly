import { describe, expect, it } from 'bun:test'

import { columnBasisFor } from './library-grid'

describe('columnBasisFor', () => {
  it('is a full-width row at compact', () => {
    expect(columnBasisFor('compact')).toBe('100%')
  })

  it('is two columns at regular', () => {
    expect(columnBasisFor('regular')).toBe('48%')
  })

  it('is three columns at wide', () => {
    expect(columnBasisFor('wide')).toBe('31%')
  })
})
