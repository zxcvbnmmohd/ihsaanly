import { afterEach, beforeEach, expect, it } from 'bun:test'
import { buildDiagnostics, buildExport, downloadDiagnostics, downloadExport } from './export'

const create = URL.createObjectURL
const revoke = URL.revokeObjectURL
const click = HTMLAnchorElement.prototype.click

let downloads: { name: string; text: Promise<string> }[]
let pending: Blob | null

beforeEach(() => {
  downloads = []
  pending = null
  URL.createObjectURL = (blob: Blob | MediaSource) => {
    pending = blob as Blob
    return 'blob:export'
  }
  URL.revokeObjectURL = () => {}
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    downloads.push({ name: this.download, text: (pending as Blob).text() })
  }
})

afterEach(() => {
  URL.createObjectURL = create
  URL.revokeObjectURL = revoke
  HTMLAnchorElement.prototype.click = click
})

it('describes the browser as the platform and reports reminders as unavailable', () => {
  const diagnostics = buildDiagnostics()
  expect(diagnostics.app).toMatchObject({
    version: '1.0.0',
    platform: 'web',
    device: 'Browser',
    osVersion: navigator.userAgent,
  })
  expect(diagnostics.reminders).toEqual({ permission: 'unavailable', pending: [] })
})

it('downloads the export as ihsaanly-data.json, pretty-printed', async () => {
  downloadExport()
  expect(downloads.map((entry) => entry.name)).toEqual(['ihsaanly-data.json'])
  const text = (await downloads[0]?.text) ?? ''
  expect(text).toContain('\n  ')
  const { exportedAt, ...saved } = JSON.parse(text)
  const { exportedAt: _later, ...current } = JSON.parse(JSON.stringify(buildExport()))
  expect(Date.parse(exportedAt)).not.toBeNaN()
  expect(saved).toEqual(current)
  expect(saved.format).toBe('ihsaanly-export')
})

it('downloads a diagnostics bundle as ihsaanly-diagnostics.json', async () => {
  const diagnostics = buildDiagnostics()
  downloadDiagnostics(diagnostics)
  expect(downloads.map((entry) => entry.name)).toEqual(['ihsaanly-diagnostics.json'])
  expect(JSON.parse((await downloads[0]?.text) ?? '')).toEqual(
    JSON.parse(JSON.stringify(diagnostics)),
  )
})
