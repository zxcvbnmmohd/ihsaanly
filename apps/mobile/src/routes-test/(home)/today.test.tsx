import { expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { router } from '../../../test/router'
import TodayAlias from '../../app/(home)/today'

it('sends /today to the Today tab', () => {
  render(<TodayAlias />)
  expect(router.redirects).toEqual(['/'])
})
