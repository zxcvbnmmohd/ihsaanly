import { describe, expect, it } from 'bun:test'

// From layout-breakpoints, not layout: layout.ts also pulls in
// `useWindowDimensions` from react-native, whose published Flow syntax
// `bun test` cannot parse, and layoutFor itself has no such dependency.
import { layoutFor } from './layout-breakpoints'

describe('layoutFor', () => {
  it('is compact just under the regular breakpoint', () => {
    expect(layoutFor(767)).toBe('compact')
  })

  it('is regular at the regular breakpoint', () => {
    expect(layoutFor(768)).toBe('regular')
  })

  it('is regular just under the wide breakpoint', () => {
    expect(layoutFor(1099)).toBe('regular')
  })

  it('is wide at the wide breakpoint', () => {
    expect(layoutFor(1100)).toBe('wide')
  })
})
