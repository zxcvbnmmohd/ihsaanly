import { describe, expect, it } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { OnboardingArt } from './onboarding-art'

describe('OnboardingArt', () => {
  it('draws a grid of nine stars for the welcome', () => {
    const { container } = renderScreen(
      <OnboardingArt variant="welcome" color="#a00" onColor="#fff" />,
    )
    expect(container.querySelectorAll('[aria-hidden="true"], img').length).toBeGreaterThan(0)
    expect(screen.queryByText('✓')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('draws a ticked circle for how it works, its tick hidden from screen readers', () => {
    renderScreen(<OnboardingArt variant="how" color="#a00" onColor="#fff" checkLabel="Example" />)
    expect(screen.getByText('✓', { ignore: '' })).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('checkbox', { name: 'Example' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('clears and ticks the circle again when tapped', async () => {
    const { user } = renderScreen(
      <OnboardingArt variant="how" color="#a00" onColor="#fff" checkLabel="Example" />,
    )
    const circle = screen.getByRole('checkbox', { name: 'Example' })

    await user.click(circle)
    expect(circle).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText('✓', { ignore: '' })).toBeNull()

    await user.click(circle)
    expect(circle).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('✓', { ignore: '' })).toBeInTheDocument()
  })

  it('toggles on Space, as a checkbox does', () => {
    renderScreen(<OnboardingArt variant="how" color="#a00" onColor="#fff" checkLabel="Example" />)
    const circle = screen.getByRole('checkbox', { name: 'Example' })
    fireEvent.keyDown(circle, { key: ' ' })
    expect(circle).toHaveAttribute('aria-checked', 'false')
  })
})
