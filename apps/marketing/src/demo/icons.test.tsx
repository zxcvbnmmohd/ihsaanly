import { expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { IconBattery, IconSignal, IconWifi } from './icons'

test.each([
  ['wifi', IconWifi],
  ['signal', IconSignal],
  ['battery', IconBattery],
])('the %s status-bar icon is a decorative svg', (_name, Icon) => {
  const { container } = render(<Icon />)
  const svg = container.querySelector('svg')
  expect(svg).toHaveAttribute('aria-hidden', 'true')
  expect(svg?.children.length).toBeGreaterThan(0)
})
