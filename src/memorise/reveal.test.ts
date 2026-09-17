import { describe, expect, it } from 'bun:test'

import { FULLY_REVEALED, nextStage, stageLabel } from './reveal'

describe('the practice stages', () => {
  it('starts with every aid showing', () => {
    expect(stageLabel(FULLY_REVEALED)).toBe('both')
  })

  it('drops the transliteration first', () => {
    expect(stageLabel(nextStage(FULLY_REVEALED))).toBe('translation-only')
  })

  it('then drops the translation', () => {
    expect(stageLabel(nextStage(nextStage(FULLY_REVEALED)))).toBe('arabic-only')
  })

  it('cycles back to the start', () => {
    expect(nextStage(nextStage(nextStage(FULLY_REVEALED)))).toEqual(FULLY_REVEALED)
  })
})
