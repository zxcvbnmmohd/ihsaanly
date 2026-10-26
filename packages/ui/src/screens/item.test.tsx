import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { itemFixture, itemScreenFixture } from './fixtures'
import { ItemScreen } from './item'

describe('ItemScreen', () => {
  it('is a not-found message when the item is missing', () => {
    const { strings } = renderScreen(<ItemScreen {...itemScreenFixture} item={null} />)
    expect(screen.getByText(strings.notFound.body)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.item.done })).toBeNull()
  })

  it('shows the ruling, text, parts, why, how, note and evidence', async () => {
    const { user, navigations, strings } = renderScreen(<ItemScreen {...itemScreenFixture} />)
    await user.click(screen.getByRole('link', { name: strings.ruling.sunnah }))
    expect(navigations).toEqual(['/glossary?term=sunnah'])
    expect(screen.getByText(`· ${strings.item.unreviewed}`)).toBeInTheDocument()
    expect(screen.getByText(strings.item.repeat(3))).toBeInTheDocument()
    expect(screen.getByText(itemFixture.arabic as string)).toBeInTheDocument()
    expect(screen.getByText(itemFixture.transliteration as string)).toBeInTheDocument()
    expect(screen.getByText(itemFixture.translation as string)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.item.parts })).toBeInTheDocument()
    expect(screen.getByText('Ayat al-Kursi')).toBeInTheDocument()
    expect(screen.getByText(strings.item.partRepeat(100))).toBeInTheDocument()
    expect(screen.getAllByText('Qur’an 2:255')).not.toHaveLength(0)
    expect(screen.getByText(itemFixture.why as string)).toBeInTheDocument()
    expect(screen.getByText('Say Bismillah before the first bite.')).toBeInTheDocument()
    expect(screen.getByText(itemFixture.note as string)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.item.evidence })).toBeInTheDocument()
  })

  it('omits what the item does not have', () => {
    const { strings } = renderScreen(
      <ItemScreen
        {...itemScreenFixture}
        counter={null}
        memoriseHref={null}
        item={{
          ...itemFixture,
          reviewed: true,
          repeat: 1,
          arabic: null,
          why: null,
          how: [],
          note: null,
          parts: [],
        }}
      />,
    )
    expect(screen.queryByText(`· ${strings.item.unreviewed}`)).toBeNull()
    expect(screen.queryByText(strings.item.repeat(1))).toBeNull()
    expect(screen.queryByRole('heading', { name: strings.item.parts })).toBeNull()
    expect(screen.queryByRole('heading', { name: strings.item.why })).toBeNull()
    expect(screen.queryByRole('heading', { name: strings.item.how })).toBeNull()
    expect(screen.queryByRole('heading', { name: strings.item.note })).toBeNull()
    expect(screen.queryByRole('link', { name: named(strings.memorise.start) })).toBeNull()
  })

  it('leaves out the optional lines of the Arabic card and of a part', () => {
    renderScreen(
      <ItemScreen
        {...itemScreenFixture}
        item={{
          ...itemFixture,
          transliteration: null,
          translation: null,
          parts: [
            {
              id: 'p',
              title: 'Single part',
              arabic: 'نص',
              transliteration: null,
              translation: null,
              repeat: 1,
              source: 'Source line',
            },
          ],
        }}
      />,
    )
    expect(screen.queryByText(itemFixture.transliteration as string)).toBeNull()
    expect(screen.getByText('Source line')).toBeInTheDocument()
  })

  it('counts and resets, until the item is done', async () => {
    const onTapCounter = mock(() => {})
    const onResetCounter = mock(() => {})
    const { user, strings } = renderScreen(
      <ItemScreen
        {...itemScreenFixture}
        onTapCounter={onTapCounter}
        onResetCounter={onResetCounter}
      />,
    )
    await user.click(screen.getByRole('button', { name: itemScreenFixture.title }))
    await user.click(screen.getByRole('button', { name: strings.item.counterReset }))
    expect(onTapCounter).toHaveBeenCalledTimes(1)
    expect(onResetCounter).toHaveBeenCalledTimes(1)
  })

  it('marks done and offers to undo', async () => {
    const onToggleDone = mock(() => {})
    const { user, strings, unmount } = renderScreen(
      <ItemScreen {...itemScreenFixture} onToggleDone={onToggleDone} />,
    )
    await user.click(screen.getByRole('button', { name: strings.item.done }))
    expect(onToggleDone).toHaveBeenCalledTimes(1)
    unmount()

    const second = renderScreen(
      <ItemScreen {...itemScreenFixture} done onToggleDone={onToggleDone} />,
    )
    expect(screen.getByText(strings.item.doneToday)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: itemScreenFixture.title })).toBeNull()
    await second.user.click(screen.getByRole('button', { name: strings.item.undo }))
    expect(onToggleDone).toHaveBeenCalledTimes(2)
  })

  it('toggles on-today and the reminder when one can be scheduled', async () => {
    const onToggleOnToday = mock(() => {})
    const onToggleRemind = mock((_value: boolean) => {})
    const { user, strings } = renderScreen(
      <ItemScreen
        {...itemScreenFixture}
        onToggleOnToday={onToggleOnToday}
        remind={{ value: false, detail: 'At 7:00' }}
        onToggleRemind={onToggleRemind}
      />,
    )
    expect(screen.getByText('At 7:00')).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: strings.item.onToday }))
    await user.click(screen.getByRole('switch', { name: strings.item.remind }))
    expect(onToggleOnToday).toHaveBeenCalledTimes(1)
    expect(onToggleRemind).toHaveBeenCalledWith(true)
  })

  it('hides the reminder switch when there is nothing to schedule', () => {
    const { strings } = renderScreen(<ItemScreen {...itemScreenFixture} remind={null} />)
    expect(screen.queryByRole('switch', { name: strings.item.remind })).toBeNull()
  })

  it('shares as text or image and starts memorising', async () => {
    const onShareText = mock(() => {})
    const onShareImage = mock(() => {})
    const { user, navigations, strings } = renderScreen(
      <ItemScreen {...itemScreenFixture} onShareText={onShareText} onShareImage={onShareImage} />,
    )
    await user.click(screen.getByRole('button', { name: strings.item.shareText }))
    await user.click(screen.getByRole('button', { name: strings.item.shareImage }))
    await user.click(screen.getByRole('link', { name: strings.memorise.start }))
    expect(onShareText).toHaveBeenCalledTimes(1)
    expect(onShareImage).toHaveBeenCalledTimes(1)
    expect(navigations).toEqual(['/item/memorise/dua-eating'])
  })

  describe('reading preferences', () => {
    const translation = itemFixture.translation as string
    const arabic = itemFixture.arabic as string

    it('puts the Arabic, then its transliteration, before the meaning, centred', () => {
      renderScreen(<ItemScreen {...itemScreenFixture} />)
      const said = screen.getByText(arabic)
      const meaning = screen.getByText(translation)
      expect(said.compareDocumentPosition(meaning)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      expect(said).toHaveStyle({ textAlign: 'center' })
      expect(screen.getByText(itemFixture.transliteration as string).className).toContain(
        'text-center',
      )
    })

    it('puts the meaning first and aligns to the start when asked', () => {
      renderScreen(
        <ItemScreen {...itemScreenFixture} reading={{ arabicFirst: false, align: 'start' }} />,
      )
      const said = screen.getByText(arabic)
      const meaning = screen.getByText(translation)
      expect(meaning.compareDocumentPosition(said)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
      expect(said).toHaveStyle({ textAlign: 'right' })
      expect(meaning.className).toContain('text-start')
      // A part follows the same order.
      const part = itemFixture.parts[1]
      const partMeaning = screen.getByText(part?.translation as string)
      expect(partMeaning.compareDocumentPosition(screen.getByText(part?.arabic as string))).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    })
  })

  describe('brief and detailed', () => {
    const [firstLine] = (itemFixture.why as string).split('. ')

    it('shows everything when detailed, and offers brief', async () => {
      const onDetail = mock((_detail: 'brief' | 'detailed') => {})
      const { user, strings } = renderScreen(
        <ItemScreen {...itemScreenFixture} onDetail={onDetail} />,
      )
      expect(screen.getByText(itemFixture.why as string)).toBeInTheDocument()
      expect(screen.getByText('A narration.')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: strings.item.detailed }).getAttribute('aria-pressed'),
      ).toBe('true')
      await user.click(screen.getByRole('button', { name: strings.item.brief }))
      expect(onDetail.mock.calls).toEqual([['brief']])
    })

    it('shows the first sentence of the why and only the citations when brief', () => {
      const { strings } = renderScreen(<ItemScreen {...itemScreenFixture} detail="brief" />)
      expect(screen.getByText(`${firstLine}.`)).toBeInTheDocument()
      expect(screen.queryByText(itemFixture.why as string)).toBeNull()
      expect(screen.queryByText('A narration.')).toBeNull()
      expect(screen.getAllByText(strings.item.quranReference(2, 255))).not.toHaveLength(0)
    })

    it('offers no choice when brief would leave nothing out', () => {
      const { strings } = renderScreen(
        <ItemScreen
          {...itemScreenFixture}
          item={{
            ...itemFixture,
            why: 'One sentence only.',
            evidence: [{ type: 'quran', surah: 2, ayah: 255, text: {} }],
          }}
        />,
      )
      expect(screen.queryByRole('button', { name: strings.item.brief })).toBeNull()
    })

    it('offers the choice for a long why with no narrations, and for narrations alone', () => {
      const { strings, unmount } = renderScreen(
        <ItemScreen {...itemScreenFixture} item={{ ...itemFixture, evidence: [] }} />,
      )
      expect(screen.getByRole('button', { name: strings.item.brief })).toBeInTheDocument()
      unmount()
      renderScreen(<ItemScreen {...itemScreenFixture} item={{ ...itemFixture, why: null }} />)
      expect(screen.getByRole('button', { name: strings.item.brief })).toBeInTheDocument()
    })
  })
})
