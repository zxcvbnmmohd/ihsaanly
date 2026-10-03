import { describe, expect, it, mock } from 'bun:test'
import type { Place } from '@ihsaanly/core/location/place'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { locationDeclinedFixture, locationFixture } from './fixtures'
import { LocationScreen } from './location'

describe('LocationScreen', () => {
  it('searches and selects a result', async () => {
    const onQueryChange = mock((_query: string) => {})
    const onSelect = mock((_place: Place) => {})
    const { user, strings } = renderScreen(
      <LocationScreen {...locationFixture} onQueryChange={onQueryChange} onSelect={onSelect} />,
    )
    expect(screen.getByText(strings.location.explanation)).toBeInTheDocument()
    expect(screen.getByText(strings.location.attribution)).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText(strings.location.search), 'o')
    expect(onQueryChange).toHaveBeenCalledWith('torono')
    await user.click(screen.getByRole('button', { name: 'Toronto, Ontario, Canada' }))
    expect(onSelect).toHaveBeenCalledWith(locationFixture.results[0])
  })

  it('uses the device, labelled with the last found place', async () => {
    const onUseDevice = mock(() => {})
    const { user, strings } = renderScreen(
      <LocationScreen {...locationFixture} deviceLabel="Near Toronto" onUseDevice={onUseDevice} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.location.useDevice) }))
    expect(onUseDevice).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Near Toronto')).toBeInTheDocument()
  })

  it('cannot be pressed again while locating', async () => {
    const onUseDevice = mock(() => {})
    const { user, strings } = renderScreen(
      <LocationScreen
        {...locationFixture}
        locating
        deviceLabel="Near Toronto"
        onUseDevice={onUseDevice}
      />,
    )
    expect(screen.queryByText('Near Toronto')).toBeNull()
    expect(screen.getByText(strings.location.locating)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: named(strings.location.locating) })).toBeNull()
    expect(onUseDevice).not.toHaveBeenCalled()
    await user.click(screen.getByText(strings.location.locating))
    expect(onUseDevice).not.toHaveBeenCalled()
  })

  it('points a declined permission at system settings', async () => {
    const onOpenSettings = mock(() => {})
    const { user, strings } = renderScreen(
      <LocationScreen {...locationDeclinedFixture} onOpenSettings={onOpenSettings} />,
    )
    expect(screen.getByText(strings.location.declined)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.notifications.openSettings }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('explains an unavailable device without a settings link', () => {
    const { strings } = renderScreen(<LocationScreen {...locationFixture} problem="unavailable" />)
    expect(screen.getByText(strings.location.unavailable)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.notifications.openSettings })).toBeNull()
  })

  it('shows the chosen place and says when nothing was found', () => {
    const place = locationFixture.results[0] as Place
    const { strings } = renderScreen(
      <LocationScreen {...locationFixture} place={place} results={[]} showNoResults />,
    )
    expect(screen.getByText(place.label)).toBeInTheDocument()
    expect(screen.getByText(strings.location.noResults)).toBeInTheDocument()
  })
})
