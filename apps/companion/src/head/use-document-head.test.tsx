import { beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

const robots = (): string | null =>
  document.getElementById('route-robots')?.getAttribute('content') ?? null

describe('the tab title and robots meta follow the route', () => {
  beforeEach(async () => {
    await resetApp()
    document.getElementById('route-robots')?.remove()
    await startUsing()
  })

  it('names the page after its screen and keeps the app out of the index', async () => {
    await renderApp('/today')
    await waitFor(() => expect(document.title).toBe(`${en.today.title} · Ihsaanly`))
    expect(robots()).toBe('noindex')
  })

  it('adds the meta once, and drops it where the page is indexable', async () => {
    const app = await renderApp('/today')
    await waitFor(() => expect(robots()).toBe('noindex'))
    await app.router.navigate({ to: '/library' })
    await waitFor(() => expect(document.title).toBe(`${en.library.title} · Ihsaanly`))
    expect(document.querySelectorAll('#route-robots')).toHaveLength(1)

    // Back at the door (the gate sends it to the first onboarding step): indexable again.
    const { setOnboarding } = await import('@ihsaanly/state/onboarding/store')
    setOnboarding({ completed: false, gender: 'unspecified' })
    await app.router.navigate({ to: '/' })
    await waitFor(() => expect(robots()).toBeNull())
    expect(app.router.state.location.pathname).toBe('/onboarding/welcome')
  })

  it('titles an item after itself and an unknown one "Not found"', async () => {
    const app = await renderApp('/item/dua-leaving-home')
    await waitFor(() => expect(document.title).toEndWith(' · Ihsaanly'))
    expect(document.title).not.toStartWith(en.notFound.title)

    await app.router.navigate({ to: '/item/$id', params: { id: 'nope' } })
    await waitFor(() => expect(document.title).toBe(`${en.notFound.title} · Ihsaanly`))
  })

  it('keeps the default title on the first onboarding step', async () => {
    await resetApp()
    await renderApp('/')
    await waitFor(() => expect(document.title).toBe('Ihsaanly'))
    expect(robots()).toBeNull()
  })
})
