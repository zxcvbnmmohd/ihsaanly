import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import { en } from '@ihsaanly/core/strings/en'
import { getKnownItems, setKnownItems } from '@ihsaanly/state/memorise/store'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'

beforeEach(async () => {
  await resetApp()
  await startUsing()
  setKnownItems([])
})

describe('learning an item', () => {
  it('hides one more part of the text each time, and the progress shows', async () => {
    const app = await renderApp('/item/memorise/dua-leaving-home')
    await screen.findByRole('heading', { level: 1, name: en.memorise.title })
    const hide = screen.getByRole('button', { name: en.memorise.hide })
    const before = document.body.textContent
    await app.user.click(hide)
    expect(document.body.textContent).not.toBe(before)
  })

  it('marks the item known and still learning again', async () => {
    const app = await renderApp('/item/memorise/dua-leaving-home')
    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(`^${en.memorise.notKnown}`) }),
    )
    expect(getKnownItems()).toEqual(['dua-leaving-home'])
    await app.user.click(
      await screen.findByRole('button', { name: new RegExp(`^${en.memorise.known}`) }),
    )
    expect(getKnownItems()).toEqual([])
  })

  it('is "Not found" for an unknown item', async () => {
    await renderApp('/item/memorise/nope')
    expect(
      await screen.findByRole('heading', { level: 1, name: en.notFound.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(en.notFound.body)).toBeInTheDocument()
  })
})

describe('a recitation', () => {
  class FakeAudio extends EventTarget {
    static created: FakeAudio[] = []
    loop = false
    calls: string[] = []
    constructor(readonly source: string) {
      super()
      FakeAudio.created.push(this)
    }
    play(): Promise<void> {
      this.calls.push('play')
      this.dispatchEvent(new Event('play'))
      return Promise.resolve()
    }
    pause(): void {
      this.calls.push('pause')
      this.dispatchEvent(new Event('pause'))
    }
  }

  const originalAudio = globalThis.Audio
  const item = itemById('dua-leaving-home') as { audio: string | null } | undefined

  beforeEach(() => {
    FakeAudio.created = []
    globalThis.Audio = FakeAudio as unknown as typeof Audio
    if (item) item.audio = '/recitations/leaving-home.mp3'
  })

  afterEach(() => {
    globalThis.Audio = originalAudio
    if (item) item.audio = null
  })

  it('plays and pauses one audio element, and sets it looping', async () => {
    const app = await renderApp('/item/memorise/dua-leaving-home')
    const play = await screen.findByRole('button', { name: en.memorise.play })
    const element = FakeAudio.created[0]
    expect(element?.source).toBe('/recitations/leaving-home.mp3')
    expect(element?.loop).toBe(true)

    await app.user.click(play)
    expect(element?.calls).toEqual(['play'])
    await app.user.click(await screen.findByRole('button', { name: en.memorise.stop }))
    expect(element?.calls).toEqual(['play', 'pause'])

    await app.user.click(screen.getByRole('button', { name: new RegExp(en.memorise.loop) }))
    await waitFor(() => expect(element?.loop).toBe(false))
  })
})
