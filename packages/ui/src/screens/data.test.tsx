import { expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { DataScreen } from './data'
import { dataFixture } from './fixtures'

it('offers export, import, diagnostics and delete', async () => {
  const handlers = {
    onExport: mock(() => {}),
    onImport: mock(() => {}),
    onDiagnostics: mock(() => {}),
    onDelete: mock(() => {}),
  }
  const { user, strings } = renderScreen(<DataScreen {...dataFixture} {...handlers} />)
  expect(screen.getByText(strings.data.explanation)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: named(strings.data.export) }))
  await user.click(screen.getByRole('button', { name: named(strings.data.importing) }))
  await user.click(screen.getByRole('button', { name: named(strings.data.diagnostics) }))
  await user.click(screen.getByRole('button', { name: named(strings.data.delete) }))
  for (const handler of Object.values(handlers)) expect(handler).toHaveBeenCalledTimes(1)
})

it('shows the outcome message only when there is one', () => {
  const { unmount } = renderScreen(<DataScreen {...dataFixture} message="Exported 84 records" />)
  expect(screen.getByText('Exported 84 records')).toBeInTheDocument()
  unmount()
  renderScreen(<DataScreen {...dataFixture} message={null} />)
  expect(screen.queryByText('Exported 84 records')).toBeNull()
})

it('offers crash reports only when the host can send them', async () => {
  const onChange = mock((_on: boolean) => {})
  const { user, strings, unmount } = renderScreen(
    <DataScreen {...dataFixture} crashReports={{ on: false, onChange }} />,
  )
  const toggle = screen.getByRole('switch', { name: strings.data.crashReports })
  expect(toggle).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByText(strings.data.crashReportsDetail)).toBeInTheDocument()
  await user.click(toggle)
  expect(onChange).toHaveBeenCalledWith(true)
  unmount()

  renderScreen(<DataScreen {...dataFixture} />)
  expect(screen.queryByRole('switch', { name: strings.data.crashReports })).toBeNull()
})
