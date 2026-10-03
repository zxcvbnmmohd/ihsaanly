import { describe, expect, test } from 'bun:test'
import {
  FeedbackRateLimitedError,
  LinkConflictError,
  LinkRequiredError,
  otherProvider,
  ReauthUnavailableError,
} from './ports'

describe('otherProvider', () => {
  test('is the other of Apple and Google', () => {
    expect(otherProvider('apple')).toBe('google')
    expect(otherProvider('google')).toBe('apple')
  })
})

describe('errors', () => {
  test('LinkRequiredError carries what the UI needs to ask for the other sign-in', () => {
    const error = new LinkRequiredError('apple', 'google', null)
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({
      name: 'LinkRequiredError',
      code: 'link-required',
      existing: 'apple',
      attempted: 'google',
      email: null,
    })
    expect(error.message).toContain('apple')
  })

  test('LinkConflictError names the provider', () => {
    const error = new LinkConflictError('google')
    expect(error).toMatchObject({
      name: 'LinkConflictError',
      code: 'link-conflict',
      provider: 'google',
    })
    expect(error.message).toContain('google')
  })

  test('ReauthUnavailableError lists the linked providers', () => {
    const error = new ReauthUnavailableError(['apple'])
    expect(error).toMatchObject({
      name: 'ReauthUnavailableError',
      code: 'reauth-unavailable',
      linked: ['apple'],
    })
  })

  test('FeedbackRateLimitedError has a code the state layer maps', () => {
    const error = new FeedbackRateLimitedError()
    expect(error).toBeInstanceOf(Error)
    expect(error).toMatchObject({ name: 'FeedbackRateLimitedError', code: 'rate-limited' })
  })
})
