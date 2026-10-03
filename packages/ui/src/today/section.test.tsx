import { expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { sectionFixture } from './fixtures'
import { Section } from './section'

it('titles what it introduces with a level 2 heading', () => {
  renderScreen(<Section {...sectionFixture} />)
  expect(screen.getByRole('heading', { level: 2, name: sectionFixture.title })).toBeInTheDocument()
  expect(screen.getByText('Example content')).toBeInTheDocument()
})
