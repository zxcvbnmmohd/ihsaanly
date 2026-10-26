import { describe, expect, it, mock } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Dropdown } from './dropdown'

// `?native` loads the native file itself: the preload only swaps a `.web` sibling in for the
// plain path. A template, so TypeScript does not look for a module of that name.
const NATIVE = '.tsx?native'

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

describe('Dropdown (web)', () => {
  it('is a labelled select showing the current value, reporting a new one', async () => {
    const onChange = mock((_value: string) => {})
    const { user } = renderScreen(
      <Dropdown label="Theme" value="light" options={options} onChange={onChange} accent="#a00" />,
    )
    const select = screen.getByRole('combobox', { name: 'Theme' })
    expect(select).toHaveValue('light')
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Light', 'Dark'])
    await user.selectOptions(select, 'dark')
    expect(onChange).toHaveBeenCalledWith('dark')
  })
})

describe('Dropdown (native)', () => {
  const load = async (): Promise<typeof Dropdown> => (await import(`./dropdown${NATIVE}`)).Dropdown

  it('shows the current value and opens the options in a sheet', async () => {
    const Native = await load()
    const onChange = mock((_value: string) => {})
    const { user } = renderScreen(
      <Native label="Theme" value="light" options={options} onChange={onChange} />,
    )
    const field = screen.getByRole('button', { name: 'Theme' })
    expect(within(field).getByText('Light')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(field)
    const sheet = screen.getByRole('dialog', { name: 'Theme' })
    expect(within(sheet).getByRole('radio', { name: 'Light' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(within(sheet).getByRole('radio', { name: 'Dark' }))
    expect(onChange).toHaveBeenCalledWith('dark')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('draws an option’s swatch in the field and beside it in the list', async () => {
    const Native = await load()
    const swatched = [
      { value: 'obsidian', label: 'Obsidian', swatch: [{ ground: '#0b0b0c', mark: '#e3b65e' }] },
      {
        value: 'system',
        label: 'System',
        swatch: [
          { ground: '#f7f0e9', mark: '#a94a32' },
          { ground: '#1b1411', mark: '#e28c6f' },
        ],
      },
      { value: 'plain', label: 'Plain' },
    ] as const
    const { user } = renderScreen(
      <Native label="Theme" value="obsidian" options={swatched} onChange={() => {}} />,
    )
    const field = screen.getByRole('button', { name: 'Theme' })
    expect(within(field).getByTestId('dropdown-swatch').children).toHaveLength(1)
    expect(
      (within(field).getByTestId('dropdown-swatch').firstElementChild as HTMLElement).style
        .backgroundColor,
    ).toBe('rgba(11, 11, 12, 1.00)')
    await user.click(field)
    const sheet = screen.getByRole('dialog', { name: 'Theme' })
    const system = within(sheet).getByRole('radio', { name: 'System' })
    expect(within(system).getByTestId('dropdown-swatch').children).toHaveLength(2)
    expect(
      within(within(sheet).getByRole('radio', { name: 'Plain' })).queryByTestId('dropdown-swatch'),
    ).toBeNull()
  })

  it('closes without a change when the current value is chosen again', async () => {
    const Native = await load()
    const onChange = mock((_value: string) => {})
    const { user } = renderScreen(
      <Native label="Theme" value="dark" options={options} onChange={onChange} />,
      { scheme: 'dark' },
    )
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes from the sheet without a choice', async () => {
    const Native = await load()
    const onChange = mock((_value: string) => {})
    const { user, strings } = renderScreen(
      <Native label="Theme" value="dark" options={options} onChange={onChange} />,
    )
    await user.click(screen.getByRole('button', { name: 'Theme' }))
    await user.click(screen.getByRole('button', { name: strings.panel.close }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('uses the iOS page sheet, closed by a choice or its close button', async () => {
    const Native = await load()
    const onChange = mock((_value: string) => {})
    process.env.EXPO_OS = 'ios'
    try {
      const { user, strings } = renderScreen(
        <Native label="Theme" value="light" options={options} onChange={onChange} />,
      )
      await user.click(screen.getByRole('button', { name: 'Theme' }))
      expect(screen.getByRole('heading', { name: 'Theme' })).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).toBeNull()
      await user.click(screen.getByRole('button', { name: strings.panel.close }))
      expect(screen.queryByRole('heading', { name: 'Theme' })).toBeNull()

      await user.click(screen.getByRole('button', { name: 'Theme' }))
      await user.click(screen.getByRole('radio', { name: 'Dark' }))
      expect(onChange).toHaveBeenCalledWith('dark')
      expect(screen.queryByRole('heading', { name: 'Theme' })).toBeNull()
    } finally {
      process.env.EXPO_OS = 'web'
    }
  })
})
