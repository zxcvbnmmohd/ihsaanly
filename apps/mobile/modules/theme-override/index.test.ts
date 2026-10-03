import { expect, it, mock } from 'bun:test'

const asked: string[] = []
const native = { setNightMode: () => {}, getSystemNightMode: () => 'dark' as const }
mock.module('expo', () => ({
  requireOptionalNativeModule: (name: string) => {
    asked.push(name)
    return native
  },
}))

it('looks the optional native ThemeOverride module up once, by name', async () => {
  const { ThemeOverride } = await import('./index')
  expect(asked).toEqual(['ThemeOverride'])
  expect(ThemeOverride).toBe(native as never)
})
