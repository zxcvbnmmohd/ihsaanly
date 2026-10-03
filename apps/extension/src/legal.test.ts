import { afterEach, describe, expect, it } from 'bun:test'
import { LEGAL } from './legal'

const original = window.open

afterEach(() => {
  window.open = original
})

describe('LEGAL', () => {
  it('opens a page in a new tab, cut off from the popup', () => {
    const opened: unknown[][] = []
    window.open = ((...args: unknown[]) => {
      opened.push(args)
      return null
    }) as typeof window.open
    LEGAL.onOpen(LEGAL.termsUrl)
    expect(opened).toEqual([['https://ihsaanly.app/legal/terms', '_blank', 'noopener']])
  })
})
