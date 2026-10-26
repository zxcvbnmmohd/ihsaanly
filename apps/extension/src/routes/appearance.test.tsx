import { beforeEach, describe, expect, it } from 'bun:test'
import { getAccent } from '@ihsaanly/state/theme/accent-store'
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

  it('stores a picked accent and recolours the popup with it', async () => {
    const { user } = await renderRoute('/appearance')
    const rose = await screen.findByRole('radio', { name: strings.appearance.accents.rose })
    await user.click(rose)
    expect(rose).toHaveAttribute('aria-checked', 'true')
    expect(getAccent()).toBe('rose')
    expect(document.documentElement.style.getPropertyValue('--color-accent')).not.toBe('')
    await user.click(screen.getByRole('radio', { name: strings.appearance.accents.terracotta }))
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('')
  })
})
