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
    expect(DEFAULT_USER_STATE).toEqual({
      travelling: false,
      trackingPaused: false,
      jumuah: 'auto',
      pauseCheckInOn: null,
    })
    expect(UserState.parse(DEFAULT_USER_STATE)).toEqual(DEFAULT_USER_STATE)
  })

  it('keeps a check-in day, accepts none, and refuses one that is not a day', () => {
    const paused = { travelling: false, trackingPaused: true }
    expect(UserState.parse({ ...paused, pauseCheckInOn: '2026-10-10' }).pauseCheckInOn).toBe(
      '2026-10-10',
    )
    expect(UserState.parse({ ...paused, pauseCheckInOn: null }).pauseCheckInOn).toBeNull()
    expect(UserState.parse(paused).pauseCheckInOn).toBeUndefined()
    expect(UserState.safeParse({ ...paused, pauseCheckInOn: 'next week' }).success).toBe(false)
  })
})
