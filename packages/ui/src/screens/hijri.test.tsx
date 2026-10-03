import { describe, expect, it, mock } from 'bun:test'
import { offsetOptions } from '@ihsaanly/core/hijri/calendar'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { hijriFixture } from './fixtures'
import { HijriScreen } from './hijri'

describe('HijriScreen', () => {
  it('previews the date, lists offsets and sighting authorities', async () => {
    const onChange = mock((_offset: number) => {})
    const { user, strings } = renderScreen(<HijriScreen {...hijriFixture} onChange={onChange} />)
    expect(
      screen.getByText(strings.hijri.format(6, strings.hijriMonth[4] ?? '', 1448)),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(offsetOptions().length)
    expect(screen.getByRole('radio', { name: strings.hijri.offsetLabel(0) })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText('Europe')).toBeInTheDocument()
    expect(screen.getByText('European Council for Fatwa and Research')).toBeInTheDocument()
    expect(screen.getByText(strings.moonSighting.disclaimer)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: strings.hijri.offsetLabel(1) }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('leaves out the preview when there is none', () => {
    const { strings } = renderScreen(
      <HijriScreen {...hijriFixture} preview={null} authorities={[]} />,
    )
    expect(
      screen.queryByText(strings.hijri.format(6, strings.hijriMonth[4] ?? '', 1448)),
    ).toBeNull()
  })
})
