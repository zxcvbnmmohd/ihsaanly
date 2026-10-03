import { expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { THEME_PREFERENCES, type ThemePreference } from '../types'
import { AppearanceScreen } from './appearance'
import { appearanceFixture } from './fixtures'

it('offers each theme, marks the current one and reports a pick', async () => {
  const onSelect = mock((_preference: ThemePreference) => {})
  const { user, strings } = renderScreen(
    <AppearanceScreen {...appearanceFixture} preference="dark" onSelect={onSelect} />,
  )
  expect(screen.getAllByRole('radio')).toHaveLength(THEME_PREFERENCES.length)
  expect(screen.getByRole('radio', { name: strings.appearance.dark })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(screen.getByRole('radio', { name: strings.appearance.light })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  expect(screen.getByText(strings.appearance.note)).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: strings.appearance.light }))
  expect(onSelect).toHaveBeenCalledWith('light')
})
