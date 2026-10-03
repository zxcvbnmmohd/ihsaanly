import { expect, it, mock } from 'bun:test'

// Metro's own packages are CommonJS that the web preload's loader hooks would
// rewrite, so the two they provide are replaced; what is under test is how this
// file composes them.
const defaulted: string[] = []
const wrapped: unknown[] = []
const base = { projectRoot: 'base' }
mock.module('expo/metro-config', () => ({
  getDefaultConfig: (root: string) => {
    defaulted.push(root)
    return base
  },
}))
const nativewind = {
  withNativewind: (config: unknown) => {
    wrapped.push(config)
    return { wrapped: config }
  },
}
mock.module('nativewind/metro', () => nativewind)
mock.module(require.resolve('nativewind/metro'), () => nativewind)

it('wraps Expo default Metro config for this app in NativeWind', async () => {
  const exported = (await import('./metro.config.js')).default
  expect(defaulted).toEqual([import.meta.dir])
  expect(wrapped).toEqual([base])
  expect(exported as unknown).toEqual({ wrapped: base })
})
