import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { getKnownItems, setKnownItems } from '@ihsaanly/state/memorise/store'
import { getOnboarding } from '@ihsaanly/state/onboarding/store'
import { allActions, recordEvent } from '@ihsaanly/state/storage/events'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'
import { connectMemoryCloud, type MemoryCloud } from '../../test/memory-cloud'

const real = { ...(await import('@ihsaanly/state/storage/events')) }

const create = URL.createObjectURL
const revoke = URL.revokeObjectURL
const anchorClick = HTMLAnchorElement.prototype.click
const inputClick = HTMLInputElement.prototype.click
const confirm = window.confirm
const reload = Object.getOwnPropertyDescriptor(window.location, 'reload')

let downloads: { name: string; blob: Blob }[]
let pending: Blob | null
let reloads: number

beforeEach(async () => {
  await resetApp()
  await startUsing()
  downloads = []
  pending = null
  reloads = 0
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    pending = blob as Blob
    return 'blob:data'
  }
  URL.revokeObjectURL = () => {}
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, blob: pending as Blob })
  }
  Object.defineProperty(window.location, 'reload', {
    configurable: true,
    value: () => {
      reloads += 1
    },
  })
})

afterEach(() => {
  URL.createObjectURL = create
  URL.revokeObjectURL = revoke
  HTMLAnchorElement.prototype.click = anchorClick
  HTMLInputElement.prototype.click = inputClick
  window.confirm = confirm
  if (reload) Object.defineProperty(window.location, 'reload', reload)
})

/** The next file picker "chooses" a file with this text. */
function chooseFile(text: string): void {
  HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
    Object.defineProperty(this, 'files', { value: [new File([text], 'export.json')] })
    this.onchange?.(new Event('change'))
  }
}

const exportOf = (events: { subject: string; at: number }[]): string =>
  JSON.stringify({
    format: 'ihsaanly-export',
    version: 1,
    exportedAt: new Date(0).toISOString(),
    preferences: {},
    events: events.map((event) => ({
      kind: 'prayer-performed',
      subject: event.subject,
      at: event.at,
      logDay: '2026-01-01',
      deltaSeconds: null,
    })),
  })

const row = (title: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name: new RegExp(`^${title}`) })

describe('export', () => {
  it('downloads the data as ihsaanly-data.json', async () => {
    recordEvent({ kind: 'prayer-performed', subject: 'fajr', at: new Date(1_000), logDay: 'd' })
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.export))
    expect(downloads.map((entry) => entry.name)).toEqual(['ihsaanly-data.json'])
    const saved = JSON.parse((await downloads[0]?.blob.text()) ?? '')
    expect(saved.format).toBe('ihsaanly-export')
    expect(saved.events.map((event: { subject: string }) => event.subject)).toContain('fajr')
  })

  it('says so when the download cannot be made', async () => {
    URL.createObjectURL = () => {
      throw new Error('no blobs')
    }
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.export))
    expect(await screen.findByText(en.data.shareFailed)).toBeInTheDocument()
  })
})

describe('import', () => {
  it('adds the entries in the file, once', async () => {
    chooseFile(
      exportOf([
        { subject: 'fajr', at: 5_000 },
        { subject: 'dhuhr', at: 6_000 },
      ]),
    )
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.importing))
    expect(await screen.findByText(en.data.imported(2))).toBeInTheDocument()
    expect(
      allActions()
        .map((action) => action.subject)
        .sort(),
    ).toEqual(['dhuhr', 'fajr'])

    await app.user.click(screen.getByRole('button', { name: new RegExp(`^${en.data.importing}`) }))
    expect(await screen.findByText(en.data.imported(0))).toBeInTheDocument()
    expect(allActions()).toHaveLength(2)
  })

  it('says so when the file is not an export', async () => {
    chooseFile('{"not":"an export"}')
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.importing))
    expect(await screen.findByText(en.data.importFailed)).toBeInTheDocument()
    expect(allActions()).toHaveLength(0)
  })

  it('does nothing when the file cannot be read', async () => {
    HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', { value: [] })
      this.onchange?.(new Event('change'))
    }
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.importing))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(screen.queryByText(en.data.importFailed)).toBeNull()
  })
})

describe('diagnostics', () => {
  it('opens the diagnostic report', async () => {
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.diagnostics))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/diagnostics'))
  })
})

describe('delete', () => {
  it('asks first, and keeps everything on "cancel"', async () => {
    const asked: string[] = []
    window.confirm = (message?: string) => {
      asked.push(message ?? '')
      return false
    }
    setKnownItems(['dua-eating'])
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.delete))
    expect(asked).toEqual([`${en.data.deleteConfirmTitle}\n\n${en.data.deleteConfirmBody}`])
    expect(getKnownItems()).toEqual(['dua-eating'])
    expect(reloads).toBe(0)
  })

  it('wipes the device and reloads once confirmed', async () => {
    window.confirm = () => true
    setKnownItems(['dua-eating'])
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.delete))
    expect(reloads).toBe(1)
    const { reloadPreferences } = await import('@ihsaanly/state/storage/preference-store')
    reloadPreferences()
    expect(getKnownItems()).toEqual([])
    expect(getOnboarding().completed).toBe(false)
  })

  describe('signed in', () => {
    let cloud: MemoryCloud | null = null
    afterEach(async () => {
      await cloud?.stop()
      cloud = null
    })

    it('says the account keeps its own copy', async () => {
      cloud = await connectMemoryCloud({ uid: 'me' })
      const session = await import('@ihsaanly/state/cloud/session')
      await session.signIn('google')
      const asked: string[] = []
      window.confirm = (message?: string) => {
        asked.push(message ?? '')
        return false
      }
      const app = await renderApp('/data')
      await app.user.click(await row(en.data.delete))
      expect(asked[0]).toContain(en.data.deleteConfirmBodySignedIn)
    })
  })
})

describe('when saving an import fails', () => {
  const path = '@ihsaanly/state/storage/events'

  afterAll(() => {
    mock.module(path, () => real)
  })

  it('reports it as unreadable instead of losing the page', async () => {
    mock.module(path, () => ({
      ...real,
      insertExportedEvents: () => {
        throw new Error('storage full')
      },
    }))
    chooseFile(exportOf([{ subject: 'fajr', at: 5_000 }]))
    const app = await renderApp('/data')
    await app.user.click(await row(en.data.importing))
    expect(await screen.findByText(en.data.importFailed)).toBeInTheDocument()
  })
})
