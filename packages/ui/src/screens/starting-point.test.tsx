import { expect, it, mock } from 'bun:test'
import { STARTER_PRESETS, type StarterPreset } from '@ihsaanly/core/plan/presets'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { startingPointFixture } from './fixtures'
import { StartingPointScreen } from './starting-point'

it('offers each preset with its line, marks the current one and reports a pick', async () => {
  const onSelect = mock((_preset: StarterPreset) => {})
  const { user, strings } = renderScreen(
    <StartingPointScreen {...startingPointFixture} current="essentials" onSelect={onSelect} />,
  )
  expect(screen.getAllByRole('radio')).toHaveLength(STARTER_PRESETS.length)
  expect(screen.getByText(strings.startingPoint.startingDetail)).toBeInTheDocument()
  expect(screen.getByText(strings.startingPoint.essentialsDetail)).toBeInTheDocument()
  expect(screen.getByText(strings.startingPoint.everythingDetail)).toBeInTheDocument()
  expect(
    screen.getByRole('radio', { name: new RegExp(strings.onboarding.essentials) }),
  ).toHaveAttribute('aria-checked', 'true')
  expect(
    screen.getByRole('radio', { name: new RegExp(strings.onboarding.everything) }),
  ).toHaveAttribute('aria-checked', 'false')
  expect(screen.queryByText(strings.startingPoint.customNote)).toBeNull()

  await user.click(screen.getByRole('radio', { name: new RegExp(strings.onboarding.everything) }))
  expect(onSelect).toHaveBeenCalledWith('everything')
})

it('marks none and says why once the items have been chosen by hand', () => {
  const { strings } = renderScreen(<StartingPointScreen {...startingPointFixture} current={null} />)
  for (const radio of screen.getAllByRole('radio')) {
    expect(radio).toHaveAttribute('aria-checked', 'false')
  }
  expect(screen.getByText(strings.startingPoint.customNote)).toBeInTheDocument()
})
