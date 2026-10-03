import { beforeEach, expect, it } from 'bun:test'
import { resolveText } from '@ihsaanly/core/content'
import { terms } from '@ihsaanly/core/content/glossary'
import { en } from '@ihsaanly/core/strings/en'
import { screen } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

beforeEach(async () => {
  await resetApp()
  await startUsing()
})

it('lists every term with its definition', async () => {
  await renderApp('/glossary')
  expect(
    await screen.findByRole('heading', { level: 1, name: en.glossary.title }),
  ).toBeInTheDocument()
  for (const entry of terms) {
    expect(screen.getAllByText(resolveText(entry.term) ?? entry.id).length).toBeGreaterThan(0)
  }
})

it('highlights the term named in the link', async () => {
  const app = await renderApp('/glossary?term=sunnah')
  await screen.findByRole('heading', { level: 1, name: en.glossary.title })
  expect(app.router.state.location.search).toEqual({ term: 'sunnah' })
})
