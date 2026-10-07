import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { Platform } from 'react-native'
import { named, renderScreen } from '../../test/render'
import { FEEDBACK_MESSAGE_MAX, type FeedbackErrorCode } from '../types'
import { FeedbackScreen, type FeedbackScreenProps } from './feedback'
import { feedbackFixture, feedbackSignedOutFixture } from './fixtures'

const platform = Platform as { OS: string }
const typed: FeedbackScreenProps = {
  ...feedbackFixture,
  message: 'The compass points the wrong way.',
}

describe('FeedbackScreen signed out', () => {
  it('explains, offers sign-in and an email fallback', async () => {
    const onSignIn = mock(() => {})
    const { user, strings } = renderScreen(
      <FeedbackScreen {...feedbackSignedOutFixture} onSignIn={onSignIn} />,
    )
    expect(screen.getByText(strings.feedback.signedOut)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.feedback.send })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.feedback.signIn }))
    expect(onSignIn).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'support@ihsaanly.app' })).toHaveAttribute(
      'href',
      'mailto:support@ihsaanly.app',
    )
  })

  it('hands native links to the host', async () => {
    const onOpenLink = mock((_url: string) => {})
    platform.OS = 'ios'
    try {
      const { user } = renderScreen(
        <FeedbackScreen {...feedbackSignedOutFixture} onOpenLink={onOpenLink} />,
      )
      await user.click(screen.getByText('support@ihsaanly.app'))
      expect(onOpenLink).toHaveBeenCalledWith('mailto:support@ihsaanly.app')
    } finally {
      platform.OS = 'web'
    }
  })
})

describe('FeedbackScreen form', () => {
  it('starts empty with Send disabled and the counter at zero', () => {
    const { strings } = renderScreen(<FeedbackScreen {...feedbackFixture} />)
    expect(screen.getByText(strings.feedback.explanation)).toBeInTheDocument()
    expect(screen.getByText(strings.feedback.counter(0, FEEDBACK_MESSAGE_MAX))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.feedback.send })).toBeDisabled()
    expect(document.body.textContent).toContain('Moh’d Inc.')
    expect(screen.getByRole('link', { name: strings.feedback.privacyLink })).toHaveAttribute(
      'href',
      feedbackFixture.privacyHref,
    )
  })

  it('keeps Send disabled for whitespace only', () => {
    const { strings } = renderScreen(<FeedbackScreen {...feedbackFixture} message="   " />)
    expect(screen.getByRole('button', { name: strings.feedback.send })).toBeDisabled()
  })

  it('labels the fields and caps the message', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} />)
    const field = screen.getByLabelText(strings.feedback.messageLabel)
    expect(field).toHaveAttribute('maxlength', String(FEEDBACK_MESSAGE_MAX))
    expect(screen.getByLabelText(strings.feedback.contactLabel)).toHaveValue('amina@example.com')
  })

  it('reports typing, with the counter following', async () => {
    const onMessage = mock((_text: string) => {})
    const { strings } = renderScreen(<FeedbackScreen {...typed} onMessage={onMessage} />)
    expect(
      screen.getByText(strings.feedback.counter(typed.message.length, FEEDBACK_MESSAGE_MAX)),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(strings.feedback.messageLabel), {
      target: { value: 'Hello' },
    })
    expect(onMessage).toHaveBeenCalledWith('Hello')
  })

  it('chooses a kind with pressed toggles', async () => {
    const onKind = mock((_kind: string) => {})
    const { user, strings } = renderScreen(<FeedbackScreen {...typed} onKind={onKind} />)
    expect(screen.getByRole('button', { name: strings.feedback.kinds.bug })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: strings.feedback.kinds.idea })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await user.click(screen.getByRole('button', { name: strings.feedback.kinds.idea }))
    expect(onKind).toHaveBeenCalledWith('idea')
  })

  it('edits the contact email, and offers the account email when it differs', async () => {
    const onContactEmail = mock((_email: string) => {})
    const { user, strings } = renderScreen(
      <FeedbackScreen
        {...typed}
        contactEmail="other@example.com"
        onContactEmail={onContactEmail}
      />,
    )
    await user.click(
      screen.getByRole('button', {
        name: named(strings.feedback.fillAccountEmail('amina@example.com')),
      }),
    )
    expect(onContactEmail).toHaveBeenCalledWith('amina@example.com')
    await user.click(screen.getByRole('button', { name: strings.textField.clear }))
    expect(onContactEmail).toHaveBeenCalledWith('')
  })

  it('does not offer the account email when it is already used, or there is none', () => {
    const { strings, unmount } = renderScreen(<FeedbackScreen {...typed} />)
    expect(screen.queryByText(strings.feedback.fillAccountEmail('amina@example.com'))).toBeNull()
    unmount()
    renderScreen(<FeedbackScreen {...typed} accountEmail={null} contactEmail="" />)
    expect(screen.queryByText(strings.feedback.fillAccountEmail('amina@example.com'))).toBeNull()
  })

  it('sends when there is a message', async () => {
    const onSend = mock(() => {})
    const { user, strings } = renderScreen(<FeedbackScreen {...typed} onSend={onSend} />)
    await user.click(screen.getByRole('button', { name: strings.feedback.send }))
    expect(onSend).toHaveBeenCalledTimes(1)
  })
})

describe('FeedbackScreen diagnostics', () => {
  it('is off by default, with nothing to preview', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} />)
    expect(
      screen.getByRole('switch', { name: strings.feedback.includeDiagnostics }),
    ).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByText(strings.feedback.showIncluded)).toBeNull()
  })

  it('toggles', async () => {
    const onIncludeDiagnostics = mock((_on: boolean) => {})
    const { user, strings } = renderScreen(
      <FeedbackScreen {...typed} onIncludeDiagnostics={onIncludeDiagnostics} />,
    )
    await user.click(screen.getByRole('switch', { name: strings.feedback.includeDiagnostics }))
    expect(onIncludeDiagnostics).toHaveBeenCalledWith(true)
  })

  it('previews exactly what is attached', async () => {
    const onTogglePreview = mock(() => {})
    const { user, strings } = renderScreen(
      <FeedbackScreen {...typed} includeDiagnostics onTogglePreview={onTogglePreview} />,
    )
    expect(screen.queryByText(/ihsaanly-diagnostics/)).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.feedback.showIncluded }))
    expect(onTogglePreview).toHaveBeenCalledTimes(1)
  })

  it('shows the report when the preview is open', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} includeDiagnostics previewShown />)
    expect(screen.getByText(/"format": "ihsaanly-diagnostics"/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.feedback.hideIncluded })).toBeInTheDocument()
  })

  it('offers no preview while the report is still being gathered', () => {
    const { strings } = renderScreen(
      <FeedbackScreen {...typed} includeDiagnostics diagnosticsPreview={null} previewShown />,
    )
    expect(screen.queryByText(strings.feedback.showIncluded)).toBeNull()
    expect(screen.queryByText(strings.feedback.hideIncluded)).toBeNull()
  })
})

describe('FeedbackScreen status', () => {
  it('shows sending and blocks a second send', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} status="sending" />)
    expect(screen.getAllByText(strings.feedback.sending).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: strings.feedback.sending })).toBeDisabled()
  })

  it('says it is queued while offline, and finishes', async () => {
    const onDone = mock(() => {})
    const onSendAnother = mock(() => {})
    const { user, strings } = renderScreen(
      <FeedbackScreen {...typed} status="queued" onDone={onDone} onSendAnother={onSendAnother} />,
    )
    expect(screen.getByText(strings.feedback.queuedTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.feedback.queued)).toBeInTheDocument()
    expect(screen.queryByLabelText(strings.feedback.messageLabel)).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.feedback.done }))
    await user.click(screen.getByRole('button', { name: named(strings.feedback.sendAnother) }))
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onSendAnother).toHaveBeenCalledTimes(1)
  })

  it('thanks the sender', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} status="sent" />)
    expect(screen.getByText(strings.feedback.sentTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.feedback.sent)).toBeInTheDocument()
  })

  it('says a signed-out report waits for sign-in', () => {
    const { strings } = renderScreen(
      <FeedbackScreen {...typed} status="queued" errorCode="signed-out" />,
    )
    expect(screen.getByText(strings.feedback.queuedTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.feedback.errors['signed-out'])).toBeInTheDocument()
    expect(screen.queryByText(strings.feedback.queued)).toBeNull()
  })

  it('says an offline report goes when back online', () => {
    const { strings } = renderScreen(
      <FeedbackScreen {...typed} status="queued" errorCode="network" />,
    )
    expect(screen.getByText(strings.feedback.queued)).toBeInTheDocument()
  })

  it.each<FeedbackErrorCode>(['rate-limited', 'unknown', 'network'])(
    'reports %s as an alert, still queued, with Try again in place of the form',
    async (code) => {
      const onRetry = mock(() => {})
      const onDone = mock(() => {})
      const { user, strings } = renderScreen(
        <FeedbackScreen
          {...typed}
          status="error"
          errorCode={code}
          onRetry={onRetry}
          onDone={onDone}
        />,
      )
      expect(screen.getByRole('alert')).toHaveTextContent(strings.feedback.errors[code])
      expect(screen.getByText(strings.feedback.queuedTitle)).toBeInTheDocument()
      expect(screen.queryByLabelText(strings.feedback.messageLabel)).toBeNull()
      expect(screen.queryByRole('button', { name: strings.feedback.send })).toBeNull()
      await user.click(screen.getByRole('button', { name: named(strings.error.retry) }))
      await user.click(screen.getByRole('button', { name: strings.feedback.done }))
      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onDone).toHaveBeenCalledTimes(1)
    },
  )

  it('reports an invalid draft on the form, which keeps the message to fix', () => {
    const { strings } = renderScreen(
      <FeedbackScreen {...typed} status="error" errorCode="invalid" />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(strings.feedback.errors.invalid)
    expect(screen.getByLabelText(strings.feedback.messageLabel)).toHaveValue(typed.message)
    expect(screen.getByRole('button', { name: strings.feedback.send })).toBeEnabled()
  })

  it('shows no alert for an error without a code', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} status="error" errorCode={null} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('button', { name: strings.feedback.send })).toBeEnabled()
  })
})

describe('FeedbackScreen presentation', () => {
  it('renders right to left in Arabic', () => {
    const { strings } = renderScreen(<FeedbackScreen {...typed} />, { locale: 'ar' })
    expect(screen.getByText(strings.feedback.explanation)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.feedback.send })).toBeEnabled()
  })

  it('renders in dark, compact and wide', () => {
    for (const layout of ['compact', 'wide'] as const) {
      const { strings, unmount } = renderScreen(
        <FeedbackScreen {...typed} status="error" errorCode="invalid" />,
        { scheme: 'dark', layout },
      )
      expect(screen.getByRole('alert')).toHaveTextContent(strings.feedback.errors.invalid)
      unmount()
    }
  })
})
