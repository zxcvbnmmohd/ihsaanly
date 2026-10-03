import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Row } from './row'

// `?native` loads the native file itself: the preload only swaps a `.web` sibling in for the
// plain path. A template, so TypeScript does not look for a module of that name.
const NATIVE = '.tsx?native'
type RowComponent = typeof Row

const variants = [
  ['web', async (): Promise<RowComponent> => Row],
  ['native', async (): Promise<RowComponent> => (await import(`./row${NATIVE}`)).Row],
] as const

describe.each(variants)('Row (%s)', (_name, load) => {
  it('links to its href with title, detail and selection', async () => {
    const Component = await load()
    const { user, navigations, strings } = renderScreen(
      <Component title="Location" detail="Toronto" href="/location" selected />,
    )
    const link = screen.getByRole('link', { name: /Location/ })
    expect(link).toHaveAttribute('href', '/location')
    expect(screen.getByText('Toronto')).toBeInTheDocument()
    expect(screen.getByLabelText(strings.calculation.selected)).toBeInTheDocument()
    await user.click(link)
    expect(navigations).toEqual(['/location'])
  })

  it('is a button when it only has a handler', async () => {
    const Component = await load()
    const onPress = mock(() => {})
    const { user } = renderScreen(<Component title="Export" detail={null} onPress={onPress} />)
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Selected')).toBeNull()
  })

  it('is a plain line with neither', async () => {
    const Component = await load()
    renderScreen(<Component title="Version" detail="1.0.0" />)
    expect(screen.getByText('Version')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('Row (web) selection', () => {
  it('marks the selected link or button as the current item', () => {
    renderScreen(
      <>
        <Row title="Link" href="/a" selected />
        <Row title="Button" onPress={() => {}} selected />
        <Row title="Other" onPress={() => {}} />
      </>,
    )
    expect(screen.getByRole('link', { name: /Link/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /Button/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Other' })).not.toHaveAttribute('aria-current')
  })
})

describe('Row (web) interaction states', () => {
  it('keeps rendering through hover and focus', () => {
    renderScreen(<Row title="Hover" onPress={() => {}} />)
    const button = screen.getByRole('button', { name: 'Hover' })
    fireEvent.mouseEnter(button)
    fireEvent.focus(button)
    expect(button).toBeInTheDocument()
  })
})
