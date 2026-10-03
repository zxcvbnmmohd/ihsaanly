import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { CalculationPreferences } from '@ihsaanly/core/prayer/calculation'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  preferences: CalculationPreferences
  onChange: (change: Partial<CalculationPreferences>) => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/calculation', 'CalculationScreen')

const { default: CalculationRoute } = await import('../../app/(more)/calculation')
const { getCalculationPreferences } = await import('@ihsaanly/state/prayer/store')

describe('calculation route', () => {
  beforeEach(() => {
    renders.length = 0
  })

  it('merges a change into the stored preferences', () => {
    render(<CalculationRoute />)
    const before = last(renders).preferences
    const asr = before.asr === 'hanafi' ? 'shafi' : 'hanafi'
    act(() => last(renders).onChange({ asr }))
    expect(getCalculationPreferences()).toEqual({ ...before, asr })
    expect(last(renders).preferences.asr).toBe(asr)
  })
})
