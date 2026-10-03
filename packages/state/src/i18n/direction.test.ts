import { beforeEach, describe, expect, it } from 'bun:test'
import { reactNative } from '../../test/native'

const { applyDirection } = await import('./direction')

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('applyDirection', () => {
  beforeEach(() => {
    Object.assign(reactNative, { isRTL: false, os: 'ios', allowed: [], forced: [], reloads: [] })
  })

  it('does nothing when the direction already matches', async () => {
    expect(applyDirection('en-GB')).toBe(false)
    await wait(350)
    expect(reactNative.forced).toEqual([])
    expect(reactNative.reloads).toEqual([])
  })

  it('on iOS flips the flags and asks for a manual reopen instead of reloading', async () => {
    expect(applyDirection('ar')).toBe(true)
    expect(reactNative.allowed).toEqual([true])
    expect(reactNative.forced).toEqual([true])
    await wait(350)
    expect(reactNative.reloads).toEqual([])
  })

  it('on Android flips the flags and reloads after the writes settle', async () => {
    reactNative.os = 'android'

    expect(applyDirection('ar')).toBe(false)
    expect(reactNative.forced).toEqual([true])
    expect(reactNative.reloads).toEqual([])
    await wait(350)
    expect(reactNative.reloads).toEqual(['layout direction changed'])
  })

  it('flips back from right-to-left', () => {
    reactNative.isRTL = true
    expect(applyDirection('en-GB')).toBe(true)
    expect(reactNative.forced).toEqual([false])
  })
})
