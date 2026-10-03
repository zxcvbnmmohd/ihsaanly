import { expect, it, mock } from 'bun:test'
import {
  AsrOpinion,
  CalculationMethodName,
  type CalculationPreferences,
  HighLatitudeRuleName,
} from '@ihsaanly/core/prayer/calculation'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { CalculationScreen } from './calculation'
import { calculationFixture } from './fixtures'

it('shows every option under its heading with the current ones chosen', () => {
  const { strings } = renderScreen(<CalculationScreen {...calculationFixture} />)
  expect(screen.getAllByRole('radio')).toHaveLength(
    AsrOpinion.options.length +
      HighLatitudeRuleName.options.length +
      CalculationMethodName.options.length,
  )
  for (const heading of [
    strings.calculation.asr,
    strings.calculation.highLatitude,
    strings.calculation.method,
  ]) {
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  }
  expect(screen.getByText(strings.calculation.explanation)).toBeInTheDocument()
  expect(screen.getByText(strings.calculation.highLatitudeExplanation)).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: strings.asr.shafi })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

it('reports each kind of change on its own', async () => {
  const onChange = mock((_change: Partial<CalculationPreferences>) => {})
  const { user, strings } = renderScreen(
    <CalculationScreen {...calculationFixture} onChange={onChange} />,
  )
  await user.click(screen.getByRole('radio', { name: strings.asr.hanafi }))
  await user.click(screen.getByRole('radio', { name: strings.highLatitude.seventhofthenight }))
  await user.click(screen.getByRole('radio', { name: strings.method.Egyptian }))
  expect(onChange.mock.calls.map(([change]) => change)).toEqual([
    { asr: 'hanafi' },
    { highLatitudeRule: 'seventhofthenight' },
    { method: 'Egyptian' },
  ])
})
