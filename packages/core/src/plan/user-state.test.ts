import { describe, expect, it } from 'bun:test'

import { DEFAULT_USER_STATE, JumuahChoice, UserState } from './user-state'

describe('UserState', () => {
  it('parses a row written before jumuah existed, defaulting it to auto', () => {
    const parsed = UserState.parse({ travelling: true, trackingPaused: false })
    expect(parsed).toEqual({ travelling: true, trackingPaused: false, jumuah: 'auto' })
  })

  it('keeps an explicit jumuah choice', () => {
    expect(
      UserState.parse({ travelling: false, trackingPaused: true, jumuah: 'dhuhr' }).jumuah,
    ).toBe('dhuhr')
  })

  it('rejects an unknown jumuah choice or a missing switch', () => {
    expect(JumuahChoice.safeParse('maybe').success).toBe(false)
    expect(UserState.safeParse({ travelling: true }).success).toBe(false)
  })

  it('defaults to nothing paused, not travelling, and automatic Jumu’ah', () => {
    expect(DEFAULT_USER_STATE).toEqual({ travelling: false, trackingPaused: false, jumuah: 'auto' })
    expect(UserState.parse(DEFAULT_USER_STATE)).toEqual(DEFAULT_USER_STATE)
  })
})
