import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Pill } from './pill'

describe('Pill', () => {
  it('shows a plain label', () => {
    renderScreen(<Pill label="Known" accent="#111" onAccent="#fff" />)
    expect(screen.getByText('Known')).toBeInTheDocument()
  })

  it('shows an emphasised label', () => {
    renderScreen(<Pill label="Fard" emphasis accent="#111" onAccent="#fff" />)
    expect(screen.getByText('Fard')).toBeInTheDocument()
  })
})
