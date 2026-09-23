'use no memo'

import type { ReactElement } from 'react'
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget'

import { assertNever } from '@/assert-never'

import type { WidgetInk, WidgetModel } from '../model'
import { WIDGET_NAMES, type WidgetName } from '../names'
import { AlsoTodayWidget } from './also-today-widget'
import { ComingUpWidget } from './coming-up-widget'
import { DuaOfTheDayWidget } from './dua-of-the-day-widget'
import { HijriDateWidget } from './hijri-date-widget'
import { MakeUpWidget } from './make-up-widget'
import { NextPrayerWidget } from './next-prayer-widget'
import { PrayersWidget } from './prayers-widget'
import { QuickDuasWidget } from './quick-duas-widget'
import { RightNowWidget } from './right-now-widget'
import { UpNextWidget } from './up-next-widget'
import { Stale, layoutFor, paintFor, type WidgetProps } from './parts'

function isWidgetName(name: string): name is WidgetName {
  return WIDGET_NAMES.some((known) => known === name)
}

function widgetFor(name: WidgetName, props: WidgetProps): ReactElement {
  switch (name) {
    case 'RightNowWidget':
      return <RightNowWidget {...props} />
    case 'NextPrayerWidget':
      return <NextPrayerWidget {...props} />
    case 'PrayersWidget':
      return <PrayersWidget {...props} />
    case 'HijriDateWidget':
      return <HijriDateWidget {...props} />
    case 'UpNextWidget':
      return <UpNextWidget {...props} />
    case 'AlsoTodayWidget':
      return <AlsoTodayWidget {...props} />
    case 'QuickDuasWidget':
      return <QuickDuasWidget {...props} />
    case 'DuaOfTheDayWidget':
      return <DuaOfTheDayWidget {...props} />
    case 'MakeUpWidget':
      return <MakeUpWidget {...props} />
    case 'ComingUpWidget':
      return <ComingUpWidget {...props} />
    default:
      return assertNever(name)
  }
}

function tree(info: WidgetInfo, model: WidgetModel, ink: WidgetInk): ReactElement {
  const paint = paintFor(ink)
  if (model.stale || !isWidgetName(info.widgetName)) return <Stale model={model} paint={paint} />
  return widgetFor(info.widgetName, { model, paint, layout: layoutFor(info) })
}

/**
 * Both schemes, every time. The library draws each to a bitmap and places
 * them in `layout/` and `layout-night/`, so the launcher picks one from the
 * system's night mode — the scheme the home screen is in, which is what a
 * widget should match, rather than the app's own override.
 */
export function representation(info: WidgetInfo, model: WidgetModel): WidgetRepresentation {
  return { light: tree(info, model, model.ink.light), dark: tree(info, model, model.ink.dark) }
}
