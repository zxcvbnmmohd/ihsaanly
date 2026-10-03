import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { suggestionCardFixture } from './fixtures'
import { SuggestionCard } from './suggestion-card'

describe('SuggestionCard', () => {
  it('opens the item, adds it or dismisses it', async () => {
    const onAdd = mock(() => {})
    const onDismiss = mock(() => {})
    const { user, navigations, strings } = renderScreen(
      <SuggestionCard {...suggestionCardFixture} onAdd={onAdd} onDismiss={onDismiss} />,
    )
    expect(screen.getByText(suggestionCardFixture.entry.why as string)).toBeInTheDocument()
    await user.click(screen.getByRole('link'))
    expect(navigations).toEqual([suggestionCardFixture.entry.href])
    await user.click(screen.getByRole('button', { name: strings.plan.add }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: strings.plan.notNow }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('omits the reason when there is none', () => {
    renderScreen(
      <SuggestionCard
        {...suggestionCardFixture}
        entry={{ ...suggestionCardFixture.entry, why: null }}
      />,
    )
    expect(screen.getByText(suggestionCardFixture.entry.title)).toBeInTheDocument()
  })
})
