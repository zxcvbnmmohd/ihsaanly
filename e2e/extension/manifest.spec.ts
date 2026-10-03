import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { distDir, type Manifest, readManifest } from './builds.ts'
import { expect, test } from './fixtures.ts'

const manifest = (): Manifest => readManifest('local')

test('manifest declares an MV3 popup, service worker, permissions and icons', async () => {
  const m = manifest()
  expect(m.manifest_version).toBe(3)
  expect(m.action.default_popup).toBe('popup.html')
  expect(m.background).toEqual({ service_worker: 'background.js', type: 'module' })
  expect(m.permissions).toEqual(expect.arrayContaining(['alarms', 'notifications', 'storage']))
  for (const icon of Object.values<string>(m.icons)) {
    expect(readFileSync(join(distDir('local'), icon)).length).toBeGreaterThan(0)
  }
})

// Chrome reserves keyboard shortcuts for the browser UI, so Playwright cannot
// press Alt+Shift+I to open the action popup. We assert it is declared, and
// that Chrome registered the command with the extension.
test('the Alt+Shift+I shortcut is declared as the action command', async () => {
  expect(manifest().commands._execute_action?.suggested_key.default).toBe('Alt+Shift+I')
})

test('the registered commands include the action command (chrome.commands)', async ({ worker }) => {
  const commands = await worker.evaluate(() => chrome.commands.getAll())
  const action = commands.find((c: { name: string }) => c.name === '_execute_action')
  expect(action).toBeDefined()
})
