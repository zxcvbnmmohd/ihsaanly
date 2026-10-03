import { afterEach, describe, expect, it } from 'bun:test'
import { shareText } from './share-text'

const original = {
  share: Object.getOwnPropertyDescriptor(navigator, 'share'),
  clipboard: Object.getOwnPropertyDescriptor(navigator, 'clipboard'),
}

function define(key: 'share' | 'clipboard', value: unknown): void {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true })
}

afterEach(() => {
  for (const key of ['share', 'clipboard'] as const) {
    const descriptor = original[key]
    if (descriptor) Object.defineProperty(navigator, key, descriptor)
    else delete (navigator as unknown as Record<string, unknown>)[key]
  }
})

describe('shareText', () => {
  it('uses the share sheet when there is one', async () => {
    const shared: ShareData[] = []
    define('share', async (data: ShareData) => {
      shared.push(data)
    })
    expect(await shareText('hello')).toBe(true)
    expect(shared).toEqual([{ text: 'hello' }])
  })

  it('reports nothing sent when the share sheet is dismissed', async () => {
    define('share', async () => {
      throw new DOMException('cancelled', 'AbortError')
    })
    expect(await shareText('hello')).toBe(false)
  })

  it('copies to the clipboard when there is no share sheet', async () => {
    define('share', undefined)
    const copied: string[] = []
    define('clipboard', {
      writeText: async (text: string) => {
        copied.push(text)
      },
    })
    expect(await shareText('hello')).toBe(true)
    expect(copied).toEqual(['hello'])
  })

  it('reports nothing sent when the clipboard is refused', async () => {
    define('share', undefined)
    define('clipboard', {
      writeText: async () => {
        throw new Error('denied')
      },
    })
    expect(await shareText('hello')).toBe(false)
  })
})
