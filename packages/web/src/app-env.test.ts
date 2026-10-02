import { describe, expect, test } from 'bun:test'
import { resolveAppEnv, robotsTxt } from './app-env.ts'

describe('resolveAppEnv', () => {
  test('an explicit value wins over the build kind', () => {
    expect(resolveAppEnv('development', false)).toBe('development')
    expect(resolveAppEnv(' production ', true)).toBe('production')
  })

  test('unset or unknown falls back to the build kind', () => {
    expect(resolveAppEnv(undefined)).toBe('production')
    expect(resolveAppEnv('', true)).toBe('development')
    expect(resolveAppEnv('staging', false)).toBe('production')
  })
})

describe('robotsTxt', () => {
  test('development blocks everything and names no sitemap', () => {
    const robots = robotsTxt('development', 'https://dev.ihsaanly.app/sitemap.xml')
    expect(robots).toContain('Disallow: /')
    expect(robots).not.toContain('Sitemap:')
  })

  test('production allows everything, with the sitemap when given', () => {
    expect(robotsTxt('production', 'https://ihsaanly.app/sitemap.xml')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://ihsaanly.app/sitemap.xml\n',
    )
    expect(robotsTxt('production')).toBe('User-agent: *\nAllow: /\n')
  })
})
