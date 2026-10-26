import { describe, expect, it } from 'bun:test'
import { paletteFor, scene } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { fireLayout, renderScreen } from '../../test/render'
import {
  APP_NAME,
  AppIcon,
  LOCK_INK,
  LockFrame,
  previewInkFor,
  toneColor,
  WIDGET_POINTS,
  WidgetFrame,
  type WidgetLook,
  WidgetScene,
  WidgetText,
} from './widget-scene'

const palette = paletteFor('light', 'sage')
const ink = previewInkFor(palette)
const ios: WidgetLook = { ink, platform: 'ios', lock: false, scale: 1 }
const android: WidgetLook = { ...ios, platform: 'android' }

function styleOf(element: HTMLElement): CSSStyleDeclaration {
  return window.getComputedStyle(element)
}

describe('the ink', () => {
  it('is the palette the screen already has, mapped as the app maps a widget ink', () => {
    expect(ink).toEqual({
      background: palette.wash[0],
      backgroundEnd: palette.wash[1],
      accent: palette.accent,
      onAccent: palette.onAccent,
      label: palette.ink,
      secondaryLabel: palette.inkSecondary,
    })
  })

  it('paints each tone, and the Lock Screen all in white', () => {
    expect(toneColor(ios, 'accent')).toBe(ink.accent)
    expect(toneColor(ios, 'secondary')).toBe(ink.secondaryLabel)
    expect(toneColor(ios, 'label')).toBe(ink.label)
    const lock: WidgetLook = { ...ios, ink: LOCK_INK, lock: true }
    expect(toneColor(lock, 'accent')).toBe(scene.onWallpaper)
    expect(toneColor(lock, 'label')).toBe(scene.onWallpaper)
    expect(toneColor(lock, 'secondary')).toBe(scene.onWallpaperSecondary)
  })
})

describe('WidgetText', () => {
  it("sets SwiftUI's text styles in points, scaled", () => {
    renderScreen(<WidgetText look={{ ...ios, scale: 0.5 }} text="Tasbih" size="headline" />)
    const text = screen.getByText('Tasbih')
    expect(styleOf(text).fontSize).toBe('8.5px')
    expect(styleOf(text).fontWeight).toBe('600')
  })

  it("takes Android's sizes, and reads semibold as bold there", () => {
    renderScreen(
      <WidgetText look={android} text="Up next" size="caption" tone="accent" weight="semibold" />,
    )
    const text = screen.getByText('Up next')
    expect(styleOf(text).fontSize).toBe('12px')
    expect(styleOf(text).fontWeight).toBe('700')
  })

  it('sets an inline Lock Screen widget in the date line’s type, whatever it asks', () => {
    const look: WidgetLook = { ...ios, ink: LOCK_INK, lock: true, dateLine: true }
    renderScreen(<WidgetText look={look} text="Dhuhr" size="footnote" weight="regular" />)
    expect(styleOf(screen.getByText('Dhuhr')).fontSize).toBe('17px')
    expect(styleOf(screen.getByText('Dhuhr')).fontWeight).toBe('600')
  })

  it('centres Arabic and reads it right to left', () => {
    renderScreen(<WidgetText look={ios} text="سبحان الله" size="title" arabic />)
    expect(styleOf(screen.getByText('سبحان الله')).direction).toBe('rtl')
  })
})

describe('the frames', () => {
  it('draws a Home Screen widget at its size on the phone, scaled', () => {
    renderScreen(
      <WidgetFrame look={{ ...ios, scale: 0.5 }} family="medium">
        <WidgetText look={ios} text="Inside" size="body" />
      </WidgetFrame>,
    )
    const frame = screen.getByTestId('widget-frame')
    expect(styleOf(frame).width).toBe(`${WIDGET_POINTS.medium.width / 2}px`)
    expect(styleOf(frame).height).toBe(`${WIDGET_POINTS.medium.height / 2}px`)
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })

  it("rounds Android's widget plainer and draws it flat", () => {
    renderScreen(
      <WidgetFrame look={android} family="large">
        {null}
      </WidgetFrame>,
    )
    const frame = screen.getByTestId('widget-frame')
    expect(styleOf(frame).borderTopLeftRadius).toBe('22px')
    expect(styleOf(frame).height).toBe(`${WIDGET_POINTS.large.height}px`)
  })

  it('puts the round Lock Screen widget on its disc, the wide one bare', () => {
    const look: WidgetLook = { ...ios, ink: LOCK_INK, lock: true }
    const { rerender } = renderScreen(
      <LockFrame look={look} family="circular">
        {null}
      </LockFrame>,
    )
    expect(styleOf(screen.getByTestId('lock-widget')).width).toBe('76px')
    expect(styleOf(screen.getByTestId('lock-widget')).borderTopLeftRadius).toBe('38px')
    rerender(
      <LockFrame look={look} family="rectangular">
        {null}
      </LockFrame>,
    )
    expect(styleOf(screen.getByTestId('lock-widget')).width).toBe('172px')
    rerender(
      <LockFrame look={look} family="inline">
        <WidgetText look={look} text="One line" size="footnote" />
      </LockFrame>,
    )
    expect(screen.queryByTestId('lock-widget')).not.toBeInTheDocument()
    expect(screen.getByText('One line')).toBeInTheDocument()
  })
})

describe('AppIcon', () => {
  it('draws the real icon at the size asked, with the icon mask’s corner', () => {
    renderScreen(<AppIcon size={64} />)
    const icon = screen.getByTestId('app-icon')
    expect(styleOf(icon).width).toBe('64px')
  })
})

describe('WidgetScene', () => {
  it('labels a Home Screen widget with the app’s name on iOS', () => {
    renderScreen(
      <WidgetScene placement="home" platform="ios" ink={ink} fit={364} appName={APP_NAME} label="A">
        {() => <WidgetText look={ios} text="Widget" size="body" />}
      </WidgetScene>,
    )
    expect(screen.getByRole('img', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByText(APP_NAME)).toBeInTheDocument()
    expect(screen.getByText('Widget')).toBeInTheDocument()
  })

  it('labels nothing on Android, whose launcher does not', () => {
    renderScreen(
      <WidgetScene placement="home" platform="android" ink={ink} fit={364} appName={APP_NAME} />,
    )
    expect(screen.queryByText(APP_NAME)).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('hands its widgets the scale that fits the room it measured, never above 1', () => {
    const scales: number[] = []
    renderScreen(
      <WidgetScene placement="home" platform="ios" ink={ink} fit={364} label="Scene">
        {(scale) => {
          scales.push(scale)
          return null
        }}
      </WidgetScene>,
      { scheme: 'dark' },
    )
    expect(scales.at(-1)).toBe(1)
    const sceneView = screen.getByRole('img', { name: 'Scene' })
    fireLayout(sceneView, 222)
    expect(scales.at(-1)).toBe(0.5)
    fireLayout(sceneView, 222)
    fireLayout(sceneView, 1000)
    expect(scales.at(-1)).toBe(1)
  })

  it('draws the Lock Screen’s date and clock, with an inline widget on the date line', () => {
    renderScreen(
      <WidgetScene
        placement="lock"
        platform="ios"
        ink={ink}
        fit={172}
        date="Wed 23 Sep"
        inline={() => <WidgetText look={ios} text="Dhuhr soon" size="footnote" />}
      />,
    )
    expect(screen.getByText('Wed 23 Sep')).toBeInTheDocument()
    expect(screen.getByText('Dhuhr soon')).toBeInTheDocument()
    expect(screen.getByText('9:41')).toBeInTheDocument()
  })

  it('leaves the date line out when there is no date and no inline widget', () => {
    renderScreen(<WidgetScene placement="lock" platform="ios" ink={ink} fit={172} />)
    expect(screen.getByText('9:41')).toBeInTheDocument()
    expect(screen.queryByText('Wed 23 Sep')).not.toBeInTheDocument()
  })
})
