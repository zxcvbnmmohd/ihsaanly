import { beforeEach, describe, expect, it } from 'bun:test'
import { getQadaBacklog } from '@ihsaanly/state/prayer/backlog-store'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/qada', () => {
  it('saves what was owed before tracking, per prayer', async () => {
    const { user } = await renderRoute('/qada')
    await screen.findByText(strings.qada.intro)
    const [fajrMore] = screen.getAllByRole('button', { name: `${strings.qada.owed} +` })
    if (!fajrMore) throw new Error('no stepper')
    await user.click(fajrMore)
    await user.click(fajrMore)
    expect(getQadaBacklog()).toEqual({ fajr: 2 })
    expect(screen.getByText(strings.qada.outstanding(2))).toBeInTheDocument()
  })

  it('records made-up prayers in one go and clears the pending count', async () => {
    const { user } = await renderRoute('/qada')
    await screen.findByText(strings.qada.intro)
    const [owedMore] = screen.getAllByRole('button', { name: `${strings.qada.owed} +` })
    const [madeUpMore] = screen.getAllByRole('button', { name: `${strings.qada.madeUp} +` })
    if (!owedMore || !madeUpMore) throw new Error('no stepper')
    await user.click(owedMore)
    await user.click(owedMore)
    await user.click(madeUpMore)

    await user.click(screen.getByRole('button', { name: strings.qada.record(1) }))

    expect(screen.queryByRole('button', { name: strings.qada.record(1) })).toBeNull()
    expect(screen.getByText(strings.qada.outstanding(1))).toBeInTheDocument()
  })

  it('tracks fasts owed and lets one be made up', async () => {
    const { user } = await renderRoute('/qada')
    await screen.findByText(strings.fasting.intro)
    const record = screen.getByRole('button', { name: strings.fasting.recordMadeUp })
    expect(record).toBeDisabled()

    // The fasts card comes after the five prayers, and shares their stepper label.
    const more = screen.getAllByRole('button', { name: `${strings.fasting.owed} +` }).at(-1)
    if (!more) throw new Error('no stepper')
    await user.click(more)
    await user.click(more)
    expect(screen.getByText(strings.fasting.outstanding(2))).toBeInTheDocument()

    await user.click(record)
    expect(screen.getByText(strings.fasting.outstanding(1))).toBeInTheDocument()
  })
})
