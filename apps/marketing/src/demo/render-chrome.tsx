// The native chrome the app never draws itself: a Material 3 status bar, top
// app bar and bottom navigation. AGENTS.md is explicit that the real tab bar
// is native and never reimplemented in JS — this is the demo's stand-in for
// that native chrome, not a claim that the app has a JS tab bar.

import type { Strings } from '@ihsaanly/core/strings/en'
import { IconBack, IconLibrary, IconMore, IconSearch, IconToday } from '@ihsaanly/web/icons'
import type { KeyboardEvent, ReactNode } from 'react'
import { cx } from './class-names'
import { IconBattery, IconSignal, IconWifi } from './icons'
import type { DemoTab } from './state'

export interface ChromeHandlers {
  onSelectTab: (tab: DemoTab) => void
  onBack: () => void
}

export interface StatusBarProps {
  time: string
}

/** The Android status bar: time on the start side, signal/wifi/battery on the end. */
export function StatusBar({ time }: StatusBarProps): ReactNode {
  return (
    <div className="demo-statusbar" aria-hidden="true">
      <span className="demo-statusbar-time">{time}</span>
      <span className="demo-camera" />
      <span className="demo-statusbar-icons">
        <span className="demo-statusbar-icon">
          <IconSignal />
        </span>
        <span className="demo-statusbar-icon">
          <IconWifi />
        </span>
        <span className="demo-statusbar-icon">
          <IconBattery />
        </span>
      </span>
    </div>
  )
}

interface NavSearch {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export interface NavProps {
  title: string
  showBack: boolean
  strings: Strings
  handlers: ChromeHandlers
  /** The app puts Library's search in the native app bar, so the demo does too. */
  search?: NavSearch
}

export function Nav({ title, showBack, strings, handlers, search }: NavProps): ReactNode {
  return (
    <div className="demo-nav">
      <div className="demo-nav-row">
        {showBack ? (
          <button
            type="button"
            className="demo-back"
            aria-label={strings.onboarding.back}
            onClick={handlers.onBack}>
            <IconBack />
          </button>
        ) : null}
        <h2 className="demo-nav-title-android">{title}</h2>
      </div>
      {search ? (
        <label className="demo-search">
          <span className="demo-search-icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            type="search"
            className="demo-search-input"
            value={search.value}
            placeholder={search.placeholder}
            aria-label={search.placeholder}
            onChange={(event) => search.onChange(event.target.value)}
          />
        </label>
      ) : null}
    </div>
  )
}

interface TabDef {
  tab: DemoTab
  label: string
  icon: ReactNode
}

function tabsFor(strings: Strings): TabDef[] {
  return [
    { tab: 'today', label: strings.tabs.today, icon: <IconToday /> },
    { tab: 'library', label: strings.tabs.library, icon: <IconLibrary /> },
    { tab: 'more', label: strings.tabs.more, icon: <IconMore /> },
  ]
}

export interface TabBarProps {
  active: DemoTab
  strings: Strings
  tabsLabel: string
  handlers: ChromeHandlers
}

/** The panel the tabs control, so aria-controls and aria-labelledby point at real ids. */
export const TABPANEL_ID = 'demo-tabpanel'
export const tabId = (tab: DemoTab): string => `demo-tab-${tab}`

/** Arrow keys move between tabs (Left/Right follow the reading direction), Home/End jump. */
function onTabKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  tabs: TabDef[],
  active: DemoTab,
  onSelectTab: (tab: DemoTab) => void,
): void {
  const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
  const index = tabs.findIndex((def) => def.tab === active)
  const step = (delta: number): number => (index + delta + tabs.length) % tabs.length
  let next: number
  if (event.key === 'ArrowRight') next = step(rtl ? -1 : 1)
  else if (event.key === 'ArrowLeft') next = step(rtl ? 1 : -1)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = tabs.length - 1
  else return
  event.preventDefault()
  const target = tabs[next]
  if (!target) return
  onSelectTab(target.tab)
  event.currentTarget.querySelector<HTMLElement>(`[data-demo-tab="${target.tab}"]`)?.focus()
}

export function TabBar({ active, strings, tabsLabel, handlers }: TabBarProps): ReactNode {
  const tabs = tabsFor(strings)
  return (
    <div
      className="demo-tabbar-inner"
      role="tablist"
      aria-label={tabsLabel}
      onKeyDown={(event) => onTabKeyDown(event, tabs, active, handlers.onSelectTab)}>
      {tabs.map((def) => {
        const selected = def.tab === active
        return (
          <button
            key={def.tab}
            type="button"
            role="tab"
            id={tabId(def.tab)}
            aria-controls={TABPANEL_ID}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            data-demo-tab={def.tab}
            className={cx('demo-tab', selected && 'is-active')}
            onClick={() => handlers.onSelectTab(def.tab)}>
            <span className="demo-tab-icon">{def.icon}</span>
            <span className="demo-tab-label">{def.label}</span>
          </button>
        )
      })}
    </div>
  )
}
