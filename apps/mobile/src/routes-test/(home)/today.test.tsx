import { afterEach, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { resetRouter, router } from '../../../test/router'
import TodayAlias from '../../app/(home)/today'

afterEach(resetRouter)

it('sends /today to the Today tab', () => {
  render(<TodayAlias />)
  expect(router.redirects).toEqual(['/'])
})

it('keeps ?tour=1 from Show me around', () => {
  router.params = { tour: '1' }
  render(<TodayAlias />)
  expect(router.redirects).toEqual([{ pathname: '/', params: { tour: '1' } }])
})
