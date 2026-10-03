import { describe, expect, it } from 'bun:test'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Screen } from './screen'

describe('Screen', () => {
  it('scrolls its children', () => {
    renderScreen(
      <Screen>
        <span>Inside</span>
      </Screen>,
    )
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })

  it('wraps in the brand wash when given a palette, with a custom class and width', () => {
    renderScreen(
      <Screen palette={palettes.dark} className="gap-2" maxWidth={400}>
        <span>Washed</span>
      </Screen>,
      { scheme: 'dark' },
    )
    expect(screen.getByText('Washed')).toBeInTheDocument()
  })
})
