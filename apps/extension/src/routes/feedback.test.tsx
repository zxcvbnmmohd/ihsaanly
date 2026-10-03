import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import type { Account } from '@ihsaanly/cloud/ports'
import { screen, waitFor } from '@testing-library/react'
import { fakeChrome } from '../../test/chrome'
import { feedbackCalls, nextOutcome, resetFeedback, sentDrafts } from '../../test/feedback-mock'
import { renderRoute, resetApp, settle, strings } from '../../test/route'
import { resetSession, setAccount } from '../../test/session-mock'

const realCloud = { ...(await import('../cloud')) }
const setCloud = (cloudEnabled: boolean): void => {
  mock.module('../cloud', () => ({ ...realCloud, cloudEnabled }))
}

afterAll(() => {
  mock.module('../cloud', () => realCloud)
})

const google: Account = {
  uid: 'user-1',
  provider: 'google',
  email: 'a@b.co',
  displayName: 'Aisha',
  providers: ['google'],
}

beforeEach(() => {
  resetApp()
  resetSession()
  resetFeedback()
  setCloud(false)
})

const messageField = (): Promise<HTMLElement> =>
  screen.findByLabelText(strings.feedback.messageLabel)

describe('Settings → Send feedback', () => {
  it('is listed in a build with the cloud, and opens the page', async () => {
    setCloud(true)
    const { user, router } = await renderRoute('/settings')
    await screen.findByRole('heading', { name: strings.more.title })
    const row = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '/feedback')
    if (!row) throw new Error('no Send feedback row')
    expect(row).toHaveTextContent(strings.feedback.title)
    await user.click(row)
    expect(router.state.location.pathname).toBe('/feedback')
    expect(await screen.findByRole('heading', { name: strings.feedback.title })).toBeInTheDocument()
  })

  it('is not listed in a local-only build', async () => {
    await renderRoute('/settings')
    await screen.findByRole('heading', { name: strings.more.title })
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs).not.toContain('/feedback')
  })
})

describe('/feedback signed out', () => {
  it('offers sign-in (to Account) and the email fallback instead of the form', async () => {
    const { user, router } = await renderRoute('/feedback')
    expect(await screen.findByText(strings.feedback.signedOut)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'support@ihsaanly.app' })).toHaveAttribute(
      'href',
      'mailto:support@ihsaanly.app',
    )
    await user.click(screen.getByRole('button', { name: strings.feedback.signIn }))
    expect(router.state.location.pathname).toBe('/account')
  })

  it('says a report made signed out waits for sign-in', async () => {
    setAccount({ status: 'idle', account: google })
    nextOutcome({ status: 'queued', error: 'signed-out' })
    const { user } = await renderRoute('/feedback')
    await user.type(await messageField(), 'Queued')
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))
    expect(await screen.findByText(strings.feedback.errors['signed-out'])).toBeInTheDocument()
  })
})

describe('/feedback signed in', () => {
  beforeEach(() => setAccount({ status: 'idle', account: google }))

  it('prefills the account email and sends from the extension', async () => {
    const { user } = await renderRoute('/feedback')
    await waitFor(() =>
      expect(screen.getByLabelText(strings.feedback.contactLabel)).toHaveValue('a@b.co'),
    )
    await user.click(screen.getByRole('button', { name: strings.feedback.kinds.other }))
    await user.type(await messageField(), 'Love the badge')
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))

    expect(await screen.findByText(strings.feedback.sentTitle)).toBeInTheDocument()
    expect(sentDrafts).toEqual([
      {
        kind: 'other',
        message: 'Love the badge',
        contactEmail: 'a@b.co',
        app: { surface: 'extension', version: '0.0.1', locale: 'en-US', os: navigator.userAgent },
        diagnostics: null,
      },
    ])
  })

  it('leaves the contact email to the user once changed', async () => {
    const { user } = await renderRoute('/feedback')
    const contact = await screen.findByLabelText(strings.feedback.contactLabel)
    await waitFor(() => expect(contact).toHaveValue('a@b.co'))
    await user.clear(contact)
    await user.type(await messageField(), 'Anonymous')
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))
    await screen.findByText(strings.feedback.sentTitle)
    expect(sentDrafts[0]?.contactEmail).toBe('')
  })

  it('reports a rate limit, and retries what is queued', async () => {
    nextOutcome({ status: 'error', error: 'rate-limited' })
    const { user } = await renderRoute('/feedback')
    await user.type(await messageField(), 'Again')
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      strings.feedback.errors['rate-limited'],
    )
    nextOutcome({ status: 'sent', error: null })
    await user.click(screen.getByRole('button', { name: strings.error.retry }))
    expect(await screen.findByText(strings.feedback.sentTitle)).toBeInTheDocument()
    expect(feedbackCalls.map((call) => call.name)).toContain('retryFeedback')
  })

  it('attaches diagnostics with the popup’s reminders, previewing what is sent', async () => {
    fakeChrome.permissionLevel = 'denied'
    await fakeChrome.api.alarms.create('badge', { periodInMinutes: 1 })
    await fakeChrome.api.alarms.create('item:dhikr', { when: Date.UTC(2026, 0, 1) })
    const { user } = await renderRoute('/feedback')
    await user.type(await messageField(), 'Reminders are late')
    await user.click(screen.getByRole('switch', { name: strings.feedback.includeDiagnostics }))
    await user.click(await screen.findByRole('button', { name: strings.feedback.showIncluded }))
    const preview = await screen.findByText(/"eventCounts"/)
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))

    await screen.findByText(strings.feedback.sentTitle)
    const [draft] = sentDrafts
    expect(JSON.stringify(draft?.diagnostics, null, 2)).toBe(preview.textContent)
    expect(draft?.diagnostics?.app.platform).toBe('extension')
    expect(draft?.diagnostics?.reminders).toEqual({ permission: 'denied', pending: 1 })
  })

  it('gathers the report itself when Send beats the preview', async () => {
    // The preview's own gathering never finishes; the send's does.
    const getAll = fakeChrome.api.alarms.getAll
    let calls = 0
    fakeChrome.api.alarms.getAll = (): Promise<[]> => {
      calls += 1
      return calls === 1 ? new Promise(() => {}) : Promise.resolve([])
    }
    try {
      const { user } = await renderRoute('/feedback')
      await user.type(await messageField(), 'Quick')
      await user.click(screen.getByRole('switch', { name: strings.feedback.includeDiagnostics }))
      expect(screen.queryByRole('button', { name: strings.feedback.showIncluded })).toBeNull()
      await user.click(screen.getByRole('button', { name: strings.feedback.send }))
      await screen.findByText(strings.feedback.sentTitle)
      expect(sentDrafts[0]?.diagnostics?.reminders).toEqual({ permission: 'granted', pending: 0 })
    } finally {
      fakeChrome.api.alarms.getAll = getAll
    }
  })

  it('drops a report gathered after leaving the page', async () => {
    const getAll = fakeChrome.api.alarms.getAll
    let release: (alarms: []) => void = () => {}
    fakeChrome.api.alarms.getAll = (): Promise<[]> =>
      new Promise((resolve) => {
        release = resolve
      })
    try {
      const { user, unmount } = await renderRoute('/feedback')
      await user.click(
        await screen.findByRole('switch', { name: strings.feedback.includeDiagnostics }),
      )
      unmount()
      await settle(async () => release([]))
      expect(screen.queryByText(/"eventCounts"/)).toBeNull()
    } finally {
      fakeChrome.api.alarms.getAll = getAll
    }
  })

  it('starts over on "Send another", and goes back when done', async () => {
    const { user, router } = await renderRoute(['/settings', '/feedback'])
    await user.type(await messageField(), 'One')
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))
    await user.click(await screen.findByRole('button', { name: strings.feedback.sendAnother }))
    expect(await messageField()).toHaveValue('')
    await user.type(await messageField(), 'Two')
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))
    await user.click(await screen.findByRole('button', { name: strings.feedback.done }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'))
    expect(feedbackCalls.filter((call) => call.name === 'dismissFeedbackStatus').length).toBe(3)
  })
})
