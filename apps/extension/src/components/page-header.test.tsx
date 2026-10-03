import { beforeEach, describe, expect, it } from 'bun:test'
import { screen, waitFor } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('PageHeader', () => {
  it('has a back button that goes back, the title, and the Beta pill of a beta build', async () => {
    const { user, router } = await renderRoute(['/', '/appearance'])
    expect(
      await screen.findByRole('heading', { level: 1, name: strings.appearance.title }),
    ).toBeInTheDocument()
    // test/setup.ts runs the suite as a beta (development) build.
    expect(screen.getByRole('note', { name: 'Beta build' })).toHaveTextContent('Beta')

    await user.click(screen.getByRole('button', { name: strings.onboarding.back }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('has no back button on a tab (Today), where there is nothing to go back to', async () => {
    await renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: strings.today.title })
    expect(screen.queryByRole('button', { name: strings.onboarding.back })).toBeNull()
  })
})
