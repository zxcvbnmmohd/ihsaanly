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

  it('stores a picked theme and recolours the popup with it', async () => {
    const { user } = await renderRoute('/appearance')
    const rose = await screen.findByRole('radio', { name: strings.appearance.themes.rose })
    await user.click(rose)
    expect(rose).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem(THEME_KEY)).toBe('rose')
    expect(document.documentElement.dataset.palette).toBe('rose')
    await user.click(screen.getByRole('radio', { name: strings.appearance.system }))
    expect(document.documentElement.dataset.palette).toBeUndefined()
  })
})
