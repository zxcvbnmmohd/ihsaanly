import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { DiagnosticsScreen, type DiagnosticsScreenProps } from './diagnostics'
import { diagnosticsFixture } from './fixtures'
import { permissionLabel } from './notifications'

function summaryWith(
  change: Partial<NonNullable<DiagnosticsScreenProps['summary']>>,
): DiagnosticsScreenProps {
  return {
    ...diagnosticsFixture,
    summary: {
      ...(diagnosticsFixture.summary as NonNullable<DiagnosticsScreenProps['summary']>),
      ...change,
    },
  }
}

describe('DiagnosticsScreen', () => {
  it('previews exactly what the bundle carries', () => {
    const { strings } = renderScreen(<DiagnosticsScreen {...diagnosticsFixture} />)
    expect(screen.getByText(strings.diagnostics.explanation)).toBeInTheDocument()
    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getByText('Google Pixel 10 Pro XL · android 37')).toBeInTheDocument()
    expect(screen.getByText('51.501, -0.142')).toBeInTheDocument()
    expect(screen.getByText('84')).toBeInTheDocument()
    expect(screen.getByText(strings.diagnostics.failuresDetail(2))).toBeInTheDocument()
    expect(
      screen.getByText(strings.diagnostics.remindersDetail(permissionLabel('granted', strings), 3)),
    ).toBeInTheDocument()
    expect(screen.queryByText(strings.diagnostics.errorIncluded)).toBeNull()
    expect(screen.queryByText('"format"', { exact: false })).toBeNull()
  })

  it('renders nothing but the frame while the bundle is gathered', () => {
    const { container } = renderScreen(<DiagnosticsScreen {...diagnosticsFixture} summary={null} />)
    expect(container.textContent).toBe('')
  })

  it('says when there are no coordinates, no failures, and when an error rides along', () => {
    const { strings } = renderScreen(
      <DiagnosticsScreen
        {...summaryWith({
          coordinates: null,
          failures: { count: 0, latest: null },
          hasError: true,
        })}
      />,
    )
    expect(screen.getByText(strings.diagnostics.noCoordinates)).toBeInTheDocument()
    expect(screen.queryByText(strings.diagnostics.failuresDetail(0))).toBeNull()
    expect(screen.getByText(strings.diagnostics.errorIncluded)).toBeInTheDocument()
  })

  it('toggles the raw bundle', async () => {
    const onToggleRaw = mock(() => {})
    const { user, strings } = renderScreen(
      <DiagnosticsScreen {...diagnosticsFixture} onToggleRaw={onToggleRaw} />,
    )
    await user.click(screen.getByRole('button', { name: strings.diagnostics.showRaw }))
    expect(onToggleRaw).toHaveBeenCalledTimes(1)
  })

  it('shows the raw bundle with a hide control', () => {
    const { strings } = renderScreen(<DiagnosticsScreen {...diagnosticsFixture} showingRaw />)
    expect(screen.getByText(/"format": "ihsaanly-diagnostics"/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.diagnostics.hideRaw })).toBeInTheDocument()
  })

  it('sends or cancels, and shows the outcome', async () => {
    const onSend = mock(() => {})
    const onCancel = mock(() => {})
    const { user, strings } = renderScreen(
      <DiagnosticsScreen
        {...diagnosticsFixture}
        message="Sent"
        onSend={onSend}
        onCancel={onCancel}
      />,
    )
    await user.click(screen.getByRole('button', { name: strings.diagnostics.send }))
    await user.click(screen.getByRole('button', { name: named(strings.diagnostics.cancel) }))
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Sent')).toBeInTheDocument()
  })
})

describe('DiagnosticsScreen report a problem', () => {
  it('offers the shortcut only when the host has Feedback', async () => {
    const onReportProblem = mock(() => {})
    const { user, strings, unmount } = renderScreen(
      <DiagnosticsScreen {...diagnosticsFixture} onReportProblem={onReportProblem} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.diagnostics.reportProblem) }))
    expect(onReportProblem).toHaveBeenCalledTimes(1)
    unmount()
    renderScreen(<DiagnosticsScreen {...diagnosticsFixture} />)
    expect(screen.queryByText(strings.diagnostics.reportProblem)).toBeNull()
  })
})
