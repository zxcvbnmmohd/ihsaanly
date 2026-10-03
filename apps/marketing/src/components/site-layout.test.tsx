import { expect, test } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { SiteLayout } = await import('./site-layout')

test('wraps the page in a skip link, header, main and footer', () => {
  const { strings } = renderSite(
    <SiteLayout>
      <p>Page body</p>
    </SiteLayout>,
  )
  expect(screen.getByRole('link', { name: strings['common.skip'] })).toHaveAttribute(
    'href',
    '#main',
  )
  expect(screen.getByRole('banner')).toBeInTheDocument()
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  expect(screen.getByRole('main')).toHaveTextContent('Page body')
  expect(screen.getByRole('contentinfo')).toBeInTheDocument()
})
