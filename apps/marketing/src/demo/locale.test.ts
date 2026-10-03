import { afterEach, describe, expect, test } from 'bun:test'
import { resolveText } from '@ihsaanly/core/content/language'
import { loadLanguagePack } from '@ihsaanly/core/i18n/language-pack'
import { SUPPORTED_LANGUAGES } from '@ihsaanly/core/i18n/locale'
import { applyDemoTranslation, demoItems } from './demo-content'
import { demoLocaleFor } from './locale'

afterEach(async () => demoLocaleFor(await loadLanguagePack('en')))

describe('demoLocaleFor', () => {
  test('English: en-US dates, no translation laid over the content', async () => {
    const locale = demoLocaleFor(await loadLanguagePack('en'))
    expect(locale.language).toBe('en')
    expect(locale.intlLocale).toBe('en-US')
    expect(locale.copy.tabsLabel).toBe('Tabs')
    expect(locale.strings.tabs.today).toBeTruthy()
  })

  test.each([...SUPPORTED_LANGUAGES])(
    '%s: strings, copy and an Intl locale the runtime accepts',
    async (language) => {
      const pack = await loadLanguagePack(language)
      const locale = demoLocaleFor(pack)
      expect(locale.strings).toBe(pack.strings)
      expect(locale.copy.tabsLabel).toBeTruthy()
      expect(() => new Intl.DateTimeFormat(locale.intlLocale)).not.toThrow()
    },
  )

  test('sets the content language and lays the translation over the demo content', async () => {
    const english = demoItems().map((item) => resolveText(item.title))
    const french = demoLocaleFor(await loadLanguagePack('fr'))
    expect(french.intlLocale).toBe('fr')
    expect(demoItems().map((item) => resolveText(item.title))).not.toEqual(english)
    demoLocaleFor(await loadLanguagePack('en'))
    expect(demoItems().map((item) => resolveText(item.title))).toEqual(english)
    applyDemoTranslation(null)
  })
})
