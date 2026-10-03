import { afterAll, expect, it, mock } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { render, screen } from '@testing-library/react'
import * as ReactDOMClient from 'react-dom/client'
import { resetApp } from '../test/app'

// main.tsx starts cloud sync; leave the shared session as it was found.
afterAll(async () => {
  const { startCloud } = await import('@ihsaanly/state/cloud/session')
  startCloud(() => Promise.reject(new Error('stopped')))()
})

// main.tsx is the browser entry: it mounts into #root as soon as it loads.
// Capture what it mounts instead of keeping a second React root alive for the
// rest of the run, then render that element ourselves.
it('installs downloaded content, sets the language and direction, mounts the router into #root and starts sync', async () => {
  await resetApp()
  document.body.innerHTML = '<div id="root"></div>'
  document.documentElement.lang = ''
  document.documentElement.dir = ''

  // A download from an earlier open, installed before anything renders.
  const { saveCachedContent, clearCachedContent } = await import('@ihsaanly/state/content/cache')
  const { default: english } = await import('@ihsaanly/core/content/items.json')
  const { default: glossary } = await import('@ihsaanly/core/content/glossary.json')
  const [first, ...rest] = english.items
  if (!first) throw new Error('no items')
  saveCachedContent({
    version: 'aaaaaaaaaaaa',
    language: 'en',
    items: { ...english, items: [{ ...first, title: { en: 'Downloaded title' } }, ...rest] },
    glossary,
    translations: {},
  })

  const real = { ...ReactDOMClient }
  const mounted: { container: Element; node: unknown }[] = []
  mock.module('react-dom/client', () => ({
    ...real,
    createRoot: (container: Element) => ({
      render: (node: unknown) => void mounted.push({ container, node }),
      unmount: () => {},
    }),
  }))
  try {
    await import('./main')
  } finally {
    mock.module('react-dom/client', () => real)
  }

  const core = await import('@ihsaanly/core/content')
  expect(core.itemById(first.id)?.title.en).toBe('Downloaded title')
  clearCachedContent()
  core.resetContent()

  expect(mounted).toHaveLength(1)
  expect(mounted[0]?.container).toBe(document.getElementById('root') as Element)
  expect(document.documentElement.lang).toStartWith('en')
  expect(document.documentElement.dir).toBe('ltr')

  render(mounted[0]?.node as never)
  expect(await screen.findByText(en.onboarding.welcomeTitle)).toBeInTheDocument()
})
