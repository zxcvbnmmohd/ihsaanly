import { beforeEach, describe, expect, it, mock } from 'bun:test'

type Mod = (config: Record<string, unknown>) => Record<string, unknown>
type Config = { modResults: Record<string, unknown> } & Record<string, unknown>

/** Records each colour / style the plugin assigns, and runs every mod callback on a fake result. */
const colours: Record<string, Record<string, string>> = { day: {}, night: {} }
const styles: { add: boolean; parent: unknown; name: string; value: string }[] = []
const manifestMods: ((config: Config) => Config)[] = []

mock.module('expo/config-plugins', () => ({
  AndroidConfig: {
    Colors: {
      assignColorValue: (
        results: Record<string, unknown>,
        { name, value }: { name: string; value: string },
      ) => ({
        ...results,
        [name]: value,
      }),
    },
    Styles: {
      getAppThemeGroup: () => 'AppTheme',
      assignStylesValue: (results: Record<string, unknown>, entry: (typeof styles)[number]) => {
        styles.push(entry)
        return { ...results, styled: true }
      },
    },
  },
  withAndroidColors: (config: Config, apply: Mod) => {
    colours.day = (apply({ modResults: {} }).modResults as Record<string, string>) ?? {}
    return config
  },
  withAndroidColorsNight: (config: Config, apply: Mod) => {
    colours.night = (apply({ modResults: {} }).modResults as Record<string, string>) ?? {}
    return config
  },
  withAndroidStyles: (config: Config, apply: Mod) => {
    apply({ modResults: {} })
    return config
  },
  withAndroidManifest: (config: Config, apply: (config: Config) => Config) => {
    manifestMods.push(apply)
    return config
  },
}))

const withTweaks = (await import('./with-android-manifest.js')).default as unknown as (
  config: Config,
) => Config

function manifestWith(application: unknown): Config {
  return { modResults: { manifest: { application } } }
}

async function applyManifest(application: unknown): Promise<Config> {
  manifestMods.length = 0
  withTweaks({ modResults: {} })
  const mod = manifestMods[0]
  if (!mod) throw new Error('withAndroidManifest was not used')
  return mod(manifestWith(application))
}

beforeEach(() => {
  styles.length = 0
})

describe('accent', () => {
  it('sets colorAccent to the brand accent in light and dark so native dialogs are not teal', () => {
    withTweaks({ modResults: {} })
    expect(colours.day).toEqual({ colorAccent: '#a94a32' })
    expect(colours.night).toEqual({ colorAccent: '#e28c6f' })
  })

  it('points the app theme at the colour resource', () => {
    withTweaks({ modResults: {} })
    expect(styles).toEqual([
      { add: true, parent: 'AppTheme', name: 'colorAccent', value: '@color/colorAccent' },
    ])
  })
})

describe('manifest', () => {
  const activity = (changes?: string): { $: Record<string, string> } => ({
    $: {
      'android:name': '.MainActivity',
      ...(changes ? { 'android:configChanges': changes } : {}),
    },
  })

  it('turns on RTL support', async () => {
    const application = { $: {} as Record<string, string>, activity: [] }
    await applyManifest([application])
    expect(application.$['android:supportsRtl']).toBe('true')
  })

  it('stops MainActivity handling uiMode so a night-mode change recreates it', async () => {
    const main = activity('keyboard|keyboardHidden|uiMode|orientation')
    await applyManifest([{ $: {}, activity: [{ $: { 'android:name': '.Other' } }, main] }])
    expect(main.$['android:configChanges']).toBe('keyboard|keyboardHidden|orientation')
  })

  it('leaves MainActivity alone when it declares no configChanges', async () => {
    const main = activity()
    await applyManifest([{ $: {}, activity: [main] }])
    expect(main.$).toEqual({ 'android:name': '.MainActivity' })
  })

  it('tolerates a manifest with no application or no activities', async () => {
    await expect(applyManifest(undefined)).resolves.toBeDefined()
    await expect(applyManifest([{ $: {} }])).resolves.toBeDefined()
  })
})
