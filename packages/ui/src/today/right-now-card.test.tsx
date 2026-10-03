import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { rightNowCardFixture } from './fixtures'
import { RightNowCard } from './right-now-card'

describe('RightNowCard', () => {
  it('links to the entry', async () => {
    const { user, navigations } = renderScreen(<RightNowCard {...rightNowCardFixture} />)
    expect(screen.getByText(rightNowCardFixture.entry.title)).toBeInTheDocument()
    await user.click(screen.getByRole('link'))
    expect(navigations).toEqual([rightNowCardFixture.entry.href])
  })

  it('shows the detail when there is one', () => {
    renderScreen(
      <RightNowCard entry={{ ...rightNowCardFixture.entry, detail: 'Before sunrise' }} />,
    )
    expect(screen.getByText('Before sunrise')).toBeInTheDocument()
  })
})
