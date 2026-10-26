import { describe, expect, it } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { GALLERY_WIDGETS } from '../components/widget-preview'
import { widgetsFixture } from './fixtures'
import { WidgetsScreen } from './widgets'

describe('the widget gallery', () => {
  it('lists every widget with its purpose, what it does on a tap and a live preview', () => {
    const { strings } = renderScreen(<WidgetsScreen {...widgetsFixture} />)
    const copy = strings.widgetGallery
    for (const widget of GALLERY_WIDGETS) {
      const about = copy.widgets[widget]
      expect(screen.getByRole('heading', { name: about.name })).toBeInTheDocument()
      expect(screen.getByText(about.purpose)).toBeInTheDocument()
      // Also today and Later this week both only open their items.
      expect(screen.getAllByText(about.taps).length).toBeGreaterThan(0)
      expect(screen.getByRole('img', { name: copy.preview(about.name) })).toBeInTheDocument()
    }
    expect(screen.getAllByText(copy.tap)).toHaveLength(GALLERY_WIDGETS.length)
    expect(screen.getByText(copy.intro)).toBeInTheDocument()
    expect(screen.getByText(copy.updates)).toBeInTheDocument()
  })

  it('previews Small Home Screen widgets and the iOS Home Screen steps first', () => {
    const { strings } = renderScreen(<WidgetsScreen {...widgetsFixture} />)
    const copy = strings.widgetGallery
    expect(screen.getByRole('button', { name: copy.homeScreen })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: copy.small })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: copy.howToAdd })).toBeInTheDocument()
    const steps = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toEqual(
      copy.iosHomeSteps.map((step, index) => `${index + 1}${step}`),
    )
  })

  it('switches size, and the previews follow', async () => {
    const { user, strings } = renderScreen(<WidgetsScreen {...widgetsFixture} />)
    expect(screen.queryByText('12 of 33')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.widgetGallery.medium }))
    expect(screen.getByText('12 of 33')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.widgetGallery.large }))
    expect(screen.getByRole('button', { name: strings.widgetGallery.large })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('offers the Lock Screen families and steps on iOS', async () => {
    const { user, strings } = renderScreen(<WidgetsScreen {...widgetsFixture} />)
    const copy = strings.widgetGallery
    await user.click(screen.getByRole('button', { name: copy.lockScreen }))
    expect(screen.queryByRole('button', { name: copy.small })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.circular })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: copy.inline }))
    expect(screen.getByText('Dhuhr · In about 3 hours')).toBeInTheDocument()
    expect(screen.getByText(copy.iosLockSteps[0] ?? '')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.homeScreen }))
    expect(screen.getByText(copy.iosHomeSteps[0] ?? '')).toBeInTheDocument()
  })

  it('has no Lock Screen on Android and gives its own steps', () => {
    const { strings } = renderScreen(<WidgetsScreen {...widgetsFixture} platform="android" />)
    const copy = strings.widgetGallery
    expect(screen.queryByRole('button', { name: copy.lockScreen })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.small })).toBeInTheDocument()
    for (const step of copy.androidSteps) expect(screen.getByText(step)).toBeInTheDocument()
  })

  it('reads in every language', () => {
    const { strings } = renderScreen(<WidgetsScreen {...widgetsFixture} />, { locale: 'ar' })
    expect(screen.getByText(strings.widgetGallery.updates)).toBeInTheDocument()
  })
})
