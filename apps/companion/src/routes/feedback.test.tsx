// Send feedback: the route turns the account, the outbox status and the
// local form into FeedbackScreen props, through the real stores and an
// in-memory cloud.
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { signIn } from '@ihsaanly/state/cloud/session'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'
import { connectMemoryCloud, type MemoryCloud } from '../../test/memory-cloud'

let connected: MemoryCloud | null = null

beforeEach(async () => {
  await resetApp()
  await startUsing()
})

afterEach(async () => {
  await connected?.stop()
  connected = null
})

async function signedIn(): Promise<MemoryCloud> {
  connected = await connectMemoryCloud({ uid: 'me' })
  await signIn('google')
  return connected
}

const message = (): HTMLElement => screen.getByLabelText(en.feedback.messageLabel)

describe('/feedback signed out', () => {
  it('explains, offers the email fallback, and sends sign-in to Account', async () => {
    const app = await renderApp('/feedback')
    expect(await screen.findByText(en.feedback.signedOut)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'support@ihsaanly.app' })).toHaveAttribute(
      'href',
      'mailto:support@ihsaanly.app',
    )
    expect(screen.queryByRole('button', { name: en.feedback.send })).toBeNull()
    await app.user.click(screen.getByRole('button', { name: en.feedback.signIn }))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/account'))
  })
})

describe('/feedback signed in', () => {
  it('prefills the account email once, and lets it be cleared', async () => {
    await signedIn()
    const app = await renderApp('/feedback')
    const contact = await screen.findByLabelText(en.feedback.contactLabel)
    await waitFor(() => expect(contact).toHaveValue('google@example.test'))
    await app.user.clear(contact)
    expect(contact).toHaveValue('')
    expect(
      screen.getByRole('button', { name: en.feedback.fillAccountEmail('google@example.test') }),
    ).toBeInTheDocument()
  })

  it('sends a report from the web, then offers another', async () => {
    const cloud = await signedIn()
    const app = await renderApp('/feedback')
    await app.user.click(await screen.findByRole('button', { name: en.feedback.kinds.idea }))
    await app.user.type(message(), 'A dark widget, please.')
    await app.user.click(screen.getByRole('button', { name: en.feedback.send }))

    expect(await screen.findByText(en.feedback.sentTitle)).toBeInTheDocument()
    expect(cloud.feedback.sent).toHaveLength(1)
    expect(cloud.feedback.sent[0]).toMatchObject({
      uid: 'me',
      kind: 'idea',
      message: 'A dark widget, please.',
      contactEmail: 'google@example.test',
      app: {
        surface: 'web',
        version: '1.0.0',
        locale: 'en-US',
        os: navigator.userAgent.slice(0, 64),
      },
      diagnostics: null,
    })

    await app.user.click(screen.getByRole('button', { name: en.feedback.sendAnother }))
    expect(await screen.findByLabelText(en.feedback.messageLabel)).toHaveValue('')
    expect(screen.getByRole('button', { name: en.feedback.kinds.bug })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('says to wait when sent again within a minute, keeps it queued, and retries', async () => {
    const cloud = await signedIn()
    const app = await renderApp('/feedback')
    await app.user.type(await screen.findByLabelText(en.feedback.messageLabel), 'First')
    await app.user.click(screen.getByRole('button', { name: en.feedback.send }))
    await app.user.click(await screen.findByRole('button', { name: en.feedback.sendAnother }))
    await app.user.type(await screen.findByLabelText(en.feedback.messageLabel), 'Second')
    await app.user.click(screen.getByRole('button', { name: en.feedback.send }))

    expect(await screen.findByRole('alert')).toHaveTextContent(en.feedback.errors['rate-limited'])
    await app.user.click(screen.getByRole('button', { name: en.error.retry }))
    expect(await screen.findByRole('alert')).toHaveTextContent(en.feedback.errors['rate-limited'])
    expect(cloud.feedback.sent.map((sent) => sent.message)).toEqual(['First'])
  })

  it('attaches diagnostics when switched on, previewing exactly what is sent', async () => {
    const cloud = await signedIn()
    const app = await renderApp('/feedback')
    await app.user.type(await screen.findByLabelText(en.feedback.messageLabel), 'Times are off')
    await app.user.click(screen.getByRole('switch', { name: en.feedback.includeDiagnostics }))
    await app.user.click(screen.getByRole('button', { name: en.feedback.showIncluded }))
    const preview = await screen.findByText(/"eventCounts"/)
    await app.user.click(screen.getByRole('button', { name: en.feedback.hideIncluded }))
    await waitFor(() => expect(screen.queryByText(/"eventCounts"/)).toBeNull())

    await app.user.click(screen.getByRole('button', { name: en.feedback.send }))
    await screen.findByText(en.feedback.sentTitle)
    expect(JSON.stringify(cloud.feedback.sent[0]?.diagnostics, null, 2)).toBe(preview.textContent)
    expect(cloud.feedback.sent[0]?.diagnostics?.app.platform).toBe('web')
  })

  it('sends none once switched back off', async () => {
    const cloud = await signedIn()
    const app = await renderApp('/feedback')
    await app.user.type(await screen.findByLabelText(en.feedback.messageLabel), 'Never mind')
    const toggle = screen.getByRole('switch', { name: en.feedback.includeDiagnostics })
    await app.user.click(toggle)
    await app.user.click(toggle)
    await app.user.click(screen.getByRole('button', { name: en.feedback.send }))
    await screen.findByText(en.feedback.sentTitle)
    expect(cloud.feedback.sent[0]?.diagnostics).toBeNull()
  })

  it('goes back when done, and the next visit starts blank', async () => {
    await signedIn()
    const app = await renderApp('/data')
    await app.router.navigate({ to: '/feedback' })
    await app.user.type(await screen.findByLabelText(en.feedback.messageLabel), 'Thanks')
    await app.user.click(screen.getByRole('button', { name: en.feedback.send }))
    await app.user.click(await screen.findByRole('button', { name: en.feedback.done }))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/data'))
    await app.router.navigate({ to: '/feedback' })
    expect(await screen.findByLabelText(en.feedback.messageLabel)).toHaveValue('')
  })
})

describe('/feedback from Diagnostics', () => {
  it('"Report this problem" opens Feedback with the report already attached', async () => {
    await signedIn()
    const app = await renderApp('/diagnostics')
    await app.user.click(await screen.findByRole('button', { name: en.diagnostics.reportProblem }))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/feedback'))
    expect(app.router.state.location.search).toEqual({ diagnostics: 1 })
    expect(
      await screen.findByRole('switch', { name: en.feedback.includeDiagnostics }),
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: en.feedback.showIncluded })).toBeInTheDocument()
  })

  it('ignores a ?diagnostics it does not know', async () => {
    await signedIn()
    await renderApp('/feedback?diagnostics=yes')
    expect(
      await screen.findByRole('switch', { name: en.feedback.includeDiagnostics }),
    ).toHaveAttribute('aria-checked', 'false')
  })
})
