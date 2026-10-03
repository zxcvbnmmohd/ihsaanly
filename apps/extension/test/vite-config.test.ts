import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { THEME_SCRIPT } from '@ihsaanly/web/theme'
import config from '../vite.config'

interface TestPlugin {
  name: string
  generateBundle?: (this: { emitFile: (file: unknown) => void }) => void
  configResolved?: (resolved: { mode: string; build: { outDir: string } }) => void
  writeBundle?: () => void
}

const plugins = (config.plugins ?? []).flat() as TestPlugin[]
function plugin(name: string): TestPlugin {
  const found = plugins.find((candidate) => candidate?.name === name)
  if (!found) throw new Error(`no plugin ${name}`)
  return found
}

const savedEnv = process.env.VITE_APP_ENV
afterEach(() => {
  if (savedEnv === undefined) delete process.env.VITE_APP_ENV
  else process.env.VITE_APP_ENV = savedEnv
})

describe('vite config', () => {
  it('builds the popup page and the service worker as separate entries', () => {
    const rolldown = config.build?.rolldownOptions
    expect(rolldown?.input).toEqual({ popup: 'popup.html', background: 'src/background.ts' })
  })

  it('names the worker by the fixed path the manifest uses, and hashes everything else', () => {
    const output = config.build?.rolldownOptions?.output
    const entryFileNames = (output as { entryFileNames: (chunk: { name: string }) => string })
      .entryFileNames
    expect(entryFileNames({ name: 'background' })).toBe('background.js')
    expect(entryFileNames({ name: 'popup' })).toBe('assets/[name]-[hash].js')
  })

  it('resolves ~/ to src', () => {
    const aliases = (config.resolve ?? {}).alias as { find: RegExp; replacement: string }[]
    const [alias] = aliases
    expect('~/routes/index'.replace(alias?.find as RegExp, alias?.replacement ?? '')).toEndWith(
      '/apps/extension/src/routes/index',
    )
  })

  it('ships the pre-paint theme script as its own file, since MV3 allows no inline script', () => {
    const emitted: unknown[] = []
    plugin('ihsaanly:theme-script').generateBundle?.call({ emitFile: (file) => emitted.push(file) })
    expect(emitted).toEqual([{ type: 'asset', fileName: 'theme.js', source: THEME_SCRIPT }])
  })
})

describe('beta manifest', () => {
  function build(env: string | undefined, mode: string): { manifest: Record<string, unknown> } {
    const outDir = mkdtempSync(join(tmpdir(), 'ihsaanly-ext-'))
    const file = join(outDir, 'manifest.json')
    writeFileSync(
      file,
      JSON.stringify({
        name: 'Ihsaanly',
        version: '1.2.3',
        action: { default_popup: 'popup.html' },
      }),
    )
    if (env === undefined) delete process.env.VITE_APP_ENV
    else process.env.VITE_APP_ENV = env

    const beta = plugin('ihsaanly:beta-manifest')
    beta.configResolved?.({ mode, build: { outDir } })
    beta.writeBundle?.()
    return { manifest: JSON.parse(readFileSync(file, 'utf8')) }
  }

  it('is named Ihsaanly Beta in a development build, and keeps its version', () => {
    const { manifest } = build('development', 'production')
    expect(manifest).toEqual({
      name: 'Ihsaanly Beta',
      version: '1.2.3',
      action: { default_popup: 'popup.html', default_title: 'Ihsaanly Beta' },
    })
  })

  it('treats a development mode as a beta when no environment is given', () => {
    expect(build(undefined, 'development').manifest.name).toBe('Ihsaanly Beta')
  })

  it('leaves the production manifest alone', () => {
    const { manifest } = build('production', 'production')
    expect(manifest).toEqual({
      name: 'Ihsaanly',
      version: '1.2.3',
      action: { default_popup: 'popup.html' },
    })
    expect(build(undefined, 'production').manifest.name).toBe('Ihsaanly')
  })
})
