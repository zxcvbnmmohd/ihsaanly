import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { EventsScreen, MANUAL_EVENTS } from './events'
import { eventsFixture } from './fixtures'

describe('EventsScreen', () => {
  it('lists the manual moments with the raised ones on', async () => {
    const onToggleManual = mock((_event: string) => {})
    const { user, strings } = renderScreen(
      <EventsScreen {...eventsFixture} onToggleManual={onToggleManual} />,
    )
    for (const event of MANUAL_EVENTS) {
      expect(screen.getByRole('switch', { name: strings.event[event] })).toBeInTheDocument()
    }
    expect(screen.getByRole('switch', { name: strings.event.travel })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(screen.getByRole('switch', { name: strings.event.driving }))
    expect(onToggleManual).toHaveBeenCalledWith('driving')
  })

  it('toggles home detection and says home is needed when none is set', async () => {
    const onToggleDetectHome = mock(() => {})
    const { user, strings } = renderScreen(
      <EventsScreen
        {...eventsFixture}
        settings={{ ...eventsFixture.settings, detectHome: true }}
        onToggleDetectHome={onToggleDetectHome}
      />,
    )
    expect(screen.getByText(strings.events.homeNeeded)).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: strings.events.detectHome }))
    expect(onToggleDetectHome).toHaveBeenCalledTimes(1)
  })

  it('sets home from the current place and shows the saved one', async () => {
    const onSetHome = mock(() => {})
    const { user, strings } = renderScreen(
      <EventsScreen
        {...eventsFixture}
        settings={{
          detectHome: true,
          manual: [],
          home: { latitude: 1, longitude: 2, label: 'Mississauga' },
        }}
        onSetHome={onSetHome}
      />,
    )
    expect(screen.queryByText(strings.events.homeNeeded)).toBeNull()
    await user.click(screen.getByRole('button', { name: named(strings.events.setHome) }))
    expect(onSetHome).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Mississauga')).toBeInTheDocument()
  })

  it('shows home as unset when a place exists but no home does', () => {
    const { strings } = renderScreen(<EventsScreen {...eventsFixture} />)
    expect(screen.getByText(strings.events.homeUnset)).toBeInTheDocument()
  })

  it('links to the location screen when there is no place yet', async () => {
    const { user, navigations, strings } = renderScreen(
      <EventsScreen {...eventsFixture} canSetHome={false} />,
    )
    await user.click(screen.getByRole('link', { name: named(strings.events.setHome) }))
    expect(navigations).toEqual(['/location'])
    expect(screen.getByText(strings.events.noPlaceYet)).toBeInTheDocument()
  })
})
