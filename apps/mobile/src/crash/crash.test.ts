import { beforeEach, describe, expect, it } from 'bun:test'
import { crash } from '../../test/firebase'

const { loadCrashReporter, setCrashReporting, startCrashReporting } = await import('./crash')
const { getCrashReports, setCrashReports } = await import('@ihsaanly/state/opt-ins/store')
const { noteFailure } = await import('@ihsaanly/state/storage/events')
const { recentFailures } = await import('@ihsaanly/state/storage/log')

beforeEach(async () => {
  // Every test starts switched off, with nothing forwarded.
  await setCrashReporting(false)
  crash.collection = null
  crash.deletedUnsent = 0
  crash.recorded = []
})

describe('the crash reporting switch', () => {
  it('turns collection on, dropping what was captured while it was off', async () => {
    await setCrashReporting(true)
    expect(getCrashReports()).toBe(true)
    expect(crash.collection).toBe(true)
    expect(crash.deletedUnsent).toBe(1)
  })

  it('forwards logged failures as non-fatals only while on, and never names the person', async () => {
    noteFailure('beforeOn', new Error('not sent'))
    await setCrashReporting(true)
    noteFailure('rollover', new Error('database is locked for a@b.co'))
    await setCrashReporting(false)
    noteFailure('afterOff', new Error('not sent either'))

    expect(crash.recorded).toEqual([
      { name: 'rollover', message: 'database is locked for <email>', jsErrorName: 'rollover' },
    ])
    expect(crash.userIds).toEqual([])
    expect(crash.collection).toBe(false)
  })

  it('does not log a failure to report as another failure', async () => {
    await setCrashReporting(true)
    crash.failing.add('recordError')
    const before = recentFailures().length
    noteFailure('once', new Error('x'))
    expect(recentFailures().length).toBe(Math.min(before + 1, 50))
    expect(recentFailures().at(-1)?.label).toBe('once')
  })

  it('leaves collection as Firebase had it when it cannot be changed', async () => {
    crash.failing.add('setCrashlyticsCollectionEnabled')
    await setCrashReporting(true)
    expect(crash.collection).toBeNull()
    noteFailure('notForwarded', new Error('x'))
    expect(crash.recorded).toEqual([])
  })
})

describe('at launch', () => {
  it('turns collection on as left, keeping the last session crash for sending', async () => {
    setCrashReports(true)
    await startCrashReporting()
    expect(crash.collection).toBe(true)
    expect(crash.deletedUnsent).toBe(0)
    noteFailure('launch', new Error('m'))
    expect(crash.recorded.map((entry) => entry.name)).toEqual(['launch'])
  })

  it('does not touch Crashlytics when it was left off', async () => {
    setCrashReports(false)
    await startCrashReporting()
    expect(crash.collection).toBeNull()
    expect(crash.deletedUnsent).toBe(0)
    noteFailure('quiet', new Error('m'))
    expect(crash.recorded).toEqual([])
  })
})

describe('loadCrashReporter', () => {
  it('is null without native Crashlytics', async () => {
    expect(await loadCrashReporter(() => Promise.reject(new Error('missing')))).toBeNull()
  })

  it('leaves the switch to do nothing but remember the choice', async () => {
    crash.failing.add('getCrashlytics')
    await setCrashReporting(true)
    expect(getCrashReports()).toBe(true)
    expect(crash.collection).toBeNull()
  })
})
