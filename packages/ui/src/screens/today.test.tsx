import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import {
  todayFixture,
  todayInRamadanFixture,
  todayOnJumuahFixture,
  todayWithoutLocationFixture,
} from './fixtures'
import { type NextPrayerEntry, TodayScreen, type TodayScreenProps } from './today'

const quiet: TodayScreenProps = {
  ...todayFixture,
  suggestion: null,
  now: [],
  next: null,
  allDay: [],
  tomorrow: [],
  later: [],
  qada: [],
  fastsOwed: 0,
  fastingToday: null,
}

describe.each(['compact', 'regular', 'wide'] as const)('TodayScreen at %s', (layout) => {
  it('shows the date line, the strip, right now and the rest of the day', () => {
    const { strings } = renderScreen(<TodayScreen {...todayFixture} />, { layout })
    expect(
      screen.getByText(
        `Wed 23 Sep · ${strings.hijri.format(6, strings.hijriMonth[4] ?? '', 1448)} · Toronto`,
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('heading', { name: strings.plan.rightNow })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Evening adhkar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.plan.alsoNow })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.plan.upNext })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.plan.alsoToday })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.plan.tryOneMore })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.plan.makeUp })).toBeInTheDocument()
    expect(screen.getByText(strings.hijri.approximate)).toBeInTheDocument()
    expect(screen.queryByText(strings.today.nothingElse)).toBeNull()
  })

  it('passes every action through', async () => {
    const props = {
      ...todayFixture,
      qada: [
        { prayer: 'fajr' as const, count: 2 },
        { prayer: 'asr' as const, count: 4 },
      ],
      onMarkPrayer: mock(() => {}),
      onMakeUp: mock(() => {}),
      onAddSuggestion: mock(() => {}),
      onDismissSuggestion: mock(() => {}),
    }
    const { user, strings } = renderScreen(<TodayScreen {...props} />, { layout })
    await user.click(screen.getByRole('checkbox', { name: strings.prayer.asr }))
    expect(props.onMarkPrayer).toHaveBeenCalledWith('asr')
    await user.click(screen.getByRole('button', { name: named(strings.prayer.asr) }))
    expect(props.onMakeUp).toHaveBeenCalledWith('asr')
    await user.click(screen.getByRole('button', { name: strings.plan.add }))
    expect(props.onAddSuggestion).toHaveBeenCalledWith('fast-monday')
    await user.click(screen.getByRole('button', { name: strings.plan.notNow }))
    expect(props.onDismissSuggestion).toHaveBeenCalledWith('fast-monday')
  })

  it('says so when nothing at all is asked of the user', () => {
    const { strings } = renderScreen(<TodayScreen {...quiet} />, { layout })
    expect(screen.getByText(strings.today.nothingElse)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: strings.plan.rightNow })).toBeNull()
  })

  it('names Jumu’ah on a Friday and notes not fasting in Ramadan', () => {
    const { strings } = renderScreen(<TodayScreen {...todayOnJumuahFixture} />, { layout })
    expect(screen.getByRole('checkbox', { name: strings.prayer.jumuah })).toBeInTheDocument()
  })

  it('lists what is recorded in Ramadan, and tomorrow and later', () => {
    const entry = { id: 't', title: 'Tomorrow thing', detail: null, href: '/t' }
    const { strings } = renderScreen(
      <TodayScreen
        {...todayInRamadanFixture}
        tomorrow={[entry]}
        later={[{ ...entry, id: 'l', title: 'Later thing' }]}
      />,
      { layout },
    )
    expect(
      screen.getByRole('button', { name: named(strings.fasting.recordedToday) }),
    ).toBeInTheDocument()
    expect(screen.getByText('Tomorrow thing')).toBeInTheDocument()
    expect(screen.getByText('Later thing')).toBeInTheDocument()
  })

  it('leaves out the date line without a Hijri date and the strip without prayers', () => {
    const { strings } = renderScreen(
      <TodayScreen
        {...todayFixture}
        hijri={null}
        prayers={[]}
        next={{ ...(todayFixture.next as NextPrayerEntry), before: [], after: [] }}
      />,
      { layout },
    )
    expect(screen.queryByText(/Toronto/)).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('heading', { name: strings.plan.upNext })).toBeNull()
  })
})

describe('TodayScreen without a location', () => {
  it('asks for the device location or a chosen city', async () => {
    const onUseMyLocation = mock(() => {})
    const { user, navigations, strings } = renderScreen(
      <TodayScreen {...todayWithoutLocationFixture} onUseMyLocation={onUseMyLocation} />,
    )
    expect(screen.getByText(strings.today.needsLocationTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.today.needsLocation)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.location.useDevice }))
    expect(onUseMyLocation).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('link', { name: named(strings.today.chooseCity) }))
    expect(navigations).toEqual([todayWithoutLocationFixture.locationHref])
  })

  it('disables the button while locating', async () => {
    const onUseMyLocation = mock(() => {})
    const { user, strings } = renderScreen(
      <TodayScreen {...todayWithoutLocationFixture} locating onUseMyLocation={onUseMyLocation} />,
    )
    await user.click(screen.getByRole('button', { name: strings.location.locating }))
    expect(onUseMyLocation).not.toHaveBeenCalled()
  })

  it.each([
    ['declined', 'declined'],
    ['unavailable', 'unavailable'],
  ] as const)('explains a %s location', (problem, key) => {
    const { strings } = renderScreen(
      <TodayScreen {...todayWithoutLocationFixture} locationProblem={problem} />,
    )
    expect(screen.getByText(strings.location[key])).toBeInTheDocument()
  })
})

describe('the Today fixtures', () => {
  it('can be pressed without a host: their handlers do nothing', async () => {
    const { user, strings } = renderScreen(<TodayScreen {...todayFixture} />)
    await user.click(screen.getByRole('checkbox', { name: strings.prayer.asr }))
    expect(screen.getByRole('checkbox', { name: strings.prayer.asr })).toBeInTheDocument()
  })
})
