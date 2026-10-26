import { describe, expect, it, mock } from 'bun:test'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { DEFAULT_SHARE_OPTIONS, type ShareCardOptions } from '../props/share-card'
import { SHARE_WATERMARK } from './share-card'
import { ShareStudio, type ShareStudioProps } from './share-studio'

const card = {
  title: 'Leaving home',
  arabic: 'بِسْمِ اللَّهِ',
  transliteration: 'Bismillah',
  translation: 'In the name of Allah',
  source: 'Abu Dawud 5095',
}

function studio(overrides: Partial<ShareStudioProps> = {}): ShareStudioProps {
  return {
    card,
    options: DEFAULT_SHARE_OPTIONS,
    palettes: { ...palettes, current: palettes.light },
    onChange: mock(),
    onCopyText: mock(),
    onShareImage: mock(),
    onSaveImage: null,
    notice: null,
    onClose: mock(),
    ...overrides,
  }
}

/** react-native-web writes a hex colour into the DOM as rgba with two decimals. */
function rgba(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))
  return `rgba(${r}, ${g}, ${b}, 1.00)`
}

describe('ShareStudio', () => {
  it('previews the card with its watermark', () => {
    const { strings } = renderScreen(<ShareStudio {...studio()} />)
    expect(screen.getByRole('dialog', { name: strings.share.title })).toBeInTheDocument()
    const preview = screen.getByRole('img', { name: strings.share.preview })
    expect(within(preview).getByText(SHARE_WATERMARK)).toBeInTheDocument()
    expect(within(preview).getByText('Leaving home')).toBeInTheDocument()
    // A story preview is 300 tall, so 168.75 wide.
    expect(preview).toHaveStyle({ height: '300px', width: '168.75px' })
  })

  it('marks the options in force and reports each choice', async () => {
    const onChange = mock((_options: ShareCardOptions) => undefined)
    const { user, strings } = renderScreen(<ShareStudio {...studio({ onChange })} />)
    expect(screen.getByRole('button', { name: strings.share.styleLight })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: strings.share.styleDark })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await user.click(screen.getByRole('button', { name: strings.share.styleDark }))
    await user.click(screen.getByRole('button', { name: strings.share.styleAccent }))
    await user.click(screen.getByRole('button', { name: strings.share.styleLight }))
    await user.click(screen.getByRole('button', { name: strings.share.transparent }))
    await user.click(screen.getByRole('button', { name: strings.share.solid }))
    await user.click(screen.getByRole('button', { name: strings.share.square }))
    await user.click(screen.getByRole('button', { name: strings.share.story }))
    expect(onChange.mock.calls.map(([options]) => options)).toEqual([
      { ...DEFAULT_SHARE_OPTIONS, style: 'paper-dark' },
      { ...DEFAULT_SHARE_OPTIONS, style: 'accent' },
      { ...DEFAULT_SHARE_OPTIONS, style: 'paper-light' },
      { ...DEFAULT_SHARE_OPTIONS, background: 'transparent' },
      { ...DEFAULT_SHARE_OPTIONS, background: 'solid' },
      { ...DEFAULT_SHARE_OPTIONS, aspect: 'square' },
      { ...DEFAULT_SHARE_OPTIONS, aspect: 'story' },
    ])
  })

  it('shows a transparent square on a backdrop that contrasts with its ink', () => {
    const { strings } = renderScreen(
      <ShareStudio
        {...studio({
          options: { style: 'paper-dark', background: 'transparent', aspect: 'square' },
        })}
      />,
    )
    const preview = screen.getByRole('img', { name: strings.share.preview })
    expect(preview).toHaveStyle({ height: '230px', width: '230px' })
    expect(preview.style.backgroundColor).toBe(rgba(palettes.light.wash[0]))
  })

  it('offers save or share, and copy, when the host cannot save directly', async () => {
    const onShareImage = mock()
    const onCopyText = mock()
    const { user, strings } = renderScreen(
      <ShareStudio {...studio({ onShareImage, onCopyText })} />,
    )
    expect(screen.queryByRole('button', { name: strings.share.saveImage })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.share.saveOrShare }))
    await user.click(screen.getByRole('button', { name: strings.share.copyText }))
    expect(onShareImage).toHaveBeenCalledTimes(1)
    expect(onCopyText).toHaveBeenCalledTimes(1)
  })

  it('offers save beside share when the host can save', async () => {
    const onSaveImage = mock()
    const { user, strings } = renderScreen(<ShareStudio {...studio({ onSaveImage })} />)
    expect(screen.getByRole('button', { name: strings.share.shareImage })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.share.saveImage }))
    expect(onSaveImage).toHaveBeenCalledTimes(1)
  })

  it('announces a notice and closes', async () => {
    const onClose = mock()
    const { user, strings } = renderScreen(
      <ShareStudio {...studio({ notice: 'Copied', onClose })} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
