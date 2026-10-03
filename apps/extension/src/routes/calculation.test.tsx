import { beforeEach, describe, expect, it } from 'bun:test'
import { getCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/calculation', () => {
  it('saves a changed method', async () => {
    const { user } = await renderRoute('/calculation')
    expect(
      await screen.findByRole('heading', { name: strings.calculation.title }),
    ).toBeInTheDocument()
    const before = getCalculationPreferences()
    const radios = screen.getAllByRole('radio')
    const other = radios.find((radio) => radio.getAttribute('aria-checked') === 'false')
    if (!other) throw new Error('expected an unselected option')
    await user.click(other)
    expect(getCalculationPreferences()).not.toEqual(before)
  })
})
