import { expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { EmptyState } from './empty-state'

it('shows its message', () => {
  renderScreen(<EmptyState message="Nothing here yet" />)
  expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
})
