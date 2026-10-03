import { describe, expect, test } from 'bun:test'
import { catalogue } from './messages.server'

const { getMessages } = await import('./messages')

describe('getMessages', () => {
  test("English pages carry every other language's suggestion banner text", async () => {
    const messages = await getMessages({ data: { lang: 'en' } })
    expect(messages.strings).toEqual(catalogue('en').strings)
    expect(messages.offers).not.toBeNull()
    expect(Object.keys(messages.offers ?? {})).not.toContain('en')
    const french = messages.offers?.fr
    expect(french?.text).toContain('{language}')
    expect(french?.text).not.toContain('<')
    expect(french?.dismiss).toBeTruthy()
  })

  test('other languages carry their own strings and no offers', async () => {
    const messages = await getMessages({ data: { lang: 'ar' } })
    expect(messages.strings).toEqual(catalogue('ar').strings)
    expect(messages.offers).toBeNull()
  })
})
