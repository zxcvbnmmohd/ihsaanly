import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { Platform } from 'react-native'
import { installReminderFakes, fake as reminders, resetReminderFakes } from '../../test/reminders'

const files = {
  written: [] as { uri: string; contents: string }[],
  deleted: [] as string[],
  writeOrder: [] as string[],
  deleteThrows: false,
  writeDelay: false,
}
const sharing = {
  available: true,
  shared: [] as { uri: string; options: unknown }[],
  shareThrows: false,
}
const device = { manufacturer: 'Google' as string | null, modelName: 'Pixel 9' as string | null }

function install(): void {
  installReminderFakes()
  mock.module('expo-device', () => ({
    get manufacturer() {
      return device.manufacturer
    },
    get modelName() {
      return device.modelName
    },
  }))
  mock.module('expo-file-system', () => ({
    Paths: { cache: 'file:///cache' },
    File: class {
      uri: string
      constructor(dir: string, name: string) {
        this.uri = `${dir}/${name}`
      }
      async write(contents: string): Promise<void> {
        if (files.writeDelay) await new Promise((resolve) => setTimeout(resolve, 5))
        files.written.push({ uri: this.uri, contents })
        files.writeOrder.push('write')
      }
      delete(): void {
        if (files.deleteThrows) throw new Error('cannot delete')
        files.deleted.push(this.uri)
      }
    },
  }))
  mock.module('expo-sharing', () => ({
    isAvailableAsync: async () => sharing.available,
    shareAsync: async (uri: string, options: unknown) => {
      files.writeOrder.push('share')
      if (sharing.shareThrows) throw new Error('share failed')
      sharing.shared.push({ uri, options })
    },
  }))
}

install()
const exporter = await import('./export')

const originalVersion = Object.getOwnPropertyDescriptor(Platform, 'Version')

afterAll(() => {
  Platform.OS = 'web'
  if (originalVersion) Object.defineProperty(Platform, 'Version', originalVersion)
})

beforeEach(() => {
  resetReminderFakes()
  install()
  files.written = []
  files.deleted = []
  files.writeOrder = []
  files.deleteThrows = false
  files.writeDelay = false
  sharing.available = true
  sharing.shared = []
  sharing.shareThrows = false
  device.manufacturer = 'Google'
  device.modelName = 'Pixel 9'
  Platform.OS = 'android' as never
  Object.defineProperty(Platform, 'Version', {
    get: () => 35,
    configurable: true,
    enumerable: true,
  })
})

describe('buildDiagnostics', () => {
  it('describes the app, the device and the reminders without any content', async () => {
    reminders.permissions = { granted: true, canAskAgain: true }
    reminders.scheduled = [
      { identifier: 'plan:a', content: { title: 'private' }, trigger: { value: 0 } },
    ]
    const diagnostics = await exporter.buildDiagnostics()
    const text = JSON.stringify(diagnostics)
    expect(text).toContain('1.2.3')
    expect(text).toContain('android')
    expect(text).toContain('35')
    expect(text).toContain('Google Pixel 9')
    expect(text).toContain('granted')
    expect(text).toContain('plan:a')
    expect(text).not.toContain('private')
  })

  it('uses placeholders when the version and device are unknown', async () => {
    reminders.appVersion = undefined
    device.manufacturer = null
    device.modelName = null
    install()
    const text = JSON.stringify(await exporter.buildDiagnostics())
    expect(text).toContain('unknown')
    expect(text).toContain('? ?')
  })
})

describe('shareExport', () => {
  it('writes the whole file before sharing it, shares it as JSON and removes it', async () => {
    files.writeDelay = true
    expect(await exporter.shareExport()).toBe(true)
    expect(files.writeOrder).toEqual(['write', 'share'])
    expect(files.written[0]?.uri).toBe('file:///cache/ihsaanly-data.json')
    expect(() => JSON.parse(files.written[0]?.contents ?? '')).not.toThrow()
    expect(sharing.shared).toEqual([
      { uri: 'file:///cache/ihsaanly-data.json', options: { mimeType: 'application/json' } },
    ])
    expect(files.deleted).toEqual(['file:///cache/ihsaanly-data.json'])
  })

  it('reports false and still removes the file when sharing is unavailable', async () => {
    sharing.available = false
    expect(await exporter.shareExport()).toBe(false)
    expect(sharing.shared).toEqual([])
    expect(files.deleted).toEqual(['file:///cache/ihsaanly-data.json'])
  })

  it('removes the file and rethrows when the share sheet fails', async () => {
    sharing.shareThrows = true
    await expect(exporter.shareExport()).rejects.toThrow('share failed')
    expect(files.deleted).toEqual(['file:///cache/ihsaanly-data.json'])
  })

  it('is not undone by a file that cannot be deleted', async () => {
    files.deleteThrows = true
    expect(await exporter.shareExport()).toBe(true)
  })
})

describe('shareDiagnostics', () => {
  it('shares exactly the bundle it was given', async () => {
    const bundle = { app: 'x', marker: 'the-preview' } as never
    expect(await exporter.shareDiagnostics(bundle)).toBe(true)
    expect(files.written[0]?.uri).toBe('file:///cache/ihsaanly-diagnostics.json')
    expect(JSON.parse(files.written[0]?.contents ?? '')).toEqual({
      app: 'x',
      marker: 'the-preview',
    })
  })
})
