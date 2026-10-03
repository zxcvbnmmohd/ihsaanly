import { afterAll, expect, it } from 'bun:test'

const { saveCachedContent, clearCachedContent } = await import('@ihsaanly/state/content/cache')
const core = await import('@ihsaanly/core/content')
const { default: english } = await import('@ihsaanly/core/content/items.json')
const { default: glossary } = await import('@ihsaanly/core/content/glossary.json')

afterAll(() => {
  clearCachedContent()
  core.resetContent()
})

it('installs the download from an earlier open as soon as it loads', async () => {
  const [first, ...rest] = english.items
  if (!first) throw new Error('no items')
  saveCachedContent({
    version: 'aaaaaaaaaaaa',
    language: 'en',
    items: { ...english, items: [{ ...first, title: { en: 'Downloaded title' } }, ...rest] },
    glossary,
    translations: {},
  })

  // A fresh copy: the app entry's test may already have loaded this module.
  const fresh = './install?fresh'
  await import(fresh)

  expect(core.itemById(first.id)?.title.en).toBe('Downloaded title')
})
