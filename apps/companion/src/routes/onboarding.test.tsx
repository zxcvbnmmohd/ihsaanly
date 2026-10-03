import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { en } from '@ihsaanly/core/strings/en'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { getPlace } from '@ihsaanly/state/location/store'
import { getNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { getOnboarding } from '@ihsaanly/state/onboarding/store'
import { getEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp } from '../../test/app'
import { getThemePreference, setThemePreference } from '../theme/store'

beforeEach(async () => {
  await resetApp()
  setThemePreference('system')
})

const path = (app: Awaited<ReturnType<typeof renderApp>>): string =>
  app.router.state.location.pathname

const next = (user: Awaited<ReturnType<typeof renderApp>>['user']): Promise<void> =>
  user.click(screen.getByRole('button', { name: en.onboarding.continue }))

describe('the steps', () => {
  it('has one URL per step, welcome first', async () => {
    const app = await renderApp('/onboarding/welcome')
    expect(await screen.findByText(en.onboarding.welcomeTitle)).toBeInTheDocument()
    await next(app.user)
    await waitFor(() => expect(path(app)).toBe('/onboarding/how'))
    expect(await screen.findByText(en.onboarding.howTitle)).toBeInTheDocument()
  })

  it('goes back a step, and never before the first', async () => {
    const app = await renderApp('/onboarding/how')
    await app.user.click(await screen.findByRole('button', { name: en.onboarding.back }))
    await waitFor(() => expect(path(app)).toBe('/onboarding/welcome'))
  })

  it('skips the introduction straight to the setup', async () => {
    const app = await renderApp('/onboarding/welcome')
    await app.user.click(await screen.findByRole('button', { name: en.onboarding.skipIntro }))
    await waitFor(() => expect(path(app)).toBe('/onboarding/location'))
  })

  it('changes the theme and the language on the first step', async () => {
    const app = await renderApp('/onboarding/welcome')
    await app.user.click(await screen.findByRole('button', { name: 'Dark' }))
    expect(getThemePreference()).toBe('dark')
    setThemePreference('system')

    await app.user.click(screen.getByRole('button', { name: 'Français' }))
    expect(supportedLanguageOf(getLocale())).toBe('fr')
    await app.user.click(screen.getByRole('button', { name: 'English' }))
    expect(supportedLanguageOf(getLocale())).toBe('en')
  })
})

describe('the location step', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation')

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'geolocation', original)
    else Reflect.deleteProperty(navigator, 'geolocation')
  })

  it('uses the device location', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: (position: unknown) => void) =>
          success({ coords: { latitude: 51.5074, longitude: -0.1278 } }),
      },
    })
    const app = await renderApp('/onboarding/location')
    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(`^${en.location.useDevice}`) }),
    )
    await waitFor(() => expect(getPlace()?.source).toBe('device'))
  })

  it('searches for a city instead', async () => {
    const app = await renderApp('/onboarding/location')
    await app.user.type(await screen.findByPlaceholderText(en.location.search), 'Cairo')
    await app.user.click(
      (await screen.findAllByRole('button', { name: /Cairo/ }))[0] as HTMLElement,
    )
    expect(getPlace()?.label).toContain('Cairo')
  })
})

describe('finishing', () => {
  it('walks every step, answers the questions, and lands on Today with onboarding done', async () => {
    const app = await renderApp('/onboarding/you')
    await app.user.click(
      await screen.findByRole('radio', { name: new RegExp(`^${en.onboarding.sister}`) }),
    )
    expect(getOnboarding().gender).toBe('female')
    await next(app.user)

    await waitFor(() => expect(path(app)).toBe('/onboarding/reminders'))
    await app.user.click((await screen.findAllByRole('switch'))[0] as HTMLElement)
    expect(getNotificationPreferences().windows).toBe(false)
    await app.user.click(screen.getByRole('button', { name: en.onboarding.allowReminders }))

    await waitFor(() => expect(path(app)).toBe('/onboarding/start'))
    await app.user.click(
      await screen.findByRole('radio', { name: new RegExp(`^${en.onboarding.starting}`) }),
    )
    expect(getEnabledItems().length).toBeGreaterThan(0)
    await app.user.click(screen.getByRole('button', { name: en.onboarding.done }))

    await waitFor(() => expect(path(app)).toBe('/today'))
    expect(getOnboarding().completed).toBe(true)
    expect(getOnboarding().completedAt).toBeDefined()
  })

  it('"Not now" on the reminders step moves on without asking for permission', async () => {
    const app = await renderApp('/onboarding/reminders')
    await app.user.click(await screen.findByRole('button', { name: en.onboarding.notNow }))
    await waitFor(() => expect(path(app)).toBe('/onboarding/start'))
  })

  it('goes back from the last step to the one before', async () => {
    const app = await renderApp('/onboarding/start')
    await app.user.click(await screen.findByRole('button', { name: en.onboarding.back }))
    await waitFor(() => expect(path(app)).toBe('/onboarding/reminders'))
  })
})

describe('signing in to restore', () => {
  it('offers it on the first step, and goes to Account as the restore flow', async () => {
    const app = await renderApp('/onboarding/welcome')
    await app.user.click(await screen.findByRole('button', { name: en.onboarding.restore }))
    await waitFor(() => expect(path(app)).toBe('/account'))
    expect(app.router.state.location.search).toEqual({ from: 'onboarding' })
  })
})

describe('the route', () => {
  it('shows nothing of the app around it', async () => {
    await renderApp('/onboarding/welcome')
    await screen.findByText(en.onboarding.welcomeTitle)
    expect(screen.queryByRole('link', { name: en.tabs.today })).toBeNull()
  })
})
