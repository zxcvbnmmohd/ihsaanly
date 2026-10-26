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
  // The themes, then the two alignments.
  expect(screen.getAllByRole('radio')).toHaveLength(THEME_PREFERENCES.length + 2)
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

it('offers Arabic first and the alignment, and reports each change', async () => {
  const onReading = mock((_change: object) => {})
  const { user, strings } = renderScreen(
    <AppearanceScreen
      {...appearanceFixture}
      reading={{ arabicFirst: true, align: 'center' }}
      onReading={onReading}
    />,
  )
  expect(screen.getByRole('heading', { name: strings.appearance.reading })).toBeInTheDocument()
  expect(screen.getByText(strings.appearance.alignment)).toBeInTheDocument()
  expect(screen.getByText(strings.appearance.readingNote)).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: strings.appearance.alignCenter })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await user.click(screen.getByRole('switch', { name: strings.appearance.arabicFirst }))
  await user.click(screen.getByRole('radio', { name: strings.appearance.alignStart }))
  await user.click(screen.getByRole('radio', { name: strings.appearance.alignCenter }))
  expect(onReading.mock.calls).toEqual([
    [{ arabicFirst: false }],
    [{ align: 'start' }],
    [{ align: 'center' }],
  ])
})
