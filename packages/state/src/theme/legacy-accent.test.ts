import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { ThemePreference } from '@ihsaanly/ui/types'
import { resetStorage } from '../../test/storage'

const backend = await import('../storage/backend')
const { migratedAppearance, migrateLegacyAccent } = await import('./legacy-accent')

describe('migratedAppearance', () => {
  it('lands a named accent on its theme in the scheme it was used with', () => {
    expect(migratedAppearance('dark', 'amber')).toBe('obsidian')
    expect(migratedAppearance('light', 'amber')).toBe('ivory')
    expect(migratedAppearance('dark', 'plum')).toBe('dusk')
    expect(migratedAppearance('light', 'denim')).toBe('sky')
    expect(migratedAppearance('dark', 'clay')).toBe('espresso')
    expect(migratedAppearance('light', 'teal')).toBe('sage')
  })

  it('keeps System, and drops the accent, since a theme would fix the scheme', () => {
    expect(migratedAppearance('system', 'sage')).toBe('system')
  })

  it('keeps the appearance for Terracotta, no accent or one it does not know', () => {
    expect(migratedAppearance('dark', 'terracotta')).toBe('dark')
    expect(migratedAppearance('light', null)).toBe('light')
    expect(migratedAppearance('light', 'chartreuse')).toBe('light')
  })

  it('leaves a theme already chosen alone', () => {
    expect(migratedAppearance('midnight', 'rose')).toBe('midnight')
  })
})

describe('migrateLegacyAccent', () => {
  beforeEach(resetStorage)

  it('does nothing when no accent was ever stored', () => {
    const set = mock((_preference: ThemePreference) => {})
    migrateLegacyAccent(() => 'dark', set)
    expect(set).not.toHaveBeenCalled()
  })

  it('writes the mapped theme through the host and forgets the accent', () => {
    backend.writePreferenceRow('accent', '"sage"')
    const set = mock((_preference: ThemePreference) => {})
    migrateLegacyAccent(() => 'dark', set)
    expect(set).toHaveBeenCalledWith('forest')
    expect(backend.readPreferenceRow('accent')).toBeNull()
  })

  it('forgets an accent that changes nothing, without writing', () => {
    backend.writePreferenceRow('accent', '"indigo"')
    const set = mock((_preference: ThemePreference) => {})
    migrateLegacyAccent(() => 'system', set)
    expect(set).not.toHaveBeenCalled()
    expect(backend.readPreferenceRow('accent')).toBeNull()
  })

  it('forgets a row that is not a name', () => {
    backend.writePreferenceRow('accent', '42')
    const set = mock((_preference: ThemePreference) => {})
    migrateLegacyAccent(() => 'light', set)
    expect(set).not.toHaveBeenCalled()
    expect(backend.readPreferenceRow('accent')).toBeNull()
  })
})
