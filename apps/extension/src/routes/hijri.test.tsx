import { beforeEach, describe, expect, it } from 'bun:test'
import { MOON_SIGHTING_AUTHORITIES } from '@ihsaanly/core/content/moon-sighting'
import { getHijriOffset } from '@ihsaanly/state/hijri/store'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/hijri', () => {
  it('lists the moon-sighting authorities and saves a chosen offset', async () => {
    const { user } = await renderRoute('/hijri')
    expect(await screen.findByRole('heading', { name: strings.hijri.title })).toBeInTheDocument()
    for (const authority of MOON_SIGHTING_AUTHORITIES) {
      expect(screen.getByText(authority.region)).toBeInTheDocument()
    }

    expect(getHijriOffset()).toBe(0)
    await user.click(screen.getByRole('radio', { name: strings.hijri.offsetLabel(1) }))
    expect(getHijriOffset()).toBe(1)
    expect(screen.getByRole('radio', { name: strings.hijri.offsetLabel(1) })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
