import { expect, test } from 'bun:test'
import { cx } from './class-names'

test('joins the parts and drops the falsy ones', () => {
  expect(cx('demo-tab', false, null, undefined, '', 'is-active')).toBe('demo-tab is-active')
  expect(cx()).toBe('')
})
