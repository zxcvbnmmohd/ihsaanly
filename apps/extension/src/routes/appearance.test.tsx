import { beforeEach, describe, expect, it } from 'bun:test'
import { THEME_KEY } from '@ihsaanly/web/theme'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/appearance', () => {
  it('shows the stored preference and changes it', async () => {
    const { user } = await renderRoute('/appearance')
    expect(await screen.findByRole('radio', { name: strings.appearance.system })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('radio', { name: strings.appearance.dark }))

    expect(screen.getByRole('radio', { name: strings.appearance.dark })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
