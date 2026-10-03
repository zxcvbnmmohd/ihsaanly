import { beforeEach, expect, it } from 'bun:test'
import { push } from '../../test/firebase'

const { registerBackgroundPush } = await import('./background')
const { setAnnouncements, DEFAULT_ANNOUNCEMENTS } = await import('@ihsaanly/state/opt-ins/store')

beforeEach(() => setAnnouncements({ enabled: true, subscribed: 'en' }))

it('registers a background handler that does nothing', async () => {
  await registerBackgroundPush()
  const [handler] = push.backgroundHandlers
  expect(typeof handler).toBe('function')
  expect(await (handler as () => Promise<unknown>)()).toBeUndefined()
})

it('registers one while a switch-off is still being applied', async () => {
  setAnnouncements({ enabled: false, subscribed: 'en' })
  await registerBackgroundPush()
  expect(push.backgroundHandlers).toHaveLength(1)
})

it('leaves Firebase alone for someone who never opted in', async () => {
  setAnnouncements(DEFAULT_ANNOUNCEMENTS)
  let loaded = 0
  await registerBackgroundPush(async () => {
    loaded += 1
    throw new Error('should not load')
  })
  expect(loaded).toBe(0)
})

it('does nothing without native Firebase', async () => {
  await registerBackgroundPush(() => Promise.reject(new Error('missing')))
  expect(push.backgroundHandlers).toEqual([])
})
