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
