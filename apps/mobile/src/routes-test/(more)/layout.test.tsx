import '../../../test/more'
import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Layout } from '@ihsaanly/ui/layout'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { mockScreen } from '../../../test/more'
import { LayoutHost } from '../../../test/more-host'
import { router } from '../../../test/router'

// `cloudEnabled` is a build-time constant that is false here, and it decides
// whether the Account screen is registered. The real module is put back below.
const realCloud = { ...(await import('@/cloud')) }
const setCloud = (enabled: boolean): void => {
  mock.module('@/cloud', () => ({ ...realCloud, cloudEnabled: enabled }))
}
setCloud(false)

const listed = mockScreen<{ groups: unknown[] }>('@ihsaanly/ui/screens/more', 'MoreScreen')
const { default: MoreLayout, unstable_settings } = await import('../../app/(more)/_layout')
const { getStrings } = await import('@ihsaanly/state/strings')

const host = (layout: Layout): ReactElement => (
  <LayoutHost layout={layout}>
    <MoreLayout />
  </LayoutHost>
)
const titles = (): unknown[] => router.screens.map((options) => options.title)

afterAll(() => {
  mock.module('@/cloud', () => realCloud)
})

describe('more layout', () => {
  beforeEach(() => {
    listed.length = 0
    setCloud(false)
  })

  it('anchors on the index so Back returns to the tab', () => {
    expect(unstable_settings).toEqual({ anchor: 'index' })
  })

  describe('compact', () => {
    it('registers every settings screen with its localised title, without Account or feedback', () => {
      const strings = getStrings()
      render(host('compact'))
      expect(titles()).toEqual([
        strings.more.title,
        strings.location.title,
        strings.calculation.title,
        strings.hijri.title,
        strings.notifications.title,
        strings.tracking.title,
        strings.events.title,
        strings.history.title,
        strings.qada.title,
        strings.data.title,
        strings.diagnostics.title,
        strings.language.title,
        strings.appearance.title,
        strings.about.title,
      ])
    })

    it('adds the Account and Send feedback screens when the build has a cloud', () => {
      setCloud(true)
      render(host('compact'))
      expect(titles()).toContain(getStrings().account.title)
      expect(titles()).toContain(getStrings().feedback.title)
    })

    it('never redirects', () => {
      router.segments = ['(more)']
      router.pathname = '/'
      render(host('compact'))
      expect(router.calls).toEqual([])
    })
  })

  describe.each(['regular', 'wide'] as const)('%s', (layout) => {
    it('replaces the empty index with the first settings row', () => {
      router.segments = ['(more)']
      router.pathname = '/'
      const view = render(host(layout))
      expect(router.calls).toEqual([['replace', '/location']])
      // The list stays, beside an empty detail column rather than a Stack.
      expect(listed).not.toHaveLength(0)
      expect(router.screens).toEqual([])
      expect(view.container.querySelector('.border-s')).toBeNull()
    })

    it('keeps the detail column once a settings row is open', () => {
      router.segments = ['(more)', 'language']
      router.pathname = '/language'
      const view = render(host(layout))
      expect(router.calls).toEqual([])
      expect(listed).not.toHaveLength(0)
      expect(view.container.querySelector('.border-s')).not.toBeNull()
    })

    it('does not pull the user back into More while another tab is focused', () => {
      router.segments = ['(home)']
      router.pathname = '/today'
      render(host(layout))
      expect(router.calls).toEqual([])
    })
  })
})
