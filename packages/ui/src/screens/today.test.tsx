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
  doneToday: [],
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
    expect(
      screen.getByRole('link', { name: strings.today.open('Evening adhkar') }),
    ).toBeInTheDocument()
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
    const entry = { id: 't', title: 'Tomorrow thing', detail: null, href: '/t', mark: null }
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

describe('TodayScreen sunnah rows', () => {
  it('marks from each circle and opens from each card', async () => {
    const onCircle = mock((_id: string) => {})
    const { user, navigations, strings } = renderScreen(
      <TodayScreen {...todayFixture} onCircle={onCircle} />,
    )
    await user.click(
      screen.getByRole('button', { name: strings.today.partsItem('Evening adhkar', 4, 11) }),
    )
    await user.click(
      screen.getByRole('button', {
        name: strings.today.countItem('Tasbih after prayer', 12, 33),
      }),
    )
    await user.click(
      screen.getByRole('button', { name: strings.today.markDone('Setting out on a journey') }),
    )
    expect(onCircle.mock.calls.map(([id]) => id)).toEqual([
      'evening-adhkar',
      'tasbih-after-prayer',
      'dua-travel',
    ])
    await user.click(screen.getByRole('link', { name: strings.today.open('Evening adhkar') }))
    expect(navigations).toEqual(['/item/evening-adhkar'])
  })

  it('folds what is done into Done today, where a circle unmarks', async () => {
    const onCircle = mock((_id: string) => {})
    const { user, strings } = renderScreen(<TodayScreen {...todayFixture} onCircle={onCircle} />, {
      layout: 'wide',
    })
    expect(screen.queryByText('Morning adhkar')).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.today.doneToday(1) }))
    await user.click(screen.getByRole('button', { name: strings.today.unmark('Morning adhkar') }))
    expect(onCircle).toHaveBeenCalledWith('morning-adhkar')
  })

  it('still says nothing else is asked once everything is done', () => {
    const { strings } = renderScreen(<TodayScreen {...quiet} doneToday={todayFixture.doneToday} />)
    expect(screen.getByText(strings.today.nothingElse)).toBeInTheDocument()
  })
})

describe('TodayScreen undo bar', () => {
  it('offers Undo after a mark', async () => {
    const onUndo = mock(() => {})
    const { user, strings } = renderScreen(
      <TodayScreen {...todayFixture} undo={{ id: '1', title: 'Duha', onUndo }} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(strings.today.markedDone)
    await user.click(screen.getByRole('button', { name: strings.today.undoItem('Duha') }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})

describe('TodayScreen panels', () => {
  it('opens the counter for a counted item', async () => {
    const props = {
      ...todayFixture,
      panel: { kind: 'count', itemId: 'tasbih', title: 'Tasbih', count: 3, target: 33 } as const,
      onCount: mock((_id: string) => {}),
      onMarkAll: mock((_id: string) => {}),
      onClosePanel: mock(() => {}),
    }
    const { user, strings } = renderScreen(<TodayScreen {...props} />)
    await user.click(screen.getByRole('button', { name: strings.today.countItem('Tasbih', 3, 33) }))
    expect(props.onCount).toHaveBeenCalledWith('tasbih')
    await user.click(screen.getByRole('button', { name: strings.panel.markAll }))
    expect(props.onMarkAll).toHaveBeenCalledWith('tasbih')
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(props.onClosePanel).toHaveBeenCalledTimes(1)
  })

  it('opens the checklist for an item in parts', async () => {
    const onTogglePart = mock((_item: string, _part: string) => {})
    const { user } = renderScreen(
      <TodayScreen
        {...todayFixture}
        panel={{
          kind: 'parts',
          itemId: 'evening-adhkar',
          title: 'Evening adhkar',
          parts: [{ id: 'kursi', title: 'Ayat al-Kursi', done: false }],
        }}
        onTogglePart={onTogglePart}
      />,
      { layout: 'wide' },
    )
    await user.click(screen.getByRole('checkbox', { name: 'Ayat al-Kursi' }))
    expect(onTogglePart).toHaveBeenCalledWith('evening-adhkar', 'kursi')
  })
})

describe('TodayScreen prayer hint', () => {
  it('captions the strip while the route asks for it', () => {
    const { strings, rerender } = renderScreen(<TodayScreen {...todayFixture} prayerHint />)
    expect(screen.getByText(strings.today.prayerHint)).toBeInTheDocument()
    rerender(<TodayScreen {...todayFixture} prayerHint={false} />)
    expect(screen.queryByText(strings.today.prayerHint)).toBeNull()
  })
})

describe('TodayScreen tour', () => {
  const tourAt = (step: 0 | 1 | 2): TodayScreenProps['tour'] => ({
    step,
    onNext: mock(() => {}),
    onSkip: mock(() => {}),
  })

  it('points first at the next prayer to mark, under the strip', async () => {
    const tour = tourAt(0)
    const { user, strings } = renderScreen(<TodayScreen {...todayFixture} tour={tour} />)
    const tip = screen.getByRole('dialog', { name: strings.tour.step(1, 3) })
    expect(tip).toHaveTextContent(strings.tour.prayer)
    // Asr, the third of five, is the first unmarked: its column's centre.
    expect(screen.getByTestId('coach-arrow').getAttribute('style')).toContain('left: 50%')
    await user.click(screen.getByRole('button', { name: strings.tour.next }))
    expect(tour?.onNext).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(tour?.onSkip).toHaveBeenCalledTimes(1)
  })

  it('points at the first prayer when all are marked', () => {
    renderScreen(
      <TodayScreen
        {...todayFixture}
        prayers={todayFixture.prayers.map((entry) => ({ ...entry, done: true }))}
        tour={tourAt(0)}
      />,
    )
    expect(screen.getByTestId('coach-arrow').getAttribute('style')).toContain('left: 10%')
  })

  it('then at the first sunnah circle, then at its card', () => {
    const { strings, rerender } = renderScreen(<TodayScreen {...todayFixture} tour={tourAt(1)} />, {
      layout: 'regular',
    })
    expect(screen.getByRole('dialog', { name: strings.tour.step(2, 3) })).toHaveTextContent(
      strings.tour.sunnah,
    )
    expect(screen.getByTestId('coach-arrow').getAttribute('style')).toContain('left: 30px')
    rerender(<TodayScreen {...todayFixture} tour={tourAt(2)} />)
    expect(screen.getByRole('dialog', { name: strings.tour.step(3, 3) })).toHaveTextContent(
      strings.tour.card,
    )
    expect(screen.getByRole('button', { name: strings.tour.done })).toBeInTheDocument()
    expect(screen.getByTestId('coach-arrow').getAttribute('style')).toContain('left: 50%')
  })

  it('finds the first row with a circle further down the day', () => {
    const { strings } = renderScreen(<TodayScreen {...todayFixture} now={[]} tour={tourAt(1)} />)
    expect(screen.getByRole('dialog')).toHaveTextContent(strings.tour.sunnah)
    expect(screen.getByTestId('coach-arrow')).toBeInTheDocument()
  })

  it.each<[string, 0 | 1, Partial<TodayScreenProps>]>([
    ['no prayers', 0, { prayers: [] }],
    ['no sunnah rows', 1, { now: [], next: null, allDay: [] }],
  ])('shows the tip at the top, without an arrow, with %s', (_label, step, change) => {
    renderScreen(<TodayScreen {...todayFixture} {...change} tour={tourAt(step)} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('coach-arrow')).toBeNull()
  })
})

describe('TodayScreen while paused', () => {
  it('shows the paused notice where the strip was', () => {
    const { strings } = renderScreen(<TodayScreen {...todayFixture} paused />)
    expect(screen.getByText(strings.today.paused)).toBeInTheDocument()
    expect(screen.getByText(strings.today.pausedFasting)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByText(strings.today.checkInTitle)).toBeNull()
  })

  it('asks whether to resume once the check-in is due', async () => {
    const onResume = mock(() => {})
    const onNotYet = mock(() => {})
    const { user, strings } = renderScreen(
      <TodayScreen {...todayFixture} paused checkIn={{ onResume, onNotYet }} />,
      { layout: 'wide' },
    )
    await user.click(screen.getByRole('button', { name: strings.today.resume }))
    await user.click(screen.getByRole('button', { name: strings.today.notYet }))
    expect(onResume).toHaveBeenCalledTimes(1)
    expect(onNotYet).toHaveBeenCalledTimes(1)
  })
})
