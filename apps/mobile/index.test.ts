import { expect, it, mock } from 'bun:test'
import { installLocation } from './test/location'
import { installReminderFakes, tasks } from './test/reminders'

let entryLoaded = 0
installLocation()
installReminderFakes()
mock.module('expo-router/entry', () => {
  entryLoaded += 1
  return {}
})

it('pulls in the background tasks and the Expo Router entry', async () => {
  await import('./index')
  const geofence = await import('@/events/geofence')
  const background = await import('@/notifications/background-task')
  expect(entryLoaded).toBe(1)
  expect(Object.keys(tasks)).toContain(geofence.HOME_REGION_TASK)
  expect(typeof background.onNotificationTask).toBe('function')
})
