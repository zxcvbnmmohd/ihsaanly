import { describe, expect, it, mock } from 'bun:test'
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import type { Place } from '@ihsaanly/core/location/place'
import type { Strings } from '@ihsaanly/core/strings/en'
import { screen, within } from '@testing-library/react'
import { fireLayout, named, renderScreen } from '../../test/render'
import { THEME_PREFERENCES } from '../types'
import { onboardingFixture } from './fixtures'
import { OnboardingScreen, type OnboardingScreenProps } from './onboarding'

const restoreName = (strings: Strings): string =>
  `${strings.onboarding.restorePrompt} ${strings.onboarding.restoreAction}`

const welcome = { ...onboardingFixture, step: 'welcome', stepIndex: 0 } as const

describe('OnboardingScreen, welcome step', () => {
  it('greets in the chosen language', () => {
    const { strings } = renderScreen(<OnboardingScreen {...welcome} />)
    expect(screen.getByText(strings.onboarding.welcomeTitle)).toBeTruthy()
    expect(screen.getByText(strings.onboarding.welcomeBody)).toBeInTheDocument()
  })

  it('moves on when Continue is pressed', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(<OnboardingScreen {...welcome} onNext={onNext} />)
    await user.click(screen.getByRole('button', { name: strings.onboarding.continue }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('renders another locale', () => {
    const { strings } = renderScreen(<OnboardingScreen {...welcome} language="ar" />, {
      locale: 'ar',
      scheme: 'dark',
    })
    expect(screen.getByText(strings.onboarding.welcomeTitle)).toBeTruthy()
  })
})

type Step = OnboardingScreenProps['step']

const steps: Step[] = ['welcome', 'how', 'location', 'you', 'reminders', 'start']

function at(step: Step, change: Partial<OnboardingScreenProps> = {}): OnboardingScreenProps {
  return { ...onboardingFixture, step, stepIndex: steps.indexOf(step), ...change }
}

const toronto = onboardingFixture.results[0] as Place

describe('OnboardingScreen, welcome step options', () => {
  it('offers every language and theme in a dropdown each, reporting the choice', async () => {
    const onSelectLanguage = mock((_language: string) => {})
    const onSelectTheme = mock((_theme: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen
        {...at('welcome', { theme: 'light' })}
        onSelectLanguage={onSelectLanguage}
        onSelectTheme={onSelectTheme}
      />,
    )
    const language = screen.getByRole('combobox', { name: strings.onboarding.language })
    const theme = screen.getByRole('combobox', { name: strings.onboarding.appearance })
    expect(language).toHaveValue('en')
    expect(theme).toHaveValue('light')
    expect(
      screen.getByRole('option', { name: strings.language.names.en, selected: true }),
    ).toBeInTheDocument()
    expect(
      within(language)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(SUPPORTED_LANGUAGES.map((option) => strings.language.names[option]))
    expect(
      within(theme)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(THEME_PREFERENCES.map((option) => strings.appearance[option]))

    await user.selectOptions(language, 'fr')
    await user.selectOptions(theme, 'dark')
    expect(onSelectLanguage).toHaveBeenCalledWith('fr')
    expect(onSelectTheme).toHaveBeenCalledWith('dark')
    expect(screen.queryByText(strings.language.restart)).toBeNull()
  })

  it('warns that a right-to-left language needs a restart', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('welcome', { language: 'ar' })} />)
    expect(screen.getByText(strings.language.restart)).toBeInTheDocument()
  })

  it('skips the intro and restores an account from the top bar when the build offers it', async () => {
    const onSkipIntro = mock(() => {})
    const onRestore = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('welcome')} onSkipIntro={onSkipIntro} onRestore={onRestore} />,
    )
    const restore = screen.getByRole('button', { name: restoreName(strings) })
    // In the top bar, before Skip, and not in the footer under Continue.
    const skip = screen.getByRole('button', { name: strings.onboarding.skipIntro })
    expect(restore.parentElement).toBe(skip.parentElement)
    expect(restore.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const proceed = screen.getByRole('button', { name: strings.onboarding.continue })
    expect(proceed.parentElement?.contains(restore)).toBe(false)
    expect(within(restore).getByText(strings.onboarding.restoreAction)).toBeInTheDocument()

    await user.click(skip)
    await user.click(restore)
    expect(onSkipIntro).toHaveBeenCalledTimes(1)
    expect(onRestore).toHaveBeenCalledTimes(1)
  })

  it('hides restore in a local-only build, and gives its place to Back on later steps', () => {
    const { strings, unmount } = renderScreen(<OnboardingScreen {...at('welcome')} />)
    expect(screen.queryByRole('button', { name: restoreName(strings) })).toBeNull()
    unmount()
    renderScreen(<OnboardingScreen {...at('how')} onRestore={() => {}} />)
    expect(screen.queryByRole('button', { name: restoreName(strings) })).toBeNull()
    expect(screen.getByRole('button', { name: strings.onboarding.back })).toBeInTheDocument()
  })

  it('has no privacy policy link; that lives in About', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('welcome')} onRestore={() => {}} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText(strings.about.privacyPolicy)).toBeNull()
  })

  it('fits the art to the height left over, so a small phone does not scroll', () => {
    renderScreen(<OnboardingScreen {...at('welcome')} />)
    const slot = screen.getByTestId('welcome-art')
    // The centring frame, then the grid inside it.
    const width = (): string => {
      const grid = slot.firstElementChild?.firstElementChild
      return grid ? getComputedStyle(grid).width : ''
    }
    // Nothing until measured, then the space it has, up to the full 228pt.
    expect(slot.childElementCount).toBe(0)
    fireLayout(slot, 327, 150)
    expect(width()).toBe('150px')
    fireLayout(slot, 327, 600)
    expect(width()).toBe('228px')
    // Too small to read as stars: left out rather than squeezed.
    fireLayout(slot, 327, 40)
    expect(slot.childElementCount).toBe(0)
  })

  it('has no Back on the first step', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('welcome')} />)
    expect(screen.queryByRole('button', { name: strings.onboarding.back })).toBeNull()
  })
})

describe('OnboardingScreen, how step', () => {
  it('explains the approach in one sentence, and goes back or skips', async () => {
    const onBack = mock(() => {})
    const onSkipIntro = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('how')} onBack={onBack} onSkipIntro={onSkipIntro} />,
    )
    expect(screen.getByText(strings.onboarding.howTitle)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.back }))
    await user.click(screen.getByRole('button', { name: strings.onboarding.skipIntro }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onSkipIntro).toHaveBeenCalledTimes(1)
  })

  it('lets the example circle be tried', async () => {
    const { user, strings } = renderScreen(<OnboardingScreen {...at('how')} />)
    const circle = screen.getByRole('checkbox', { name: strings.onboarding.howExample })
    expect(circle).toHaveAttribute('aria-checked', 'true')
    await user.click(circle)
    expect(circle).toHaveAttribute('aria-checked', 'false')
  })
})

describe('OnboardingScreen, location step', () => {
  it('invites using the device, and reports a search', async () => {
    const onUseDevice = mock(() => {})
    const onQueryChange = mock((_query: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen
        {...at('location')}
        onUseDevice={onUseDevice}
        onQueryChange={onQueryChange}
      />,
    )
    expect(screen.getByText(strings.location.useDeviceDetail)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: named(strings.location.useDevice) }))
    expect(onUseDevice).toHaveBeenCalledTimes(1)
    await user.type(screen.getByRole('textbox', { name: strings.location.searchLabel }), 'o')
    expect(onQueryChange).toHaveBeenCalledWith('torono')
  })

  it('cannot continue without a place, but can skip it', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(<OnboardingScreen {...at('location')} onNext={onNext} />)
    await user.click(screen.getByRole('button', { name: strings.onboarding.continue }))
    expect(onNext).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: strings.onboarding.skipLocation }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('selects a result, dismissing the keyboard first', async () => {
    const onSelectPlace = mock((_place: Place) => {})
    const { user } = renderScreen(
      <OnboardingScreen {...at('location')} onSelectPlace={onSelectPlace} />,
    )
    await user.click(screen.getByRole('button', { name: named('Toronto') }))
    expect(onSelectPlace).toHaveBeenCalledWith(toronto)
  })

  it('limits the results to six', () => {
    const results = Array.from({ length: 9 }, (_, index) => ({
      ...toronto,
      label: `City ${index}, Land`,
    }))
    renderScreen(<OnboardingScreen {...at('location', { results })} />)
    expect(screen.getByRole('button', { name: named('City 5') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: named('City 6') })).toBeNull()
  })

  it('shows the chosen place as settled and lets the user continue', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('location', { place: toronto })} onNext={onNext} />,
    )
    expect(screen.getByText(strings.location.follows)).toBeInTheDocument()
    expect(screen.getAllByText('Ontario, Canada')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: strings.onboarding.skipLocation })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.onboarding.continue }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('shows a place with no region as just its city', () => {
    renderScreen(
      <OnboardingScreen
        {...at('location', { place: { ...toronto, label: 'Atlantis' }, results: [] })}
      />,
    )
    expect(screen.getByText('Atlantis')).toBeInTheDocument()
  })

  it('says it is locating, and cannot be pressed again', async () => {
    const onUseDevice = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('location', { locating: true })} onUseDevice={onUseDevice} />,
    )
    await user.click(screen.getByRole('button', { name: strings.location.locating }))
    expect(onUseDevice).not.toHaveBeenCalled()
  })

  it('keeps the card as a call to action while locating over a chosen place', () => {
    const { strings } = renderScreen(
      <OnboardingScreen {...at('location', { place: toronto, locating: true })} />,
    )
    expect(screen.getByRole('button', { name: strings.location.locating })).toBeInTheDocument()
    expect(screen.queryByText(strings.location.follows)).toBeNull()
  })

  it.each([
    ['declined', 'declined'],
    ['unavailable', 'unavailable'],
  ] as const)('explains a %s location on the card', (problem, key) => {
    const { strings } = renderScreen(<OnboardingScreen {...at('location', { problem })} />)
    expect(screen.getByText(strings.location[key])).toBeInTheDocument()
  })

  it('says when a search finds nothing', () => {
    const { strings } = renderScreen(
      <OnboardingScreen {...at('location', { query: 'zzz', results: [] })} />,
    )
    expect(screen.getByText(strings.location.noResults)).toBeInTheDocument()
  })

  it('does not say so for a one-letter query', () => {
    const { strings } = renderScreen(
      <OnboardingScreen {...at('location', { query: 'z', results: [] })} />,
    )
    expect(screen.queryByText(strings.location.noResults)).toBeNull()
  })
})

describe('OnboardingScreen, you step', () => {
  it.each([
    ['brother', 'male'],
    ['sister', 'female'],
  ] as const)('picks %s', async (key, gender) => {
    const onSelectGender = mock((_gender: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('you')} onSelectGender={onSelectGender} />,
    )
    await user.click(screen.getByRole('radio', { name: named(strings.onboarding[key]) }))
    expect(onSelectGender).toHaveBeenCalledWith(gender)
  })

  it('lets the user skip, and shows the current choice', async () => {
    const onSelectGender = mock((_gender: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('you', { gender: 'female' })} onSelectGender={onSelectGender} />,
    )
    expect(screen.getByRole('radio', { name: named(strings.onboarding.sister) })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('radio', { name: named(strings.onboarding.brother) })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await user.click(screen.getByRole('radio', { name: named(strings.onboarding.skip) }))
    expect(onSelectGender).toHaveBeenCalledWith('unspecified')
  })

  it('says how the answer is kept before asking for it', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('you')} />)
    const privacy = screen.getByText(strings.onboarding.genderPrivacy)
    const brother = screen.getByRole('radio', { name: named(strings.onboarding.brother) })
    expect(screen.getByText(strings.onboarding.genderWhy)).toBeInTheDocument()
    // Earlier in reading order than the tiles.
    expect(privacy.compareDocumentPosition(brother) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('marks the brother tile when male', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('you', { gender: 'male' })} />)
    expect(screen.getByRole('radio', { name: named(strings.onboarding.brother) })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})

describe('OnboardingScreen, reminders step', () => {
  const off = {
    ...onboardingFixture.notifications,
    windows: false,
    lookAhead: false,
    prayers: false,
  }

  it('offers daily reminders, on, and turns them off or on', async () => {
    const onToggleReminders = mock((_on: boolean) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('reminders')} onToggleReminders={onToggleReminders} />,
    )
    expect(screen.getByText(strings.onboarding.remindersWhy)).toBeInTheDocument()
    const daily = screen.getByRole('switch', { name: named(strings.onboarding.dailyReminders) })
    expect(daily).toBeChecked()
    expect(screen.getByText(strings.onboarding.dailyRemindersDetail)).toBeInTheDocument()
    await user.click(daily)
    expect(onToggleReminders).toHaveBeenCalledWith(false)
  })

  it('shows daily reminders off when every category is off', async () => {
    const onToggleReminders = mock((_on: boolean) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen
        {...at('reminders', { notifications: off })}
        onToggleReminders={onToggleReminders}
      />,
    )
    const daily = screen.getByRole('switch', { name: named(strings.onboarding.dailyReminders) })
    expect(daily).not.toBeChecked()
    // No quiet hours to mention when nothing is scheduled.
    expect(screen.queryByText(strings.onboarding.reminderQuiet(22, 7))).toBeNull()
    await user.click(daily)
    expect(onToggleReminders).toHaveBeenCalledWith(true)
  })

  it('offers no announcements where the host cannot send them', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('reminders')} />)
    expect(
      screen.queryByRole('switch', { name: named(strings.onboarding.announcementsChoice) }),
    ).toBeNull()
  })

  it('offers announcements, off until chosen, and reports the choice', async () => {
    const onChange = mock((_on: boolean) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('reminders', { announcements: { on: false, onChange } })} />,
    )
    const announcements = screen.getByRole('switch', {
      name: named(strings.onboarding.announcementsChoice),
    })
    expect(announcements).not.toBeChecked()
    expect(screen.getByText(strings.onboarding.announcementsChoiceDetail)).toBeInTheDocument()
    await user.click(announcements)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('states the quiet hours, and allows or declines', async () => {
    const onNext = mock(() => {})
    const onNotNow = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('reminders')} onNext={onNext} onNotNow={onNotNow} />,
    )
    expect(screen.getByText(strings.onboarding.reminderQuiet(22, 7))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.allowNotifications }))
    await user.click(screen.getByRole('button', { name: strings.onboarding.notNow }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onNotNow).toHaveBeenCalledTimes(1)
  })

  it('states nothing without quiet hours', () => {
    const { strings } = renderScreen(
      <OnboardingScreen
        {...at('reminders', {
          notifications: { ...onboardingFixture.notifications, quietHours: null },
        })}
      />,
    )
    expect(screen.queryByText(strings.onboarding.reminderQuiet(22, 7))).toBeNull()
    expect(screen.queryByText(/:00/)).toBeNull()
  })

  it('asks to allow notifications for announcements alone', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen
        {...at('reminders', {
          notifications: off,
          announcements: { on: true, onChange: () => {} },
        })}
        onNext={onNext}
      />,
    )
    expect(screen.getByRole('button', { name: strings.onboarding.notNow })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.allowNotifications }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('just continues when neither is chosen', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen
        {...at('reminders', {
          notifications: off,
          announcements: { on: false, onChange: () => {} },
        })}
        onNext={onNext}
      />,
    )
    expect(screen.queryByRole('button', { name: strings.onboarding.notNow })).toBeNull()
    expect(screen.queryByRole('button', { name: strings.onboarding.allowNotifications })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.onboarding.continue }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})

describe('OnboardingScreen, start step', () => {
  it('picks a preset and shows the current one', async () => {
    const onSelectPreset = mock((_preset: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('start')} onSelectPreset={onSelectPreset} />,
    )
    expect(
      screen.getByRole('radio', { name: named(strings.onboarding.essentials) }),
    ).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: named(strings.onboarding.starting) }))
    await user.click(screen.getByRole('radio', { name: named(strings.onboarding.essentials) }))
    await user.click(screen.getByRole('radio', { name: named(strings.onboarding.everything) }))
    expect(onSelectPreset.mock.calls.map(([preset]) => preset)).toEqual([
      'starting',
      'essentials',
      'everything',
    ])
  })

  it('describes each size in one line, and finishes', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(<OnboardingScreen {...at('start')} onNext={onNext} />)
    expect(screen.getByText(strings.onboarding.startingDetail)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.essentialsDetail)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.everythingDetail)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.done }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('has no preset ringed when none is chosen', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('start', { preset: null })} />)
    expect(
      screen.getByRole('radio', { name: named(strings.onboarding.essentials) }),
    ).toHaveAttribute('aria-checked', 'false')
  })
})

describe('OnboardingScreen, chrome', () => {
  it('without reduced motion or safe-area insets, still renders every step', () => {
    for (const step of steps) {
      const { unmount } = renderScreen(<OnboardingScreen {...at(step)} />, { scheme: 'dark' })
      unmount()
    }
  })

  it('refuses a step it does not know', () => {
    const consoleError = console.error
    console.error = () => {}
    try {
      expect(() =>
        renderScreen(<OnboardingScreen {...onboardingFixture} step={'nope' as never} />),
      ).toThrow()
    } finally {
      console.error = consoleError
    }
  })
})
