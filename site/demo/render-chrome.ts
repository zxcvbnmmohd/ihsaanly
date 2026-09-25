// The native chrome the app never draws itself: a Material 3 status bar, top
// app bar and bottom navigation. AGENTS.md is explicit that the real tab bar
// is native and never reimplemented in JS — this is the demo's stand-in for
// that native chrome, not a claim that the app has a JS tab bar.

import { el, mount } from './dom'
import {
  iconBack,
  iconBattery,
  iconLibrary,
  iconMore,
  iconSignal,
  iconToday,
  iconWifi,
} from './icons'
import type { DemoTab } from './state'
import type { Strings } from '@/strings/en'

export interface ChromeHandlers {
  onSelectTab: (tab: DemoTab) => void
  onBack: () => void
}

/** The Android status bar: time on the left, signal/wifi/battery on the right. */
export function renderStatusBar(container: HTMLElement, time: string): void {
  mount(
    container,
    el('span', { className: 'demo-statusbar-time', text: time }),
    el('span', { className: 'demo-camera' }),
    el('span', {
      className: 'demo-statusbar-icons',
      children: [
        el('span', { className: 'demo-statusbar-icon', html: iconSignal() }),
        el('span', { className: 'demo-statusbar-icon', html: iconWifi() }),
        el('span', { className: 'demo-statusbar-icon', html: iconBattery() }),
      ],
    }),
  )
}

export function renderNav(
  container: HTMLElement,
  title: string,
  showBack: boolean,
  strings: Strings,
  handlers: ChromeHandlers,
): void {
  const back = showBack
    ? el('button', {
        className: 'demo-back',
        attrs: { type: 'button', 'aria-label': strings.onboarding.back },
        html: iconBack(),
        onClick: handlers.onBack,
      })
    : null

  mount(
    container,
    el('div', {
      className: 'demo-nav-row',
      children: [back, el('h2', { className: 'demo-nav-title-android', text: title })],
    }),
  )
}

interface TabDef {
  tab: DemoTab
  label: string
  icon: string
}

function tabsFor(strings: Strings): TabDef[] {
  return [
    { tab: 'today', label: strings.tabs.today, icon: iconToday() },
    { tab: 'library', label: strings.tabs.library, icon: iconLibrary() },
    { tab: 'more', label: strings.tabs.more, icon: iconMore() },
  ]
}

export function renderTabBar(
  container: HTMLElement,
  active: DemoTab,
  strings: Strings,
  tabsLabel: string,
  handlers: ChromeHandlers,
): void {
  const buttons = tabsFor(strings).map((def) => {
    const selected = def.tab === active
    return el('button', {
      className: `demo-tab${selected ? ' is-active' : ''}`,
      attrs: {
        type: 'button',
        role: 'tab',
        'aria-selected': String(selected),
        tabindex: selected ? '0' : '-1',
      },
      onClick: () => handlers.onSelectTab(def.tab),
      children: [
        el('span', { className: 'demo-tab-icon', html: def.icon }),
        el('span', { className: 'demo-tab-label', text: def.label }),
      ],
    })
  })

  mount(
    container,
    el('div', {
      className: 'demo-tabbar-inner',
      attrs: { role: 'tablist', 'aria-label': tabsLabel },
      children: buttons,
    }),
  )
}
