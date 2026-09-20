import { describe, expect, it } from 'bun:test'

import { items } from '@/content'

import { idsForPreset, presetFor, STARTER_PRESETS, STARTING_ENABLED } from './presets'

describe('starter presets', () => {
  it('names only items that exist', () => {
    const ids = new Set(items.map((item) => item.id))
    STARTING_ENABLED.forEach((id) => expect(ids.has(id)).toBe(true))
  })

  it('grows from starting to essentials to everything', () => {
    const starting = idsForPreset('starting', items)
    const essentials = idsForPreset('essentials', items)
    const everything = idsForPreset('everything', items)
    expect(starting.length).toBeLessThan(essentials.length)
    expect(essentials.length).toBeLessThan(everything.length)
  })

  it('recognises each preset from its enabled set, and nothing else', () => {
    STARTER_PRESETS.forEach((preset) =>
      expect(presetFor(idsForPreset(preset, items), items)).toBe(preset),
    )
    expect(presetFor(['morning-adhkar'], items)).toBeNull()
  })
})
