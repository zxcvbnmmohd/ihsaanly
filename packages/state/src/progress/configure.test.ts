import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { resetStorage } from '../../test/storage'

const { setPlace } = await import('../location/store')
const { setCalculationPreferences, getCalculationPreferences } = await import('../prayer/store')
const progress = await import('./store')
const { appProgressContext, startProgress } = await import('./configure')

const london = {
  label: 'London',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
} as const

// 08:00 in London on 3 Oct 2026 (BST): after sunrise, in the morning window.
let at = new Date('2026-10-03T07:00:00Z')
const now = (): Date => at
let reset: () => void = () => {}

beforeEach(() => {
  resetStorage()
  at = new Date('2026-10-03T07:00:00Z')
})

afterEach(() => reset())

describe('appProgressContext', () => {
  it('keeps progress per day in the device zone until a place is saved', () => {
    const context = appProgressContext(now)
    expect(context.timeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(context.periodOf('tasbih-after-prayer')).toMatch(/:day$/)
    expect(context.windowOf?.('tasbih-after-prayer')).toBeUndefined()
  })

  it("files each item under its trigger's period in the place's zone", () => {
    setPlace(london)
    const context = appProgressContext(now)
    expect(context.timeZone()).toBe('Europe/London')
    expect(context.periodOf('morning-adhkar')).toBe('2026-10-03:morning')
    expect(context.periodOf('no-such-item')).toBe('2026-10-03:day')
    expect(context.windowOf?.('morning-adhkar')?.startsAt).toBeInstanceOf(Date)
  })

  it('moves with the clock and with a change of calculation', () => {
    setPlace(london)
    const context = appProgressContext(now)
    const morning = context.periodOf('tasbih-after-prayer')
    at = new Date('2026-10-03T12:30:00Z')
    expect(context.periodOf('tasbih-after-prayer')).not.toBe(morning)
    setCalculationPreferences({ ...getCalculationPreferences() })
    expect(context.periodOf('tasbih-after-prayer')).toBe('2026-10-03:dhuhr')
  })

  it('reads the real clock by default', () => {
    expect(appProgressContext().now().getTime()).toBeGreaterThan(0)
  })
})

describe('startProgress', () => {
  it('configures the store, and hands back its reset', () => {
    setPlace(london)
    reset = startProgress(now)
    progress.addCount('tasbih-after-prayer', 2)
    expect(progress.getItemProgress('tasbih-after-prayer').count).toBe(2)
    reset()
    reset = () => {}
  })
})
