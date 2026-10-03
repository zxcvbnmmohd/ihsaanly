import { expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { glossaryFixture } from './fixtures'
import { GlossaryScreen } from './glossary'

it('puts the term the reader came for first', () => {
  renderScreen(<GlossaryScreen {...glossaryFixture} highlighted="qada" />)
  const terms = screen.getAllByText(/^(Sunnah|Qada)$/).map((node) => node.textContent)
  expect(terms).toEqual(['Qada', 'Sunnah'])
  expect(screen.getByText('Making up an obligatory prayer after its time.')).toBeInTheDocument()
})

it('keeps the order with nothing highlighted', () => {
  renderScreen(<GlossaryScreen {...glossaryFixture} highlighted={null} />, { scheme: 'dark' })
  expect(screen.getAllByText(/^(Sunnah|Qada)$/).map((node) => node.textContent)).toEqual([
    'Sunnah',
    'Qada',
  ])
})
