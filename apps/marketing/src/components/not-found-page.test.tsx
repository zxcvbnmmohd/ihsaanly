import { expect, test } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { NotFoundPage } = await import('./not-found-page')

test('says the page was not found, in the page language', () => {
  const { strings } = renderSite(<NotFoundPage />, { routeId: '/404' })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    strings['notFound.title'] ?? '',
  )
  expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
  expect(strings['notFound.text']).toContain('Go to the home page')
})
