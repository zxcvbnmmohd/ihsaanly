import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement, ReactNode } from 'react'
import { Platform, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Chip } from '../components/chip'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { SwitchRow } from '../components/switch-row'
import { TextField } from '../components/text-field'
import { useUi } from '../provider'
import {
  FEEDBACK_MESSAGE_MAX,
  type FeedbackErrorCode,
  type FeedbackKind,
  type FeedbackStatus,
} from '../types'

export interface FeedbackScreenProps {
  /** Feedback goes out with the account, so signed out shows a way in instead of the form. */
  signedIn: boolean
  /** The account's email, offered as the contact address when the field is empty or different. */
  accountEmail: string | null
  kind: FeedbackKind
  onKind: (kind: FeedbackKind) => void
  message: string
  onMessage: (message: string) => void
  contactEmail: string
  onContactEmail: (email: string) => void
  includeDiagnostics: boolean
  onIncludeDiagnostics: (include: boolean) => void
  /** The report as it will be sent, so what is shown and what leaves cannot differ. Null while gathered. */
  diagnosticsPreview: string | null
  previewShown: boolean
  onTogglePreview: () => void
  status: FeedbackStatus
  /** With `queued` or `error`: why. */
  errorCode: FeedbackErrorCode | null
  onSend: () => void
  /** An error that left the report queued (`rate-limited`, `unknown`): sends what is queued now. */
  onRetry: () => void
  /** Signed out: goes to Account. */
  onSignIn: () => void
  /** After `queued` or `sent`: leaves the screen. */
  onDone: () => void
  /** After `queued` or `sent`: back to an empty form. */
  onSendAnother: () => void
  /** `mailto:` link for the signed-out fallback; the address shown is read from it. */
  supportEmailHref: string
  privacyHref: string
  /** Native: the host opens the URL. On the web the links are real anchors. */
  onOpenLink: (url: string) => void
}

/** Error text, 4.5:1 or better on the wash and on surfaces. No token exists for it yet. */
const ERROR_COLOR = { light: '#b3261e', dark: '#ff8a80' } as const

interface LinkedTextProps {
  template: string
  /** Each `{token}` in the template, with where it links. */
  links: Record<string, { label: string; url: string }>
  onOpenLink: (url: string) => void
  textColor: string
  linkColor: string
}

/** A sentence with inline links: real anchors on the web, `onOpenLink` on native. */
function LinkedText({
  template,
  links,
  onOpenLink,
  textColor,
  linkColor,
}: LinkedTextProps): ReactElement {
  const parts: ReactNode[] = template.split(/(\{[A-Za-z]+\})/).map((part) => {
    const link = links[part.slice(1, -1)]
    if (!link || !part.startsWith('{')) return part
    return (
      <Text
        key={part}
        accessibilityRole="link"
        style={{ color: linkColor, textDecorationLine: 'underline' }}
        {...(Platform.OS === 'web'
          ? { href: link.url, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } }
          : { onPress: () => onOpenLink(link.url) })}>
        {link.label}
      </Text>
    )
  })
  return (
    <Text className="text-sm" style={{ color: textColor }}>
      {parts}
    </Text>
  )
}

const KINDS: FeedbackKind[] = ['bug', 'idea', 'other']

export function FeedbackScreen(props: FeedbackScreenProps): ReactElement {
  const {
    signedIn,
    accountEmail,
    kind,
    onKind,
    message,
    onMessage,
    contactEmail,
    onContactEmail,
    includeDiagnostics,
    onIncludeDiagnostics,
    diagnosticsPreview,
    previewShown,
    onTogglePreview,
    status,
    errorCode,
    onSend,
    onRetry,
    onSignIn,
    onDone,
    onSendAnother,
    supportEmailHref,
    privacyHref,
    onOpenLink,
  } = props
  const colors = useColors()
  const { strings, scheme, systemColors } = useUi()
  const palette = palettes[scheme]
  const copy = strings.feedback
  const errorColor = ERROR_COLOR[scheme === 'dark' ? 'dark' : 'light']
  const supportEmail = supportEmailHref.replace(/^mailto:/, '')

  if (!signedIn)
    return (
      <Screen palette={palette} className="gap-4 p-4">
        <Text className="text-base" style={{ color: colors.label }}>
          {copy.signedOut}
        </Text>
        <Button
          title={copy.signIn}
          onPress={onSignIn}
          color={palette.accent}
          onColor={palette.onAccent}
        />
        <LinkedText
          template={copy.emailFallback}
          links={{ email: { label: supportEmail, url: supportEmailHref } }}
          onOpenLink={onOpenLink}
          textColor={colors.secondaryLabel as string}
          linkColor={palette.accent}
        />
      </Screen>
    )

  // Every error but `invalid` leaves the report in the outbox: offer to send
  // that one again rather than the form, whose Send would queue a copy.
  const stillQueued = status === 'error' && errorCode !== null && errorCode !== 'invalid'

  if (stillQueued)
    return (
      <Screen palette={palette} className="gap-4 p-4">
        <View accessibilityLiveRegion="polite" className="gap-2">
          <Text
            accessibilityRole="header"
            className="font-semibold text-xl"
            style={{ color: colors.label }}>
            {copy.queuedTitle}
          </Text>
          <Text accessibilityRole="alert" className="text-base" style={{ color: errorColor }}>
            {copy.errors[errorCode]}
          </Text>
        </View>
        <View className="gap-3">
          <Button
            title={strings.error.retry}
            onPress={onRetry}
            color={palette.accent}
            onColor={palette.onAccent}
          />
          <Button
            title={copy.done}
            variant="secondary"
            onPress={onDone}
            color={palette.accent}
            onColor={palette.onAccent}
          />
        </View>
      </Screen>
    )

  if (status === 'queued' || status === 'sent')
    return (
      <Screen palette={palette} className="gap-4 p-4">
        <View accessibilityLiveRegion="polite" className="gap-2">
          <Text
            accessibilityRole="header"
            className="font-semibold text-xl"
            style={{ color: colors.label }}>
            {status === 'queued' ? copy.queuedTitle : copy.sentTitle}
          </Text>
          <Text className="text-base" style={{ color: colors.secondaryLabel }}>
            {status === 'sent'
              ? copy.sent
              : errorCode === 'signed-out'
                ? copy.errors['signed-out']
                : copy.queued}
          </Text>
        </View>
        <View className="gap-3">
          <Button
            title={copy.done}
            onPress={onDone}
            color={palette.accent}
            onColor={palette.onAccent}
          />
          <Button
            title={copy.sendAnother}
            variant="secondary"
            onPress={onSendAnother}
            color={palette.accent}
            onColor={palette.onAccent}
          />
        </View>
      </Screen>
    )

  const sending = status === 'sending'
  const canSend = message.trim().length > 0 && !sending
  const offerAccountEmail = accountEmail !== null && contactEmail !== accountEmail

  return (
    <Screen palette={palette} className="gap-5 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {copy.explanation}
      </Text>

      <View className="gap-2">
        <Text className="font-semibold text-sm" style={{ color: colors.label }}>
          {copy.kindLabel}
        </Text>
        <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
          {KINDS.map((option) => (
            <Chip
              key={option}
              label={copy.kinds[option]}
              selected={kind === option}
              onPress={() => onKind(option)}
              palette={palette}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-semibold text-sm" style={{ color: colors.label }}>
          {copy.messageLabel}
        </Text>
        <TextField
          multiline
          value={message}
          onChangeText={onMessage}
          placeholder={copy.messagePlaceholder}
          label={copy.messageLabel}
          maxLength={FEEDBACK_MESSAGE_MAX}
          accent={palette.accent}
          autoCapitalize="sentences"
        />
        <Text className="text-end text-xs" style={{ color: colors.secondaryLabel }}>
          {copy.counter(message.length, FEEDBACK_MESSAGE_MAX)}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="font-semibold text-sm" style={{ color: colors.label }}>
          {copy.contactLabel}
        </Text>
        <TextField
          value={contactEmail}
          onChangeText={onContactEmail}
          placeholder={copy.contactPlaceholder}
          label={copy.contactLabel}
          accent={palette.accent}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
          {copy.contactHint}
        </Text>
        {offerAccountEmail ? (
          <Button
            title={copy.fillAccountEmail(accountEmail)}
            variant="secondary"
            onPress={() => onContactEmail(accountEmail)}
            color={palette.accent}
            onColor={palette.onAccent}
          />
        ) : null}
      </View>

      <View className="gap-3">
        <SwitchRow
          title={copy.includeDiagnostics}
          detail={copy.includeDiagnosticsDetail}
          value={includeDiagnostics}
          onValueChange={onIncludeDiagnostics}
          accent={palette.accent}
          knob={systemColors.onTint}
        />
        {includeDiagnostics && diagnosticsPreview !== null ? (
          <Row
            title={previewShown ? copy.hideIncluded : copy.showIncluded}
            onPress={onTogglePreview}
          />
        ) : null}
        {includeDiagnostics && diagnosticsPreview !== null && previewShown ? (
          <Surface>
            <View className="p-3">
              <Text
                selectable
                className="font-mono text-xs"
                style={{ color: colors.secondaryLabel }}>
                {diagnosticsPreview}
              </Text>
            </View>
          </Surface>
        ) : null}
      </View>

      <LinkedText
        template={copy.privacy}
        links={{ privacy: { label: copy.privacyLink, url: privacyHref } }}
        onOpenLink={onOpenLink}
        textColor={colors.secondaryLabel as string}
        linkColor={palette.accent}
      />

      <View className="gap-3">
        <Button
          title={sending ? copy.sending : copy.send}
          onPress={onSend}
          disabled={!canSend}
          color={palette.accent}
          onColor={palette.onAccent}
        />
        <View accessibilityLiveRegion="polite">
          {sending ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {copy.sending}
            </Text>
          ) : null}
          {status === 'error' && errorCode === 'invalid' ? (
            <Text accessibilityRole="alert" className="text-sm" style={{ color: errorColor }}>
              {copy.errors.invalid}
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  )
}
