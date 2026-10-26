import { describe, expect, it, mock } from 'bun:test'
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import type { Place } from '@ihsaanly/core/location/place'
import type { Strings } from '@ihsaanly/core/strings/en'
import { ACCENTS, paletteFor } from '@ihsaanly/tailwind/tokens'
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
    expect(screen.getByText(strings.onboarding.free)).toBeInTheDocument()
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

const steps: Step[] = [
  'welcome',
  'how',
  'sourced',
  'location',
  'you',
  'start',
  'reminders',
  'accent',
  'widgets',
  'summary',
]

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
      <OnboardingScreen
        {...at('reminders', { reminderPreview: null })}
        onToggleReminders={onToggleReminders}
      />,
    )
    expect(screen.getByText(strings.onboarding.remindersWhy)).toBeInTheDocument()
    expect(screen.queryByTestId('notification-preview')).toBeNull()
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

  it('describes each size in one line, and continues', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(<OnboardingScreen {...at('start')} onNext={onNext} />)
    expect(screen.getByText(strings.onboarding.startingDetail)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.essentialsDetail)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.everythingDetail)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.continue }))
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

describe('OnboardingScreen, sourced step', () => {
  const sourced = onboardingFixture.sourced

  it('walks one real item through what you see, where it comes from and why', async () => {
    const onSkipIntro = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('sourced')} onSkipIntro={onSkipIntro} />,
    )
    expect(screen.getByRole('heading', { name: strings.onboarding.sourcedTitle })).toBeTruthy()
    expect(screen.getByText(strings.onboarding.sourcedSee)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.sourcedFrom)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.sourcedWhy)).toBeInTheDocument()
    expect(screen.getByText(sourced?.reminder ?? '')).toBeInTheDocument()
    expect(screen.getByText(sourced?.why ?? '')).toBeInTheDocument()
    expect(
      screen.getByText('Sunan Abi Dawud 5095 · Sahih — graded by al-Albani'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.onboarding.skipIntro }))
    expect(onSkipIntro).toHaveBeenCalledTimes(1)
  })

  it('leaves out a card the item has no words for', () => {
    const { strings } = renderScreen(
      <OnboardingScreen
        {...at('sourced', {
          sourced: sourced ? { ...sourced, reminder: null, why: null } : null,
        })}
      />,
    )
    expect(screen.queryByText(strings.onboarding.sourcedSee)).toBeNull()
    expect(screen.queryByText(strings.onboarding.sourcedWhy)).toBeNull()
    expect(screen.getByText(strings.onboarding.sourcedFrom)).toBeInTheDocument()
  })

  it('keeps the headline even without an example', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('sourced', { sourced: null })} />)
    expect(screen.getByText(strings.onboarding.sourcedTitle)).toBeInTheDocument()
    expect(screen.queryByText(strings.onboarding.sourcedFrom)).toBeNull()
  })
})

describe('OnboardingScreen, reminders step previews', () => {
  it('draws a reminder and a prayer notification, each with its buttons', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('reminders')} />)
    const preview = onboardingFixture.reminderPreview
    expect(screen.getByText(strings.onboarding.remindersTick)).toBeInTheDocument()
    const [item, prayer] = screen.getAllByTestId('notification-preview')
    if (!item || !prayer) throw new Error('expected two previews')
    expect(within(item).getByText(preview?.item.title ?? '')).toBeInTheDocument()
    expect(within(item).getByText(preview?.item.body ?? '')).toBeInTheDocument()
    expect(within(item).getByText(strings.notifications.action.done)).toBeInTheDocument()
    expect(within(item).getByText(strings.notifications.action.later)).toBeInTheDocument()
    expect(within(prayer).getByText(preview?.prayer.title ?? '')).toBeInTheDocument()
    expect(within(prayer).getByText(strings.notifications.action.prayed)).toBeInTheDocument()
    expect(within(prayer).getByText(strings.notifications.action.notYet)).toBeInTheDocument()
    // A picture of a notification: nothing on it is a button.
    expect(within(item).queryByRole('button')).toBeNull()
  })

  it('turns prayer reminders on and off on their own', async () => {
    const onTogglePrayers = mock((_on: boolean) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('reminders')} onTogglePrayers={onTogglePrayers} />,
    )
    const prayers = screen.getByRole('switch', { name: named(strings.onboarding.prayerReminders) })
    expect(prayers).not.toBeChecked()
    expect(screen.getByText(strings.onboarding.prayerRemindersDetail)).toBeInTheDocument()
    await user.click(prayers)
    expect(onTogglePrayers).toHaveBeenCalledWith(true)
  })

  it('counts prayer reminders alone as reminders to allow', () => {
    const { strings } = renderScreen(
      <OnboardingScreen
        {...at('reminders', {
          notifications: {
            ...onboardingFixture.notifications,
            windows: false,
            lookAhead: false,
            prayers: true,
          },
        })}
      />,
    )
    expect(
      screen.getByRole('switch', { name: named(strings.onboarding.dailyReminders) }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('switch', { name: named(strings.onboarding.prayerReminders) }),
    ).toBeChecked()
    expect(screen.getByText(strings.onboarding.reminderQuiet(22, 7))).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: strings.onboarding.allowNotifications }),
    ).toBeInTheDocument()
  })
})

describe('OnboardingScreen, accent step', () => {
  it('offers every accent, the chosen one marked, and reports a choice', async () => {
    const onSelectAccent = mock((_accent: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('accent', { accent: 'sage' })} onSelectAccent={onSelectAccent} />,
    )
    expect(screen.getByText(strings.onboarding.accentStep)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.accentWhy)).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(ACCENTS.length)
    expect(screen.getByRole('radio', { name: strings.appearance.accents.sage })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(screen.getByRole('radio', { name: strings.appearance.accents.plum }))
    expect(onSelectAccent).toHaveBeenCalledWith('plum')
  })

  it('recolours the flow with the accent the host provides', () => {
    const rgb = (hex: string): string =>
      `rgba(${[1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)).join(', ')}, 1.00)`
    const { strings } = renderScreen(<OnboardingScreen {...at('welcome')} />, { accent: 'plum' })
    expect(getComputedStyle(screen.getByText(strings.onboarding.free)).color).toBe(
      rgb(paletteFor('light', 'plum').accent),
    )
  })
})

describe('OnboardingScreen, widgets step', () => {
  it('draws a home widget, a lock screen widget and a notification from the plan', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('widgets')} />)
    const preview = onboardingFixture.widgetPreview
    expect(screen.getByText(strings.onboarding.widgetsStep)).toBeInTheDocument()
    const home = screen.getByTestId('home-widget-preview')
    expect(home).toHaveAttribute('aria-label', strings.onboarding.widgetHome)
    expect(within(home).getByText(preview?.home.caption ?? '')).toBeInTheDocument()
    expect(within(home).getByText(preview?.home.detail ?? '')).toBeInTheDocument()
    const lock = screen.getByTestId('lock-widget-preview')
    expect(lock).toHaveAttribute('aria-label', strings.onboarding.widgetLock)
    expect(within(lock).getByText('Maghrib')).toBeInTheDocument()
    expect(within(lock).getByText('In about 2 hours')).toBeInTheDocument()
    const notification = screen.getByTestId('notification-preview')
    expect(within(notification).getByText(strings.notifications.action.done)).toBeInTheDocument()
  })

  it('draws them as the gallery does: on a wallpaper, named, under the clock, with the real icon', () => {
    renderScreen(<OnboardingScreen {...at('widgets')} />)
    const home = screen.getByTestId('home-widget-preview')
    expect(within(home).getByTestId('widget-frame')).toBeInTheDocument()
    expect(within(home).getByText('Ihsaanly')).toBeInTheDocument()
    const lock = screen.getByTestId('lock-widget-preview')
    expect(within(lock).getByText('9:41')).toBeInTheDocument()
    expect(within(lock).getByTestId('lock-widget')).toBeInTheDocument()
    const notification = screen.getByTestId('notification-preview')
    expect(within(notification).getByTestId('app-icon')).toBeInTheDocument()
  })

  it('leaves out a home widget detail it does not have', () => {
    const preview = onboardingFixture.widgetPreview
    renderScreen(
      <OnboardingScreen
        {...at('widgets', {
          widgetPreview: preview ? { ...preview, home: { ...preview.home, detail: null } } : null,
        })}
      />,
    )
    expect(screen.queryByText(preview?.home.detail ?? '')).toBeNull()
  })

  it('"Show me how" and "Later"', async () => {
    const onShowWidgets = mock(() => {})
    const onNotNow = mock(() => {})
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen
        {...at('widgets')}
        onShowWidgets={onShowWidgets}
        onNotNow={onNotNow}
        onNext={onNext}
      />,
    )
    await user.click(screen.getByRole('button', { name: strings.onboarding.showMeHow }))
    await user.click(screen.getByRole('button', { name: strings.onboarding.later }))
    expect(onShowWidgets).toHaveBeenCalledTimes(1)
    expect(onNotNow).toHaveBeenCalledTimes(1)
    expect(onNext).not.toHaveBeenCalled()
  })

  it('shows only the headline without a preview', () => {
    const { strings } = renderScreen(
      <OnboardingScreen {...at('widgets', { widgetPreview: null })} />,
    )
    expect(screen.getByText(strings.onboarding.widgetsWhy)).toBeInTheDocument()
    expect(screen.queryByTestId('home-widget-preview')).toBeNull()
  })
})

describe('OnboardingScreen, summary step', () => {
  const row = (name: string): HTMLElement => screen.getByRole('button', { name: named(name) })

  it('lists every setting with where it stands, and starts', async () => {
    const onNext = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('summary', { place: toronto })} onNext={onNext} />,
    )
    const { summary, status } = strings.onboarding
    expect(screen.getByText(strings.onboarding.summaryTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.summaryWhy)).toBeInTheDocument()
    expect(row(summary.location)).toHaveAttribute('aria-label', `${summary.location}, Toronto`)
    expect(row(summary.reminders)).toHaveAttribute(
      'aria-label',
      `${summary.reminders}, ${status.on}`,
    )
    expect(row(summary.tracking)).toHaveAttribute('aria-label', `${summary.tracking}, ${status.on}`)
    expect(row(summary.start)).toHaveAttribute(
      'aria-label',
      `${summary.start}, ${strings.onboarding.essentials} · ${strings.onboarding.sunnahCount(14)}`,
    )
    expect(row(summary.accent)).toHaveAttribute(
      'aria-label',
      `${summary.accent}, ${strings.appearance.accents.terracotta}`,
    )
    expect(row(summary.widgets)).toHaveAttribute(
      'aria-label',
      `${summary.widgets}, ${status.addNow}`,
    )
    expect(row(summary.language)).toHaveAttribute(
      'aria-label',
      `${summary.language}, ${strings.language.names.en}`,
    )
    expect(screen.getAllByText('✓')).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: strings.onboarding.done }))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('says what was left for later', () => {
    const { strings } = renderScreen(
      <OnboardingScreen
        {...at('summary', {
          place: null,
          notifications: {
            ...onboardingFixture.notifications,
            windows: false,
            lookAhead: false,
            prayers: false,
          },
          trackingPaused: true,
          preset: null,
          enabledCount: 1,
          widgets: 'show',
        })}
      />,
    )
    const { summary, status } = strings.onboarding
    expect(row(summary.location)).toHaveAttribute(
      'aria-label',
      `${summary.location}, ${status.later}`,
    )
    expect(row(summary.reminders)).toHaveAttribute(
      'aria-label',
      `${summary.reminders}, ${status.later}`,
    )
    expect(row(summary.tracking)).toHaveAttribute(
      'aria-label',
      `${summary.tracking}, ${status.paused}`,
    )
    expect(row(summary.start)).toHaveAttribute(
      'aria-label',
      `${summary.start}, ${status.custom} · ${strings.onboarding.sunnahCount(1)}`,
    )
    expect(row(summary.widgets)).toHaveAttribute(
      'aria-label',
      `${summary.widgets}, ${status.afterStart}`,
    )
  })

  it('has no widget row where the host has no widgets', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('summary', { widgets: null })} />)
    expect(
      screen.queryByRole('button', { name: named(strings.onboarding.summary.widgets) }),
    ).toBeNull()
  })

  it('opens the setting behind a row', async () => {
    const onOpenSetting = mock((_row: string) => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('summary')} onOpenSetting={onOpenSetting} />,
    )
    const { summary } = strings.onboarding
    for (const name of [
      summary.location,
      summary.reminders,
      summary.tracking,
      summary.start,
      summary.accent,
      summary.widgets,
      summary.language,
    ]) {
      await user.click(row(name))
    }
    expect(onOpenSetting.mock.calls.map(([id]) => id)).toEqual([
      'location',
      'reminders',
      'tracking',
      'start',
      'accent',
      'widgets',
      'language',
    ])
  })

  it('is honest about money, and leads to About', async () => {
    const onOpenAbout = mock(() => {})
    const { user, strings } = renderScreen(
      <OnboardingScreen {...at('summary')} onOpenAbout={onOpenAbout} />,
    )
    expect(screen.getByText(strings.onboarding.freeTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.onboarding.freeBody)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: strings.onboarding.freeLink }))
    expect(onOpenAbout).toHaveBeenCalledTimes(1)
  })

  it('renders in a right-to-left language', () => {
    const { strings } = renderScreen(<OnboardingScreen {...at('summary', { language: 'ar' })} />, {
      locale: 'ar',
    })
    expect(screen.getByText(strings.onboarding.summaryTitle)).toBeInTheDocument()
  })
})
