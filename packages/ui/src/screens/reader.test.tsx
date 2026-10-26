import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { readerFixture } from './fixtures'
import { ReaderScreen } from './reader'

const [first, second] = readerFixture.pages
const single = first ? [first] : []

describe('ReaderScreen', () => {
  it('shows the Arabic, then the transliteration, then the translation', () => {
    renderScreen(<ReaderScreen {...readerFixture} pages={single} />)
    const arabic = screen.getByText(first?.arabic as string)
    const transliteration = screen.getByText(first?.transliteration as string)
    const translation = screen.getByText(first?.translation as string)
    expect(arabic.compareDocumentPosition(transliteration)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(transliteration.compareDocumentPosition(translation)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('puts the meaning first and aligns everything to its start when the reader asks', () => {
    renderScreen(
      <ReaderScreen
        {...readerFixture}
        pages={single}
        reading={{ arabicFirst: false, align: 'start' }}
      />,
    )
    const arabic = screen.getByText(first?.arabic as string)
    const transliteration = screen.getByText(first?.transliteration as string)
    const translation = screen.getByText(first?.translation as string)
    // The translation leads; the transliteration stays with the Arabic.
    expect(translation.compareDocumentPosition(arabic)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(arabic.compareDocumentPosition(transliteration)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    // Arabic starts at the right; the rest at the layout's start.
    expect(arabic).toHaveStyle({ textAlign: 'right' })
    expect(translation.className).toContain('text-start')
    expect(transliteration.className).toContain('text-start')
  })

  it('centres the Arabic and its meaning by default', () => {
    renderScreen(<ReaderScreen {...readerFixture} pages={single} />)
    expect(screen.getByText(first?.arabic as string)).toHaveStyle({ textAlign: 'center' })
    expect(screen.getByText(first?.translation as string).className).toContain('text-center')
  })

  it('has no pager for a single text, and marks it done or opens the rest', async () => {
    const onDone = mock(() => {})
    const onMore = mock(() => {})
    const { user, strings } = renderScreen(
      <ReaderScreen {...readerFixture} pages={single} onDone={onDone} onMore={onMore} />,
    )
    expect(screen.queryByRole('button', { name: strings.reader.next })).toBeNull()
    expect(screen.queryByText(first?.title as string)).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.item.done }))
    await user.click(screen.getByRole('link', { name: strings.reader.more }))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onMore).toHaveBeenCalledTimes(1)
  })

  it('pages through parts, naming each and where it is', async () => {
    const onPage = mock((_page: number) => {})
    const { user, strings } = renderScreen(<ReaderScreen {...readerFixture} onPage={onPage} />)
    expect(screen.getByRole('heading', { name: first?.title ?? '' })).toBeInTheDocument()
    expect(screen.getByText(strings.reader.page(1, 2))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.reader.previous }))
    expect(onPage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: strings.reader.next }))
    expect(onPage.mock.calls).toEqual([[1]])
  })

  it('shows the last part without its missing lines and goes back from it', async () => {
    const onPage = mock((_page: number) => {})
    const { user, strings } = renderScreen(
      <ReaderScreen {...readerFixture} page={1} onPage={onPage} />,
    )
    expect(screen.getByText(second?.arabic as string)).toBeInTheDocument()
    expect(screen.queryByText(first?.arabic as string)).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.reader.next }))
    expect(onPage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: strings.reader.previous }))
    expect(onPage.mock.calls).toEqual([[0]])
  })

  it('counts with one large tap target until the target', async () => {
    const onTapCounter = mock(() => {})
    const { user, strings } = renderScreen(
      <ReaderScreen
        {...readerFixture}
        pages={single}
        counter={{ count: 4, target: 33 }}
        onTapCounter={onTapCounter}
      />,
    )
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('/ 33')).toBeInTheDocument()
    expect(screen.getByText(strings.panel.tapToCount)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: readerFixture.title }))
    expect(onTapCounter).toHaveBeenCalledTimes(1)
  })

  it('shows a reached count as complete and stops counting', async () => {
    const onTapCounter = mock(() => {})
    const { user, strings } = renderScreen(
      <ReaderScreen
        {...readerFixture}
        pages={single}
        counter={{ count: 33, target: 33 }}
        onTapCounter={onTapCounter}
      />,
      { scheme: 'dark' },
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.queryByText(strings.panel.tapToCount)).toBeNull()
    await user.click(screen.getByRole('button', { name: readerFixture.title }))
    expect(onTapCounter).not.toHaveBeenCalled()
  })

  it('points a first-use coach mark under each target in turn', async () => {
    const onNext = mock(() => {})
    const onSkip = mock(() => {})
    const coach = { step: 0, total: 3, onNext, onSkip }
    const counter = { count: 0, target: 3 }
    const { user, strings, rerender } = renderScreen(
      <ReaderScreen
        {...readerFixture}
        pages={single}
        counter={counter}
        coach={{ ...coach, target: 'counter' }}
      />,
    )
    expect(screen.getByText(strings.tour.readerCount)).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: strings.tour.step(1, 3) })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.tour.next }))
    await user.click(screen.getByRole('button', { name: strings.tour.skip }))
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onSkip).toHaveBeenCalledTimes(1)

    rerender(
      <ReaderScreen
        {...readerFixture}
        pages={single}
        counter={counter}
        coach={{ ...coach, step: 1, target: 'done' }}
      />,
    )
    expect(screen.getByText(strings.tour.readerDone(strings.item.done))).toBeInTheDocument()
    expect(screen.queryByText(strings.tour.readerCount)).toBeNull()

    rerender(
      <ReaderScreen
        {...readerFixture}
        pages={single}
        coach={{ ...coach, step: 2, target: 'more' }}
      />,
    )
    expect(screen.getByText(strings.tour.readerMore(strings.reader.more))).toBeInTheDocument()
  })

  it('shows no counter tip when there is no counter', () => {
    const { strings } = renderScreen(
      <ReaderScreen
        {...readerFixture}
        coach={{ target: 'counter', step: 0, total: 2, onNext: () => {}, onSkip: () => {} }}
      />,
    )
    expect(screen.queryByText(strings.tour.readerCount)).toBeNull()
  })

  it('says not found with nothing to read', () => {
    const { strings } = renderScreen(<ReaderScreen {...readerFixture} pages={[]} />)
    expect(screen.getByText(strings.notFound.body)).toBeInTheDocument()
  })
})
