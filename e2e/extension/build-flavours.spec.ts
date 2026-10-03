import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Flavour, type Manifest, readManifest } from './builds.ts'
import { expect, test } from './fixtures.ts'

const manifestOf = (flavour: Flavour): Manifest => readManifest(flavour)

test.describe('production build', () => {
  test('is named Ihsaanly and its popup has no Beta pill', async ({ openPopup }) => {
    expect(manifestOf('local').name).toBe('Ihsaanly')
    expect(manifestOf('local').action.default_title).toBeUndefined()
    const { page } = await openPopup()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('Beta', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('note')).toHaveCount(0)
  })
})

test.describe('beta build', () => {
  test.use({ flavour: 'beta' })

  test('is named Ihsaanly Beta and shows the Beta pill in the header', async ({ openPopup }) => {
    const manifest = manifestOf('beta')
    expect(manifest.name).toBe('Ihsaanly Beta')
    expect(manifest.action.default_title).toBe('Ihsaanly Beta')
    expect(manifest.version).toBe(manifestOf('local').version)
    const { page } = await openPopup()
    const pill = page.getByRole('note', { name: 'Beta build' })
    await expect(pill).toBeVisible()
    await expect(pill).toHaveText('Beta')
    // Inline in the header, next to the title, on every page.
    await expect(page.locator('header').getByText('Beta', { exact: true })).toBeVisible()
  })
})
