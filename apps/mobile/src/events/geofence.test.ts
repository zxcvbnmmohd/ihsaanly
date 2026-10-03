import { beforeEach, describe, expect, it } from 'bun:test'
import { installLocation, location, resetLocation } from '../../test/location'
import { installReminderFakes, resetReminderFakes, taskState, tasks } from '../../test/reminders'

installLocation()
installReminderFakes()
const geofence = await import('./geofence')

const fire = geofence.onHomeRegionEvent

beforeEach(() => {
  resetReminderFakes()
  resetLocation()
  installLocation()
  installReminderFakes()
})

describe('the home region task', () => {
  it('records entering and leaving home', async () => {
    await fire({ data: { eventType: 1 } })
    expect(geofence.currentHomeTransition()).toBe('entering-home')
    await fire({ data: { eventType: 2 } })
    expect(geofence.currentHomeTransition()).toBe('leaving-home')
  })

  it('keeps the last transition on an error or an empty event', async () => {
    await fire({ data: { eventType: 1 } })
    await fire({ error: new Error('boom'), data: { eventType: 2 } })
    await fire({ data: undefined })
    expect(geofence.currentHomeTransition()).toBe('entering-home')
  })

  it('is what the state package reads as the home transition', async () => {
    const state = await import('@ihsaanly/state/events/home-transition')
    await fire({ data: { eventType: 2 } })
    expect(state.currentHomeTransition()).toBe('leaving-home')
  })

  it('registers the task with the task manager at import', () => {
    expect(tasks[geofence.HOME_REGION_TASK]).toBeDefined()
  })

  it('survives the task manager being unavailable', () => {
    taskState.defineThrows = true
    expect(() => geofence.registerHomeRegionTask()).not.toThrow()
  })
})

describe('startHomeMonitoring', () => {
  const home = { latitude: 25.2, longitude: 55.3 } as never

  it('stops at the first refused permission', async () => {
    location.foreground = { granted: false }
    expect(await geofence.startHomeMonitoring(home)).toBe(false)
    expect(location.asked).toEqual(['foreground'])

    location.foreground = { granted: true }
    location.background = { granted: false }
    expect(await geofence.startHomeMonitoring(home)).toBe(false)
    expect(location.started).toEqual([])
  })

  it('monitors one 150 m region around home, both ways', async () => {
    expect(await geofence.startHomeMonitoring(home)).toBe(true)
    expect(location.started).toEqual([
      {
        task: geofence.HOME_REGION_TASK,
        regions: [
          { latitude: 25.2, longitude: 55.3, radius: 150, notifyOnEnter: true, notifyOnExit: true },
        ],
      },
    ])
  })
})

describe('stopHomeMonitoring', () => {
  it('stops only a registered task', async () => {
    await geofence.stopHomeMonitoring()
    expect(location.stopped).toEqual([])

    taskState.registered.add(geofence.HOME_REGION_TASK)
    await geofence.stopHomeMonitoring()
    expect(location.stopped).toEqual([geofence.HOME_REGION_TASK])
  })
})
