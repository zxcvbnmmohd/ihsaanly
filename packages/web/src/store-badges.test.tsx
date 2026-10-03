import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StoreBadges, type StoreBadgesProps } from './store-badges.tsx'

const soonMessage = (store: string): string => `${store} is coming soon`
const chromeWebStore = {
  url: null,
  imageSrc: '/chrome.png',
  alt: 'Available in the Chrome Web Store',
  soonPrefix: 'Coming to the',
  soonMessage: 'The extension is coming soon',
}

function setup(props: Partial<StoreBadgesProps> = {}): void {
  render(<StoreBadges appStoreUrl={null} playUrl={null} soonMessage={soonMessage} {...props} />)
}
const toast = (): HTMLElement => screen.getByRole('status')

beforeEach(() => {
  jest.useFakeTimers()
})
afterEach(() => {
  jest.useRealTimers()
})

describe('StoreBadges', () => {
  test('a store with a URL is a real link', () => {
    setup({ appStoreUrl: 'https://apps.test/x', playUrl: 'https://play.test/x' })
    expect(screen.getByRole('link', { name: /App Store/ })).toHaveAttribute(
      'href',
      'https://apps.test/x',
    )
    expect(screen.getByRole('link', { name: /Google Play/ })).toHaveAttribute(
      'href',
      'https://play.test/x',
    )
    expect(screen.queryByRole('button')).toBeNull()
  })

  test('shows the default and custom per-store prefixes', () => {
    setup()
    expect(screen.getByText('Download on the')).toBeInTheDocument()
    expect(screen.getByText('Get it on')).toBeInTheDocument()
    document.body.innerHTML = ''
    setup({
      appStoreUrl: 'https://a.test',
      playUrl: 'https://p.test',
      appStorePrefix: 'Télécharger sur',
      playPrefix: 'Disponible sur',
    })
    expect(screen.getByText('Télécharger sur')).toBeInTheDocument()
    expect(screen.getByText('Disponible sur')).toBeInTheDocument()
  })

  test('a store with no URL is a disabled button that announces "coming soon" on tap', () => {
    setup()
    const button = screen.getByRole('button', { name: /App Store/ })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(toast()).toBeEmptyDOMElement()
    fireEvent.click(button)
    expect(toast()).toBeEmptyDOMElement()
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(toast()).toHaveTextContent('App Store is coming soon')
  })

  test('the Google Play button names its own store, and the message clears after 4s', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: /Google Play/ }))
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(toast()).toHaveTextContent('Google Play is coming soon')
    act(() => {
      jest.advanceTimersByTime(3999)
    })
    expect(toast()).toHaveTextContent('Google Play is coming soon')
    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(toast()).toBeEmptyDOMElement()
  })

  test('a second tap restarts the message so it is announced again', () => {
    setup()
    const button = screen.getByRole('button', { name: /App Store/ })
    fireEvent.click(button)
    act(() => {
      jest.advanceTimersByTime(50)
    })
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    fireEvent.click(button)
    expect(toast()).toBeEmptyDOMElement()
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(toast()).toHaveTextContent('App Store is coming soon')
    // The first tap's 4s timer was cancelled: the message survives past it.
    act(() => {
      jest.advanceTimersByTime(3900)
    })
    expect(toast()).toHaveTextContent('App Store is coming soon')
  })

  test('no Chrome badge unless asked for', () => {
    setup()
    expect(screen.queryByText('Chrome Web Store')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  test('before launch the Chrome badge is a plain button with its own message', () => {
    setup({ chromeWebStore })
    const button = screen.getByRole('button', { name: /Chrome Web Store/ })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Coming to the')).toBeInTheDocument()
    fireEvent.click(button)
    act(() => {
      jest.advanceTimersByTime(50)
    })
    expect(toast()).toHaveTextContent('The extension is coming soon')
  })

  test('once published the Chrome badge is the official artwork as a link', () => {
    setup({ chromeWebStore: { ...chromeWebStore, url: 'https://chrome.test/x' } })
    const image = screen.getByRole('img', { name: chromeWebStore.alt })
    expect(image).toHaveAttribute('src', '/chrome.png')
    expect(image.closest('a')).toHaveAttribute('href', 'https://chrome.test/x')
    expect(screen.queryByRole('button', { name: /Chrome Web Store/ })).toBeNull()
  })

  test('unmounting cancels a pending message', () => {
    const view = render(<StoreBadges appStoreUrl={null} playUrl={null} soonMessage={soonMessage} />)
    fireEvent.click(screen.getByRole('button', { name: /App Store/ }))
    view.unmount()
    expect(() => jest.advanceTimersByTime(5000)).not.toThrow()
    expect(jest.getTimerCount()).toBe(0)
  })
})
