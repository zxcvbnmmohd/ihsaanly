import { describe, expect, it } from 'bun:test'

import { CRASH_MESSAGE_LIMIT, redactMessage } from './redact'

describe('redactMessage', () => {
  it('keeps an ordinary message as it is', () => {
    expect(redactMessage('database is locked (code 5)')).toBe('database is locked (code 5)')
  })

  it('masks email addresses', () => {
    expect(redactMessage('no account for ali.k+1@example.co.uk here')).toBe(
      'no account for <email> here',
    )
  })

  it('drops a URL query and fragment but keeps the path', () => {
    expect(redactMessage('GET https://api.example.com/v1/x?token=abc&lat=1#frag failed')).toBe(
      'GET https://api.example.com/v1/x?<redacted> failed',
    )
  })

  it('masks coordinates and long digit runs, not short numbers', () => {
    expect(redactMessage('at 51.5074, -0.1278 for 07700900123 after 3 tries')).toBe(
      'at <number> for <number> after 3 tries',
    )
  })

  it('clips a long message', () => {
    const clipped = redactMessage('x'.repeat(500))
    expect(clipped).toBe(`${'x'.repeat(CRASH_MESSAGE_LIMIT)}…`)
  })
})
