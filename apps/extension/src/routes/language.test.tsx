import { beforeEach, describe, expect, it } from 'bun:test'
import { getLocale } from '@ihsaanly/state/i18n/store'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/language', () => {
  it('switches the language and the page direction', async () => {
    const { user } = await renderRoute('/language')
    expect(await screen.findByRole('radio', { name: strings.language.names.en })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('radio', { name: strings.language.names.ar }))

    expect(getLocale()).toStartWith('ar')
    expect(document.documentElement.dir).toBe('rtl')
    expect(screen.getByRole('radio', { name: strings.language.names.ar })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
