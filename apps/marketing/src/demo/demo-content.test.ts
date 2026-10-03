import { afterEach, describe, expect, test } from 'bun:test'
import { loadLanguagePack } from '@ihsaanly/core/i18n/language-pack'
import { applyDemoTranslation, demoItemById, demoItems } from './demo-content'

afterEach(() => applyDemoTranslation(null))

describe('demo content', () => {
  test('is the English document by default', () => {
    const items = demoItems()
    expect(items.length).toBeGreaterThan(10)
    expect(demoItemById(items[0]?.id ?? '')).toBe(items[0])
    expect(demoItemById('no-such-item')).toBeUndefined()
  })

  test("lays one language's translation over the English content", async () => {
    const english = demoItems()
    const { translation } = await loadLanguagePack('fr')
    applyDemoTranslation(translation)
    const french = demoItems()
    expect(french).not.toBe(english)
    expect(french).toHaveLength(english.length)
    expect(JSON.stringify(french)).not.toBe(JSON.stringify(english))
  })

  test('applying the same file again does nothing', async () => {
    const { translation } = await loadLanguagePack('fr')
    applyDemoTranslation(translation)
    const once = demoItems()
    applyDemoTranslation(translation)
    expect(demoItems()).toBe(once)
  })

  test('null goes back to English', async () => {
    const english = demoItems()
    applyDemoTranslation((await loadLanguagePack('ja')).translation)
    applyDemoTranslation(null)
    expect(demoItems()).toBe(english)
  })
})
