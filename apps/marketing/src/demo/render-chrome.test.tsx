import { describe, expect, mock, test } from 'bun:test'
import { en as strings } from '@ihsaanly/core/strings/en'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Nav, StatusBar, TABPANEL_ID, TabBar, tabId } from './render-chrome'
import type { DemoTab } from './state'

interface Handlers {
  onSelectTab: ReturnType<typeof mock<(tab: DemoTab) => void>>
  onBack: ReturnType<typeof mock<() => void>>
}

function handlers(): Handlers {
  return { onSelectTab: mock((_tab: DemoTab) => {}), onBack: mock(() => {}) }
}

describe('StatusBar', () => {
  test('shows the time and is hidden from assistive technology', () => {
    const { container } = render(<StatusBar time="9:41" />)
    expect(screen.getByText('9:41')).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('svg')).toHaveLength(3)
  })
})

describe('Nav', () => {
  test('a title and nothing else by default', () => {
    render(<Nav title="Today" showBack={false} strings={strings} handlers={handlers()} />)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  test('the back button goes back', async () => {
    const given = handlers()
    render(<Nav title="Item" showBack strings={strings} handlers={given} />)
    await userEvent.click(screen.getByRole('button', { name: strings.onboarding.back }))
    expect(given.onBack).toHaveBeenCalledTimes(1)
  })

  test('the search field reports each change', async () => {
    const onChange = mock((_value: string) => {})
    render(
      <Nav
        title="Library"
        showBack={false}
        strings={strings}
        handlers={handlers()}
        search={{ value: '', placeholder: 'Search', onChange }}
      />,
    )
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'ab')
    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['a', 'b'])
  })
})

describe('TabBar', () => {
  function bar(active: DemoTab = 'today'): Handlers {
    const given = handlers()
    render(<TabBar active={active} strings={strings} tabsLabel="Tabs" handlers={given} />)
    return given
  }

  test('three tabs, the active one selected and focusable', () => {
    bar('library')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      strings.tabs.today,
      strings.tabs.library,
      strings.tabs.more,
    ])
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1])
    expect(tabs[1]).toHaveClass('is-active')
    expect(tabs[0]).not.toHaveClass('is-active')
    expect(screen.getByRole('tablist', { name: 'Tabs' })).toBeInTheDocument()
    for (const tab of tabs) expect(tab).toHaveAttribute('aria-controls', TABPANEL_ID)
    expect(tabs[2]?.id).toBe(tabId('more'))
  })

  test('clicking a tab selects it', async () => {
    const given = bar()
    await userEvent.click(screen.getByRole('tab', { name: strings.tabs.more }))
    expect(given.onSelectTab).toHaveBeenCalledWith('more')
  })

  test('arrow keys follow the reading direction and wrap', () => {
    const given = bar('today')
    const list = screen.getByRole('tablist')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(given.onSelectTab).toHaveBeenLastCalledWith('library')
    fireEvent.keyDown(list, { key: 'ArrowLeft' })
    expect(given.onSelectTab).toHaveBeenLastCalledWith('more')
  })

  test('arrow keys are mirrored in a right-to-left page', () => {
    const given = bar('today')
    const list = screen.getByRole('tablist')
    list.style.direction = 'rtl'
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(given.onSelectTab).toHaveBeenLastCalledWith('more')
    fireEvent.keyDown(list, { key: 'ArrowLeft' })
    expect(given.onSelectTab).toHaveBeenLastCalledWith('library')
  })

  test('Home and End jump to the ends, and the tab takes focus', () => {
    const given = bar('library')
    const list = screen.getByRole('tablist')
    fireEvent.keyDown(list, { key: 'End' })
    expect(given.onSelectTab).toHaveBeenLastCalledWith('more')
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: strings.tabs.more }))
    fireEvent.keyDown(list, { key: 'Home' })
    expect(given.onSelectTab).toHaveBeenLastCalledWith('today')
  })

  test('other keys do nothing and keep their default', () => {
    const given = bar()
    const notPrevented = fireEvent.keyDown(screen.getByRole('tablist'), { key: 'a' })
    expect(notPrevented).toBe(true)
    expect(given.onSelectTab).not.toHaveBeenCalled()
  })

  test('handled keys prevent the page from scrolling', () => {
    bar()
    expect(fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })).toBe(false)
  })
})
