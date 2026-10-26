import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { router as expoRouter } from 'expo-router'
import { resetRouter, router } from '../../test/router'
import { openAfterOnboarding, openPendingDestination } from './destination'

describe('the destination after onboarding', () => {
  beforeEach(() => {
    resetRouter()
    openPendingDestination()
    resetRouter()
  })

  it('opens nothing when nothing was asked for', () => {
    openPendingDestination()
    expect(router.calls).toEqual([])
  })

  it('opens what was asked for, once', () => {
    openAfterOnboarding('/widgets')
    openPendingDestination()
    openPendingDestination()
    expect(router.calls).toEqual([['push', '/widgets']])
  })

  it('stays on Today when the navigator refuses', () => {
    const push = spyOn(expoRouter, 'push').mockImplementation(() => {
      throw new Error('not ready')
    })
    try {
      openAfterOnboarding('/about')
      expect(() => openPendingDestination()).not.toThrow()
      openPendingDestination()
      expect(push).toHaveBeenCalledTimes(1)
    } finally {
      push.mockRestore()
    }
  })
})
