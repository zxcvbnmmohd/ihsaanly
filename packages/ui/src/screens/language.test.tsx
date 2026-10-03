import { expect, it, mock } from 'bun:test'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { languageFixture } from './fixtures'
import { LanguageScreen } from './language'

it('lists every language, marks the current one and reports a pick', async () => {
  const onSelect = mock((_language: SupportedLanguage) => {})
  const { user, strings } = renderScreen(
    <LanguageScreen {...languageFixture} language="fr" onSelect={onSelect} />,
  )
  expect(screen.getAllByRole('radio')).toHaveLength(SUPPORTED_LANGUAGES.length)
  expect(screen.getByRole('radio', { name: strings.language.names.fr })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(screen.getByText(strings.language.restart)).toBeInTheDocument()
  expect(screen.getByText(strings.language.incomplete)).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: strings.language.names.ja }))
  expect(onSelect).toHaveBeenCalledWith('ja')
})
