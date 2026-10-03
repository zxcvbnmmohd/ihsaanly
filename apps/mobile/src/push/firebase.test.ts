import { describe, expect, it } from 'bun:test'
import { push } from '../../test/firebase'

const { loadPush } = await import('./firebase')

async function api(): Promise<NonNullable<Awaited<ReturnType<typeof loadPush>>>> {
  const loaded = await loadPush()
  if (!loaded) throw new Error('push did not load')
  return loaded
}

describe('loadPush', () => {
  it('is null when the native module is missing or will not start', async () => {
    expect(await loadPush(() => Promise.reject(new Error('no native module')))).toBeNull()
    push.failing.add('getMessaging')
    expect(await loadPush()).toBeNull()
  })
})

describe('the push seam', () => {
  it('registers, makes a token and joins both topics on subscribe', async () => {
    await (await api()).subscribe('fr')
    expect(push.calls).toEqual([
      ['register'],
      ['getToken'],
      ['subscribe', 'announcements'],
      ['subscribe', 'announcements-fr'],
    ])
  })

  it('does not register again on a device that already is', async () => {
    push.registered = true
    await (await api()).subscribe('en')
    expect(push.calls[0]).toEqual(['getToken'])
  })

  it('registers on its own, once', async () => {
    const push$ = await api()
    await push$.register()
    await push$.register()
    expect(push.calls).toEqual([['register']])
  })

  it('swaps only the language topic', async () => {
    await (await api()).switchLanguage('en', 'ar')
    expect(push.calls).toEqual([
      ['unsubscribe', 'announcements-en'],
      ['subscribe', 'announcements-ar'],
    ])
  })

  it('leaves both topics and deletes the token on unsubscribe', async () => {
    push.token = 'token-1'
    await (await api()).unsubscribe('ur')
    expect(push.calls).toEqual([
      ['unsubscribe', 'announcements'],
      ['unsubscribe', 'announcements-ur'],
      ['deleteToken'],
    ])
    expect(push.token).toBeNull()
  })

  it('passes messages on in its own shape', async () => {
    const seen: unknown[] = []
    const push$ = await api()
    const stopForeground = push$.onForeground((message) => seen.push(message))
    const stopOpened = push$.onOpened((message) => seen.push(message))
    push.foreground[0]?.({
      messageId: 'm1',
      notification: { title: 'Ramadan', body: 'Begins tonight' },
      data: { route: '/hijri' },
    })
    push.opened[0]?.({})
    stopForeground()
    stopOpened()
    expect(seen).toEqual([
      { id: 'm1', title: 'Ramadan', body: 'Begins tonight', data: { route: '/hijri' } },
      { id: null, title: null, body: null, data: {} },
    ])
    expect(push.unsubscribed).toBe(2)
  })

  it('reads the launch tap, and treats a failure to read it as none', async () => {
    const push$ = await api()
    expect(await push$.initialOpened()).toBeNull()
    push.initial = { messageId: 'm2', data: { url: 'https://ihsaanly.app' } }
    expect(await push$.initialOpened()).toEqual({
      id: 'm2',
      title: null,
      body: null,
      data: { url: 'https://ihsaanly.app' },
    })
    push.failing.add('getInitialNotification')
    expect(await push$.initialOpened()).toBeNull()
  })
})
