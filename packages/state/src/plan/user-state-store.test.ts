import { beforeEach, describe, expect, it } from 'bun:test'
import { resetStorage } from '../../test/storage'

const { items } = await import('@ihsaanly/core/content')
const { setPlace } = await import('../location/store')
const { getEnabledItems, setEnabledItems } = await import('./enabled-store')
const { getUserState, pauseTracking, resumeTracking, setUserState, snoozeCheckIn } = await import(
  './user-state-store'
)

const pauseItems = items.filter((item) => item.onlyWhilePaused).map((item) => item.id)
// 23:30 on 30 September in Toronto, already 1 October in UTC.
const lateEvening = new Date('2026-10-01T03:30:00Z')

describe('the pause actions', () => {
  beforeEach(() => {
    resetStorage()
    setPlace({
      label: 'Toronto',
      latitude: 43.7,
      longitude: -79.42,
      timeZone: 'America/Toronto',
      source: 'city',
    })
  })

  it('pauses with a check-in counted from the place’s own day', () => {
    pauseTracking({ checkInDays: 7 }, lateEvening)
    expect(getUserState()).toMatchObject({ trackingPaused: true, pauseCheckInOn: '2026-10-07' })
  })

  it('holds the days to the offered range, and pauses with no check-in when asked', () => {
    pauseTracking({ checkInDays: 30 }, lateEvening)
    expect(getUserState().pauseCheckInOn).toBe('2026-10-10')

    pauseTracking({ checkInDays: null }, lateEvening)
    expect(getUserState()).toMatchObject({ trackingPaused: true, pauseCheckInOn: null })
  })

  it('resumes, clearing the check-in, and keeps the other switches', () => {
    setUserState({ ...getUserState(), travelling: true })
    pauseTracking({ checkInDays: 5 })
    resumeTracking()
    expect(getUserState()).toEqual({
      travelling: true,
      trackingPaused: false,
      jumuah: 'auto',
      pauseCheckInOn: null,
    })
  })

  it('snoozes the check-in to tomorrow', () => {
    pauseTracking({ checkInDays: 3 }, lateEvening)
    snoozeCheckIn(lateEvening)
    expect(getUserState().pauseCheckInOn).toBe('2026-10-01')
  })

  it('reads the device’s zone before a place is set', () => {
    resetStorage()
    pauseTracking({ checkInDays: 3 })
    expect(getUserState().pauseCheckInOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('switches the pause’s items on the first time only, so turning one off sticks', () => {
    expect(pauseItems.length).toBeGreaterThan(0)
    setEnabledItems(['morning-adhkar'])

    pauseTracking({ checkInDays: null })
    expect(getEnabledItems()).toEqual(['morning-adhkar', ...pauseItems])

    const [first, ...rest] = pauseItems
    setEnabledItems(['morning-adhkar', ...rest])
    resumeTracking()
    pauseTracking({ checkInDays: null })
    expect(getEnabledItems()).not.toContain(first)
  })

  it('adds nothing twice for a new user, who has them on already', () => {
    pauseTracking({ checkInDays: null })
    const enabled = getEnabledItems()
    expect(new Set(enabled).size).toBe(enabled.length)
    pauseItems.forEach((id) => expect(enabled).toContain(id))
  })
})
