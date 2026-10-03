import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { upNextCardFixture } from './fixtures'
import { UpNextCard } from './up-next-card'

describe('UpNextCard', () => {
  it('names the prayer, its distance and what comes after', async () => {
    const { user, navigations, strings } = renderScreen(<UpNextCard {...upNextCardFixture} />)
    expect(
      screen.getByText(upNextCardFixture.names[upNextCardFixture.next.prayer]),
    ).toBeInTheDocument()
    expect(screen.getByText(upNextCardFixture.next.distance)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.plan.after })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: strings.plan.before })).toBeNull()
    const [after] = upNextCardFixture.next.after
    if (!after) throw new Error('fixture has no after entry')
    await user.click(screen.getByRole('link', { name: after.title }))
    expect(navigations).toEqual([after.href])
  })

  it('lists what to do before as well', () => {
    const [after] = upNextCardFixture.next.after
    if (!after) throw new Error('fixture has no after entry')
    const { strings } = renderScreen(
      <UpNextCard
        {...upNextCardFixture}
        next={{
          ...upNextCardFixture.next,
          before: [{ ...after, id: 'b', title: 'Wudu' }],
          after: [],
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: strings.plan.before })).toBeInTheDocument()
    expect(screen.getByText('Wudu')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: strings.plan.after })).toBeNull()
  })
})
