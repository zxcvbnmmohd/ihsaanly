import { expect, it } from 'bun:test'

import { capabilities as native } from './capabilities'
import { capabilities as web } from './capabilities.web'

it('native can do everything the plan asks of the platform', () => {
  expect(native).toEqual({
    reminders: true,
    homeDetection: true,
    shareImage: true,
    systemSettings: true,
  })
})

it('the web can do none of it yet', () => {
  expect(web).toEqual({
    reminders: false,
    homeDetection: false,
    shareImage: false,
    systemSettings: false,
  })
})
