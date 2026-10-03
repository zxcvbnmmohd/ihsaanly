import { expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { router } from '../../../../test/router'
import OnboardingAlias from '../../../app/(home)/onboarding/[step]'

it('lands a link to an onboarding step on Today (or the onboarding gate)', () => {
  router.params = { step: 'location' }
  render(<OnboardingAlias />)
  expect(router.redirects).toEqual(['/'])
})
