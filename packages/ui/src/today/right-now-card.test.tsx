import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { rightNowCardFixture } from './fixtures'
import { RightNowCard } from './right-now-card'

describe('RightNowCard', () => {
  it('links to the entry and marks it from its circle', async () => {
    const onCircle = mock((_id: string) => {})
    const { user, navigations, strings } = renderScreen(
      <RightNowCard {...rightNowCardFixture} onCircle={onCircle} />,
    )
    const { entry } = rightNowCardFixture
    expect(screen.getByText(entry.title)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: strings.today.open(entry.title) }))
    expect(navigations).toEqual([entry.href])
    expect(screen.getByTestId('right-now')).toHaveAttribute('href', entry.href)
    await user.click(screen.getByTestId(`circle-${entry.id}`))
    expect(onCircle).toHaveBeenCalledWith(entry.id)
  })

  it('shows the detail when there is one', () => {
    renderScreen(
      <RightNowCard
        {...rightNowCardFixture}
        entry={{ ...rightNowCardFixture.entry, detail: 'Before sunrise' }}
      />,
    )
    expect(screen.getByText('Before sunrise')).toBeInTheDocument()
  })
})
