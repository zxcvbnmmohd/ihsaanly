import { describe, expect, test } from 'bun:test'
import type { Plugin } from 'vite'
import { reactNativeWeb, rnWebConfig, WEB_EXTENSIONS } from './vite.ts'

type Resolve = (source: string, importer: string | undefined, options: object) => unknown
// The plugin hooks are typed for Rolldown's plugin context; the tests call them with a stand-in.
interface Hooks {
  resolveId: (this: { resolve: Resolve }, ...args: [string, string | undefined, object]) => unknown
  transform: (code: string, id: string) => { code: string; map: null } | null
}

function plugins(): Plugin[] {
  return (rnWebConfig().plugins ?? []) as Plugin[]
}

describe('reactNativeWeb', () => {
  const hooks = reactNativeWeb() as unknown as Hooks
  const resolved: { source: string; importer: string | undefined; options: object }[] = []
  const context = {
    resolve: (source: string, importer: string | undefined, options: object): string => {
      resolved.push({ source, importer, options })
      return `resolved:${source}`
    },
  }
  const resolveId = (source: string, importer?: string): unknown => {
    resolved.length = 0
    return hooks.resolveId.call(context, source, importer, { isEntry: false })
  }

  test('runs first', () => {
    const plugin = reactNativeWeb()
    expect(plugin.name).toBe('ihsaanly:react-native-web')
    expect(plugin.enforce).toBe('pre')
  })

  test('app code gets react-native-css components, skipping this plugin', () => {
    expect(resolveId('react-native', '/repo/packages/ui/src/a.tsx')).toBe(
      'resolved:react-native-css/components',
    )
    expect(resolved[0]?.options).toEqual({ isEntry: false, skipSelf: true })
    expect(resolveId('react-native', undefined)).toBe('resolved:react-native-css/components')
  })

  test('react-native-css itself gets react-native-web underneath', () => {
    expect(resolveId('react-native', '/n/node_modules/react-native-css/dist/x.js')).toBe(
      'resolved:react-native-web',
    )
  })

  test('the asset registry resolves to react-native-web', () => {
    expect(resolveId('react-native/asset-registry', '/a.ts')).toBe(
      'resolved:react-native-web/dist/modules/AssetRegistry',
    )
  })

  test('other specifiers are left to Vite', () => {
    expect(resolveId('react', '/a.ts')).toBeNull()
    expect(resolved).toEqual([])
  })

  describe('transform', () => {
    const transform = (code: string, id = '/repo/src/a.ts'): ReturnType<Hooks['transform']> =>
      hooks.transform(code, id)

    test('turns image requires into URL imports of the file', () => {
      const result = transform("const a = require('./a.png'); const b = require('../b.jpeg')")
      expect(result?.code).toBe(
        "import __asset0 from './a.png?url'\nimport __asset1 from '../b.jpeg?url'\nconst a = { uri: __asset0 }; const b = { uri: __asset1 }",
      )
      expect(result?.map).toBeNull()
    })

    test('hoists a bare package require into an import', () => {
      const result = transform("const tz = require('city-timezones')")
      expect(result?.code).toBe("import __require0 from 'city-timezones'\nconst tz = __require0")
    })

    test('numbers assets and packages together and leaves relative code requires', () => {
      const result = transform("require('x.svg'); require('pkg'); require('./local')")
      expect(result?.code).toBe(
        "import __asset0 from 'x.svg?url'\nimport __require1 from 'pkg'\n{ uri: __asset0 }; __require1; require('./local')",
      )
    })

    test('ignores node_modules, non-script files and code with nothing to rewrite', () => {
      expect(transform("require('pkg')", '/repo/node_modules/a/b.js')).toBeNull()
      expect(transform("require('pkg')", '/repo/src/a.css')).toBeNull()
      expect(transform('const a = 1')).toBeNull()
      expect(transform("require('./local')")).toBeNull()
    })
  })
})

describe('rnWebConfig', () => {
  test('puts .web files ahead of native ones for the app and the optimizer', () => {
    const config = rnWebConfig()
    expect(WEB_EXTENSIONS.indexOf('.web.tsx')).toBeLessThan(WEB_EXTENSIONS.indexOf('.tsx'))
    expect(config.resolve?.extensions).toBe(WEB_EXTENSIONS)
    expect(config.optimizeDeps?.include).toContain('city-timezones')
  })

  test('defines the Expo globals for production and the optimizer (dev) separately', () => {
    const config = rnWebConfig()
    expect(config.define).toMatchObject({ __DEV__: 'false', 'process.env.EXPO_OS': '"web"' })
    const optimizer = config.optimizeDeps?.rolldownOptions as unknown as {
      transform: { define: object }
    }
    expect(optimizer.transform.define).toMatchObject({ __DEV__: 'true', global: 'globalThis' })
  })

  describe('onLog', () => {
    const build = rnWebConfig().build?.rolldownOptions as unknown as {
      onLog: (level: string, log: { code?: string; id?: string }, handler: unknown) => void
    }
    const onLog = build.onLog

    function run(log: { code?: string; id?: string }): string[] {
      const seen: string[] = []
      onLog('warn', log, (_level: string, forwarded: { code?: string }) =>
        seen.push(forwarded.code ?? ''),
      )
      return seen
    }

    test('hushes the eval warnings from Expo only', () => {
      expect(run({ code: 'EVAL', id: '/x/node_modules/expo/build/a.js' })).toEqual([])
      expect(run({ code: 'EVAL', id: '/x/node_modules/expo-modules-core/b.js' })).toEqual([])
    })

    test('forwards an eval anywhere else, and every other log', () => {
      expect(run({ code: 'EVAL', id: '/x/src/a.js' })).toEqual(['EVAL'])
      expect(run({ code: 'EVAL' })).toEqual(['EVAL'])
      expect(run({ code: 'OTHER', id: '/x/node_modules/expo/a.js' })).toEqual(['OTHER'])
    })
  })

  describe('appEnvDefine', () => {
    const plugin = plugins().find((p) => p.name === 'ihsaanly:app-env') as unknown as {
      config: (
        config: object,
        env: { command: 'build' | 'serve'; mode: string },
      ) => { define: Record<string, string> }
    }
    const define = (command: 'build' | 'serve', mode: string, value?: string): string => {
      const before = process.env.VITE_APP_ENV
      if (value === undefined) delete process.env.VITE_APP_ENV
      else process.env.VITE_APP_ENV = value
      try {
        return plugin.config({}, { command, mode }).define['import.meta.env.VITE_APP_ENV'] ?? ''
      } finally {
        if (before === undefined) delete process.env.VITE_APP_ENV
        else process.env.VITE_APP_ENV = before
      }
    }

    test('is development under vite dev or --mode development, else production', () => {
      expect(define('serve', 'development')).toBe('"development"')
      expect(define('build', 'development')).toBe('"development"')
      expect(define('build', 'production')).toBe('"production"')
    })

    test('an explicit VITE_APP_ENV wins', () => {
      expect(define('serve', 'development', 'production')).toBe('"production"')
      expect(define('build', 'production', 'development')).toBe('"development"')
    })
  })

  test('installs the resolution shim and the env define', () => {
    expect(plugins().map((p) => p.name)).toEqual(['ihsaanly:react-native-web', 'ihsaanly:app-env'])
  })
})
