// The settings pages: each is a thin route over a @ihsaanly/ui screen, so
// these check the wiring (what it reads, what a tap writes) through the real
// route tree, stores and strings.
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { en } from '@ihsaanly/core/strings/en'
import { getEventSettings } from '@ihsaanly/state/events/store'
import { getHijriOffset } from '@ihsaanly/state/hijri/store'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { getNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { setOnboarding } from '@ihsaanly/state/onboarding/store'
import { setEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { getUserState } from '@ihsaanly/state/plan/user-state-store'
import { getCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { screen, waitFor, within } from '@testing-library/react'
import { LONDON, renderApp, resetApp, setWidth, startUsing } from '../../test/app'
import { setThemePreference } from '../theme/store'

beforeEach(async () => {
  await resetApp()
  setThemePreference('system')
  await startUsing()
})

describe('Appearance', () => {
  it('shows the saved choice and saves another, applying it to the page', async () => {
    const app = await renderApp('/appearance')
    expect(await screen.findByRole('radio', { name: 'System' })).toBeChecked()
    await app.user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(localStorage.getItem('ihsaanly.theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    setThemePreference('system')
  })
})

describe('Language', () => {
  it('marks the current language and switches the app to another', async () => {
    const app = await renderApp('/language')
    expect(await screen.findByRole('radio', { name: 'English' })).toBeChecked()
    await app.user.click(screen.getByRole('radio', { name: 'Français' }))
    expect(supportedLanguageOf(getLocale())).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    await app.user.click(screen.getByRole('radio', { name: 'English' }))
    expect(supportedLanguageOf(getLocale())).toBe('en')
  })
})

describe('Calculation', () => {
  it('saves a changed method and keeps the other choices', async () => {
    const before = getCalculationPreferences()
    const app = await renderApp('/calculation')
    await app.user.click(await screen.findByRole('radio', { name: 'Hanafi' }))
    expect(getCalculationPreferences()).toEqual({ ...before, asr: 'hanafi' })
    await app.user.click(screen.getByRole('radio', { name: 'Egyptian General Authority' }))
    expect(getCalculationPreferences().asr).toBe('hanafi')
    expect(getCalculationPreferences().method).not.toBe(before.method)
  })
})

describe('Hijri date', () => {
  it('saves the day adjustment', async () => {
    const app = await renderApp('/hijri')
    await app.user.click(await screen.findByRole('radio', { name: '+1 day' }))
    expect(getHijriOffset()).toBe(1)
  })
})

describe('Tracking', () => {
  it('saves the travelling switch and offers the pause to those it may apply to', async () => {
    const app = await renderApp('/tracking')
    const travelling = await screen.findByRole('switch', { name: 'Travelling' })
    await app.user.click(travelling)
    expect(getUserState().travelling).toBe(true)
    expect(screen.getByRole('switch', { name: 'Pause prayer tracking' })).toBeInTheDocument()
  })

  it('does not offer the pause to someone who said they are male', async () => {
    setOnboarding({ completed: true, gender: 'male' })
    await renderApp('/tracking')
    await screen.findByRole('switch', { name: 'Travelling' })
    expect(screen.queryByRole('switch', { name: 'Pause prayer tracking' })).toBeNull()
  })
})

describe('Where you are', () => {
  it('saves the home-detection toggle and the manual events, and says it is not active here', async () => {
    const app = await renderApp('/events')
    expect(await screen.findByText(en.web.homeDetectionUnavailable)).toBeInTheDocument()

    await app.user.click(screen.getByRole('switch', { name: 'Notice when I leave home' }))
    expect(getEventSettings().detectHome).toBe(true)

    await app.user.click(screen.getByRole('switch', { name: 'Driving' }))
    expect(getEventSettings().manual).toEqual(['driving'])
    await app.user.click(screen.getByRole('switch', { name: 'Travelling' }))
    expect(getEventSettings().manual).toEqual(['driving', 'travel'])
    await app.user.click(screen.getByRole('switch', { name: 'Driving' }))
    expect(getEventSettings().manual).toEqual(['travel'])
  })

  it('sets home to the chosen place', async () => {
    const app = await renderApp('/events')
    await app.user.click(
      await screen.findByRole('button', { name: /Set home to my current place/ }),
    )
    expect(getEventSettings().home).toEqual({
      latitude: LONDON.latitude,
      longitude: LONDON.longitude,
      label: LONDON.label,
    })
  })

  it('sends someone with no place to pick one first', async () => {
    await resetApp()
    await startUsing({ place: null })
    const app = await renderApp('/events')
    const [row] = await screen.findAllByRole('link', { name: /Set home to my current place/ })
    await app.user.click(row as HTMLElement)
    expect(app.router.state.location.pathname).toBe('/location')
    expect(getEventSettings().home).toBeNull()
  })
})

describe('Reminders', () => {
  it('saves the switches, explains they cannot fire in a browser, and alerts on "send test"', async () => {
    setEnabledItems(['dua-leaving-home'])
    const app = await renderApp('/notifications')
    expect(await screen.findByText(en.web.remindersUnavailable)).toBeInTheDocument()

    await app.user.click(screen.getByRole('switch', { name: 'Prayer reminders' }))
    expect(getNotificationPreferences().prayers).toBe(true)

    const alerts: string[] = []
    const original = window.alert
    window.alert = (message?: string) => void alerts.push(message ?? '')
    try {
      await app.user.click(screen.getByRole('button', { name: /Send a test reminder/ }))
      await app.user.click(screen.getByRole('button', { name: /Send a test reminder/ }))
    } finally {
      window.alert = original
    }
    expect(alerts).toEqual([en.web.remindersUnavailable, en.web.remindersUnavailable])
  })

  it('lists the items that can remind and saves a per-item switch', async () => {
    const { items } = await import('@ihsaanly/core/content')
    const windowItem = items.find((item) => item.trigger.kind === 'window')
    if (!windowItem) throw new Error('no window item in the content')
    setEnabledItems([windowItem.id])
    const app = await renderApp('/notifications')
    const { resolveText } = await import('@ihsaanly/core/content')
    const toggle = await screen.findByRole('switch', { name: resolveText(windowItem.title) ?? '' })
    await app.user.click(toggle)
    expect(getNotificationPreferences().perItem[windowItem.id]).toBeDefined()
  })
})

describe('Location', () => {
  it('searches cities and saves the one chosen, then goes back', async () => {
    await startUsing({ place: null })
    const app = await renderApp('/location')
    const field = await screen.findByPlaceholderText('Search for a city')
    await app.user.type(field, 'Lond')
    const result = await screen.findAllByRole('button', { name: /London/ })
    await app.user.click(result[0] as HTMLElement)
    const { getPlace } = await import('@ihsaanly/state/location/store')
    expect(getPlace()?.label).toContain('London')
  })

  describe('the device location', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation')
    afterEach(() => {
      if (original) Object.defineProperty(navigator, 'geolocation', original)
      else Reflect.deleteProperty(navigator, 'geolocation')
    })

    function geolocation(
      run: (success: (p: unknown) => void, failure: (e: unknown) => void) => void,
    ): void {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: { getCurrentPosition: run },
      })
    }

    it('saves the fix as the place', async () => {
      await startUsing({ place: null })
      geolocation((success) => success({ coords: { latitude: 30.0444, longitude: 31.2357 } }))
      const app = await renderApp('/location')
      await app.user.click(
        await screen.findByRole('button', { name: new RegExp(`^${en.location.useDevice}`) }),
      )
      const { getPlace } = await import('@ihsaanly/state/location/store')
      await waitFor(() => expect(getPlace()?.source).toBe('device'))
    })

    it('says so when it is declined, and offers settings that a browser cannot open', async () => {
      geolocation((_success, failure) => failure({ code: 1, PERMISSION_DENIED: 1 }))
      const app = await renderApp('/location')
      await app.user.click(
        await screen.findByRole('button', { name: new RegExp(`^${en.location.useDevice}`) }),
      )
      expect(await screen.findByText(en.location.declined)).toBeInTheDocument()
      await app.user.click(
        screen.getByRole('button', { name: new RegExp(`^${en.notifications.openSettings}`) }),
      )
      expect(screen.getByText(en.location.declined)).toBeInTheDocument()
    })

    it('says so when the position cannot be read', async () => {
      geolocation((success) =>
        success({
          get coords(): never {
            throw new Error('broken')
          },
        }),
      )
      const app = await renderApp('/location')
      await app.user.click(
        await screen.findByRole('button', { name: new RegExp(`^${en.location.useDevice}`) }),
      )
      expect(await screen.findByText(en.location.unavailable)).toBeInTheDocument()
    })
  })

  it('says when nothing matches', async () => {
    const app = await renderApp('/location')
    await app.user.type(await screen.findByPlaceholderText('Search for a city'), 'zzzzzz')
    expect(await screen.findByText(en.location.noResults)).toBeInTheDocument()
  })
})

describe('Your data row, diagnostics and history', () => {
  it('History renders for an empty log', async () => {
    await renderApp('/history')
    expect(await screen.findByRole('heading', { name: en.history.title })).toBeInTheDocument()
  })
})

describe('the page header (compact)', () => {
  it('shows the title and a Back button that returns to where you were', async () => {
    const app = await renderApp('/more')
    await screen.findByPlaceholderText(en.more.search)
    await app.router.navigate({ to: '/about' })
    const heading = await screen.findByRole('heading', { name: en.about.title })
    expect(within(document.body).getByRole('heading', { name: en.about.title })).toBe(heading)

    await app.user.click(screen.getByRole('button', { name: en.onboarding.back }))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/more'))
  })

  it('has no Back button on the tabs, and no header at all at wider sizes', async () => {
    const tab = await renderApp('/today')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('button', { name: en.onboarding.back })).toBeNull()
    tab.unmount()

    setWidth(1280)
    await renderApp('/about')
    await screen.findByRole('heading', { name: en.about.title })
    expect(screen.queryByRole('button', { name: en.onboarding.back })).toBeNull()
  })
})
