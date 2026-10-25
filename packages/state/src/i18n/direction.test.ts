import { beforeEach, describe, expect, it } from 'bun:test'
import { reactNative } from '../../test/native'

const { applyDirection } = await import('./direction')

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('applyDirection', () => {
  beforeEach(() => {
    Object.assign(reactNative, { isRTL: false, os: 'ios', allowed: [], forced: [], reloads: [] })
  })

  it('does nothing when the direction already matches', async () => {
    applyDirection('en-GB')
    await wait(350)
    expect(reactNative.forced).toEqual([])
    expect(reactNative.reloads).toEqual([])
  })

  for (const os of ['ios', 'android']) {
    it(`on ${os} flips the flags and reloads after the writes settle`, async () => {
      reactNative.os = os

      applyDirection('ar')
      expect(reactNative.allowed).toEqual([true])
      expect(reactNative.forced).toEqual([true])
      expect(reactNative.reloads).toEqual([])
      await wait(350)
      expect(reactNative.reloads).toEqual(['layout direction changed'])
    })
  }

  it('flips back from right-to-left, and reloads for that too', async () => {
    reactNative.isRTL = true
    applyDirection('en-GB')
    expect(reactNative.allowed).toEqual([false])
    expect(reactNative.forced).toEqual([false])
    await wait(350)
    expect(reactNative.reloads).toEqual(['layout direction changed'])
  })
})
