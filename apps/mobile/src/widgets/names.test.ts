import { describe, expect, it } from 'bun:test'
import { GALLERY_WIDGETS, LOCK_FAMILIES_BY_WIDGET } from '@ihsaanly/ui/components/widget-preview'

import appJson from '../../app.json'
import { WIDGET_NAMES } from './names'

interface WidgetsPlugin {
  widgets: { name: string; ios: { supportedFamilies: string[] } }[]
}

describe('WIDGET_NAMES', () => {
  it('lists ten distinct widgets', () => {
    expect(WIDGET_NAMES).toHaveLength(10)
    expect(new Set(WIDGET_NAMES).size).toBe(10)
  })

  it('names each one like its component, ending in Widget', () => {
    for (const name of WIDGET_NAMES) expect(name).toMatch(/^[A-Z][A-Za-z]+Widget$/)
  })
})

describe('the widget gallery', () => {
  it('lists the same widgets in the same order', () => {
    expect(
      GALLERY_WIDGETS.map((widget) => `${widget.charAt(0).toUpperCase()}${widget.slice(1)}`),
    ).toEqual(WIDGET_NAMES.map((name) => name.replace(/Widget$/, '')))
  })

  it('offers on the Lock Screen exactly the families each widget declares in app.json', () => {
    const plugin = (appJson.expo.plugins as unknown[]).find(
      (entry): entry is [string, WidgetsPlugin] =>
        Array.isArray(entry) && entry[0] === 'expo-widgets',
    )
    const declared = new Map(
      (plugin?.[1].widgets ?? []).map((widget) => [widget.name, widget.ios.supportedFamilies]),
    )
    GALLERY_WIDGETS.forEach((widget, index) => {
      const lock = (declared.get(WIDGET_NAMES[index] ?? '') ?? [])
        .filter((family) => family.startsWith('accessory'))
        .map((family) => family.replace('accessory', '').toLowerCase())
      expect<string[]>([...LOCK_FAMILIES_BY_WIDGET[widget]].sort()).toEqual(lock.sort())
    })
  })
})
