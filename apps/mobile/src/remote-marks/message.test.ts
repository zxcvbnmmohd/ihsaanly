import { describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'

import type { RemoteMark } from './ledger'
import { remoteMarksMessage } from './message'

const base: RemoteMark = { source: 'widget', kind: 'done', id: 'duha', at: 1, timeZone: 'UTC' }

describe('remoteMarksMessage', () => {
  it('says nothing when there is nothing', () => {
    expect(remoteMarksMessage([], en)).toBeNull()
  })

  it('names the one mark and where it came from', () => {
    expect(remoteMarksMessage([base], en)).toBe('Marked done from your widget')
    expect(remoteMarksMessage([{ ...base, source: 'notification' }], en)).toBe(
      'Marked done from a notification',
    )
    const asr: RemoteMark = { ...base, kind: 'prayer', id: 'asr' }
    expect(remoteMarksMessage([asr], en)).toBe('Asr marked from your widget')
    expect(remoteMarksMessage([{ ...asr, source: 'notification' }], en)).toBe(
      'Asr marked from a notification',
    )
    expect(remoteMarksMessage([{ ...asr, id: 'witr' }], en)).toBe('witr marked from your widget')
    expect(remoteMarksMessage([{ ...base, kind: 'count', counted: 3 }], en)).toBe(
      'Counted 3 from your widget',
    )
    expect(remoteMarksMessage([{ ...base, kind: 'count' }], en)).toBe('Counted 1 from your widget')
  })

  it('counts several, by where they came from', () => {
    expect(remoteMarksMessage([base, base, base], en)).toBe('3 marked from your widgets')
    const shade: RemoteMark = { ...base, source: 'notification' }
    expect(remoteMarksMessage([shade, shade], en)).toBe('2 marked from notifications')
    expect(remoteMarksMessage([base, shade], en)).toBe('2 marked from widgets and notifications')
  })
})
