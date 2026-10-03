import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { OnboardingArt } from './onboarding-art'

describe('OnboardingArt', () => {
  it('draws a grid of nine stars for the welcome', () => {
    const { container } = renderScreen(
      <OnboardingArt variant="welcome" color="#a00" onColor="#fff" />,
    )
    expect(container.querySelectorAll('[aria-hidden="true"], img').length).toBeGreaterThan(0)
    expect(screen.queryByText('✓')).toBeNull()
  })

  it('draws a ringed tick for how it works, hidden from screen readers', () => {
    renderScreen(<OnboardingArt variant="how" color="#a00" onColor="#fff" />)
    expect(screen.getByText('✓', { ignore: '' })).toHaveAttribute('aria-hidden', 'true')
  })
})
