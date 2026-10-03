import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { Linking } from 'react-native'
import { router } from '../../test/router'

const { openAnnouncement } = await import('./open')

const opened: string[] = []
let rejects = false
const spy = spyOn(Linking, 'openURL').mockImplementation(async (url: string) => {
  if (rejects) throw new Error('no browser')
  opened.push(url)
})
afterEach(() => {
  opened.length = 0
  rejects = false
})

// Each test is a moment well apart from the last, so none is taken for a repeat.
let now = 0
function later(): number {
  now += 60_000
  return now
}

describe('openAnnouncement', () => {
  it('goes to the route when there is one, even with a link', () => {
    openAnnouncement(
      { v: 1, kind: 'announcement', route: '/hijri', url: 'https://ihsaanly.app' },
      later(),
    )
    expect(router.calls).toEqual([['push', '/hijri']])
    expect(opened).toEqual([])
  })

  it('opens the link in the browser when there is no route', async () => {
    openAnnouncement(
      { v: 1, kind: 'announcement', route: null, url: 'https://ihsaanly.app/r' },
      later(),
    )
    await Promise.resolve()
    expect(opened).toEqual(['https://ihsaanly.app/r'])
    expect(router.calls).toEqual([])
  })

  it('stays quiet when no browser can open the link', async () => {
    rejects = true
    openAnnouncement({ v: 1, kind: 'announcement', route: null, url: 'https://x.example' }, later())
    await Promise.resolve()
    expect(spy).toHaveBeenCalled()
  })

  it('opens Today without a target', () => {
    openAnnouncement({ v: 1, kind: 'announcement', route: null, url: null }, later())
    expect(router.calls).toEqual([['push', '/']])
  })

  it('follows one tap reported twice once, and a later tap again', () => {
    const at = later()
    const data = { v: 1, kind: 'announcement', route: '/library', url: null } as const
    openAnnouncement(data, at)
    openAnnouncement(data, at + 1_000)
    openAnnouncement({ ...data, route: '/more' }, at + 1_500)
    openAnnouncement(data, at + 10_000)
    expect(router.calls).toEqual([
      ['push', '/library'],
      ['push', '/more'],
      ['push', '/library'],
    ])
  })

  it('reads the clock when no moment is given', () => {
    openAnnouncement({ v: 1, kind: 'announcement', route: '/clock', url: null })
    expect(router.calls).toEqual([['push', '/clock']])
  })
})
