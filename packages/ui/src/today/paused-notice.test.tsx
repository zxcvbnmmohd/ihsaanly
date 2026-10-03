import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { CheckInCard, PausedNotice } from './paused-notice'

describe('PausedNotice', () => {
  it('says tracking is paused and fasting resumes after', () => {
    const { strings } = renderScreen(<PausedNotice />)
    expect(screen.getByText(strings.today.paused)).toBeInTheDocument()
    expect(screen.getByText(strings.today.pausedFasting)).toBeInTheDocument()
  })
})

describe('CheckInCard', () => {
  it('asks to resume, with Resume and Not yet', async () => {
    const onResume = mock(() => {})
    const onNotYet = mock(() => {})
    const { user, strings } = renderScreen(<CheckInCard checkIn={{ onResume, onNotYet }} />)
    expect(screen.getByText(strings.today.checkInTitle)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.today.resume }))
    await user.click(screen.getByRole('button', { name: strings.today.notYet }))
    expect(onResume).toHaveBeenCalledTimes(1)
    expect(onNotYet).toHaveBeenCalledTimes(1)
  })
})
