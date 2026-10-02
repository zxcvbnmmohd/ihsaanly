import type { Strings } from '@ihsaanly/core/strings/en'
import { palettes } from '@ihsaanly/tailwind/tokens'
import {
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  AccessibilityInfo,
  type ColorValue,
  type HostInstance,
  Platform,
  Text,
  View,
} from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { SignInButton } from '../components/sign-in-button'
import { Surface } from '../components/surface'
import { useUi } from '../provider'
import type { AccountErrorCode, AccountView, RestoreOutcome, SignInProvider } from '../types'

export type DataChoice = 'keep' | 'remove'
export type MismatchChoice = 'merge' | 'fresh'

/** Where the sign-in notice links to. The screen opens them through `onOpen`. */
export interface AccountLegalLinks {
  termsUrl: string
  privacyUrl: string
  /** Native: the host opens the URL. On the web the links are real anchors. */
  onOpen: (url: string) => void
}

/**
 * Set when onboarding sent someone here to sign in to an account they already
 * have. The outcome comes from `@ihsaanly/state`'s `useRestoreOutcome()`.
 */
export interface AccountRestore {
  outcome: RestoreOutcome
  /** Leaves sign-in for the setup it came from. */
  onBackToSetup: () => void
  /** With `needs-setup`: back into setup, still signed in. */
  onContinueSetup: () => void
  /**
   * With `restored`, where reminders arrived turned on but this device has not
   * been asked for permission (mobile). Without it the host moves on.
   */
  reminders?: { onAllow: () => void; onNotNow: () => void } | undefined
}

export interface AccountScreenProps {
  account: AccountView
  /** The sign-in buttons this host can offer; the extension has no Apple flow. */
  providers: SignInProvider[]
  /** When the host rendered, so "last synced" reads relative to it. */
  now: number
  onSignIn: (provider: SignInProvider) => void
  onSyncNow: () => void
  onSignOut: (mode: DataChoice) => void
  onResolveMismatch: (mode: MismatchChoice) => void
  onDeleteAccount: (mode: DataChoice) => void
  /** Adds another sign-in method to the signed-in account. */
  onLink: (provider: SignInProvider) => void
  /** Leaves the "continue with the other provider" prompt without signing in. */
  onCancelLink: () => void
  /** The Terms and the Privacy Policy, linked from the notice under the buttons. */
  legal?: AccountLegalLinks
  /**
   * The providers' own buttons, where the host has them (the mobile app passes
   * AppleAuthenticationButton and GoogleSigninButton). Without it the screen
   * draws `SignInButton`, which on the web follows each brand's guidelines.
   */
  renderSignInButton?: (
    provider: SignInProvider,
    onPress: () => void,
    disabled: boolean,
  ) => ReactNode
  /** Signing in from onboarding to restore an account's setup. */
  restore?: AccountRestore | undefined
}

type Step = 'none' | 'sign-out' | 'delete' | 'delete-choice'
type Origin = 'sign-out' | 'delete'

/** Which question is open, and which row opened it, so focus can go back there. */
interface Thing {
  step: Step
  origin: Origin | null
}

const MINUTE = 60_000

/** Error text, 4.5:1 or better on the wash and on surfaces. No token exists for it yet. */
const ERROR_COLOR = { light: '#b3261e', dark: '#ff8a80' } as const

function syncedLine(strings: Strings, lastSyncedAt: number | null, now: number): string {
  if (lastSyncedAt === null) return strings.account.neverSynced
  const minutes = Math.max(0, Math.floor((now - lastSyncedAt) / MINUTE))
  if (minutes < 1) return strings.account.lastSynced(strings.account.justNow)
  if (minutes < 60) return strings.account.lastSynced(strings.account.minutesAgo(minutes))
  if (minutes < 24 * 60)
    return strings.account.lastSynced(strings.account.hoursAgo(Math.floor(minutes / 60)))
  return strings.account.lastSynced(strings.account.daysAgo(Math.floor(minutes / (24 * 60))))
}

/** Brand names, never translated. */
const PROVIDER_NAMES: Record<SignInProvider, string> = { apple: 'Apple', google: 'Google' }
const ALL_PROVIDERS: SignInProvider[] = ['apple', 'google']

function errorText(strings: Strings, code: AccountErrorCode): string {
  return strings.account.errors[code]
}

/** Moves screen-reader (and, on the web, keyboard) focus to a host view. */
function focusView(view: HostInstance | null, firstFocusableInside = false): void {
  if (!view) return
  if (Platform.OS === 'web') {
    const element = view as unknown as HTMLElement
    const target = firstFocusableInside
      ? element.querySelector<HTMLElement>('[tabindex="0"], button, a[href]')
      : element
    target?.focus()
    return
  }
  AccessibilityInfo.sendAccessibilityEvent(view, 'focus')
}

interface QuestionProps {
  title: string
  body: string
  children: ReactElement | ReactElement[]
}

/**
 * The in-screen version of Data's confirm dialog: title, what happens, then the
 * answers. Focus lands on the title when it appears, so a keyboard or screen
 * reader user starts at the question rather than wherever the row used to be.
 */
function Question({ title, body, children }: QuestionProps): ReactElement {
  const colors = useColors()
  const titleRef = useRef<HostInstance>(null)

  useEffect(() => {
    focusView(titleRef.current)
  }, [])

  return (
    <Surface style={{ borderRadius: 16, padding: 16 }}>
      <View className="gap-3">
        <Text
          ref={titleRef}
          accessibilityRole="header"
          // Focusable by script only, so the web can move focus here without adding a tab stop.
          {...(Platform.OS === 'web' ? { tabIndex: -1 } : null)}
          className="font-semibold text-base"
          style={{ color: colors.label }}>
          {title}
        </Text>
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {body}
        </Text>
        <View className="gap-2">{children}</View>
      </View>
    </Surface>
  )
}

interface NoticeProps {
  strings: Strings
  legal: AccountLegalLinks | undefined
  linkColor: ColorValue
  textColor: ColorValue
}

/**
 * The consent point for sign-in: what is stored, where, with whom, the age
 * limit and the way out, with the Terms and the Privacy Policy linked inline.
 * It sits directly under the buttons and is never collapsed.
 */
function SignInNotice({ strings, legal, linkColor, textColor }: NoticeProps): ReactElement {
  const copy = strings.account

  const link = (label: string, url: string | undefined): ReactNode => {
    if (!url || !legal) return label
    const web = Platform.OS === 'web'
    return (
      <Text
        key={url}
        accessibilityRole="link"
        style={{ color: linkColor, textDecorationLine: 'underline' }}
        // On the web a real anchor: middle-click, keyboard and "open in new tab" all work.
        {...(web
          ? { href: url, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } }
          : { onPress: () => legal.onOpen(url) })}>
        {label}
      </Text>
    )
  }

  const parts = copy.agreement.split(/(\{terms\}|\{privacy\})/).map((part) => {
    if (part === '{terms}') return link(copy.terms, legal?.termsUrl)
    if (part === '{privacy}') return link(copy.privacy, legal?.privacyUrl)
    return part
  })

  return (
    <View className="gap-2">
      <Text className="text-sm" style={{ color: textColor }}>
        {parts}
      </Text>
      <Text className="text-sm" style={{ color: textColor }}>
        {copy.notice}
      </Text>
    </View>
  )
}

interface LinkPanelProps {
  strings: Strings
  link: { existing: SignInProvider; attempted: SignInProvider }
  /** Whether this surface can sign in with `link.existing` at all. */
  offered: boolean
  button: ReactNode
  onCancel: () => void
}

/**
 * The email already has an account on the other provider. Signing in with that
 * one opens it and links the one just tried; where that provider is not
 * offered (Apple in the extension), the panel says where to do it instead.
 */
function LinkPanel({ strings, link, offered, button, onCancel }: LinkPanelProps): ReactElement {
  const copy = strings.account
  const body = offered
    ? copy.linkBody(PROVIDER_NAMES[link.existing], PROVIDER_NAMES[link.attempted])
    : copy.linkUnavailable
  const cancel = <Button key="cancel" variant="secondary" title={copy.cancel} onPress={onCancel} />
  return (
    <Question title={copy.linkTitle} body={body}>
      {offered ? [<View key="existing">{button}</View>, cancel] : cancel}
    </Question>
  )
}

interface RestorePanelProps {
  strings: Strings
  restore: AccountRestore
  textColor: ColorValue
}

/**
 * Signed in from onboarding: the first sync, then where it leads. A calm line
 * while it runs, then either "continue setup" for an account that never
 * finished it, or the one question restoring cannot answer for this device.
 */
function RestorePanel({ strings, restore, textColor }: RestorePanelProps): ReactElement {
  const copy = strings.account.restore
  const line =
    restore.outcome === 'restoring'
      ? copy.restoring
      : restore.outcome === 'restored'
        ? copy.restored
        : null

  return (
    <View className="gap-4">
      <View accessibilityLiveRegion="polite">
        {line ? (
          <Text className="text-base" style={{ color: textColor }}>
            {line}
          </Text>
        ) : null}
      </View>
      {restore.outcome === 'needs-setup' ? (
        <Question title={copy.needsSetupTitle} body={copy.needsSetupBody}>
          <Button title={copy.continueSetup} onPress={restore.onContinueSetup} />
        </Question>
      ) : null}
      {restore.outcome === 'restored' && restore.reminders ? (
        <Question title={copy.remindersTitle} body={copy.remindersBody}>
          <Button title={strings.onboarding.allowReminders} onPress={restore.reminders.onAllow} />
          <Button
            variant="secondary"
            title={strings.onboarding.notNow}
            onPress={restore.reminders.onNotNow}
          />
        </Question>
      ) : null}
    </View>
  )
}

export function AccountScreen({
  account,
  providers,
  now,
  onSignIn,
  onSyncNow,
  onSignOut,
  onResolveMismatch,
  onDeleteAccount,
  onLink,
  onCancelLink,
  legal,
  renderSignInButton,
  restore,
}: AccountScreenProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ step: 'none', origin: null })
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const errorColor = ERROR_COLOR[scheme === 'dark' ? 'dark' : 'light']
  const copy = strings.account
  const busy = account.status === 'syncing'
  const signOutRow = useRef<HostInstance>(null)
  const deleteRow = useRef<HostInstance>(null)

  const open = (step: Exclude<Step, 'none'>, origin: Origin): void => setThing({ step, origin })
  const close = useCallback((): void => {
    setThing((current) => ({ ...current, step: 'none' }))
  }, [])

  // Back on the rows after a question closes: focus returns to the row that asked it.
  useEffect(() => {
    if (thing.step !== 'none' || thing.origin === null) return
    const rows: Record<Origin, RefObject<HostInstance | null>> = {
      'sign-out': signOutRow,
      delete: deleteRow,
    }
    focusView(rows[thing.origin].current, true)
  }, [thing.step, thing.origin])

  // Escape closes an open question on the web, as it would a dialog.
  useEffect(() => {
    if (Platform.OS !== 'web' || thing.step === 'none') return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [thing.step, close])

  const destructive = { color: palette.accent, onColor: palette.onAccent }
  const signInButton = (provider: SignInProvider): ReactNode => {
    const press = (): void => onSignIn(provider)
    return renderSignInButton ? (
      renderSignInButton(provider, press, busy)
    ) : (
      <SignInButton provider={provider} onPress={press} disabled={busy} />
    )
  }
  const cancel = <Button key="cancel" variant="secondary" title={copy.cancel} onPress={close} />
  const backToSetup = restore ? (
    <View className="items-start">
      <Button
        variant="secondary"
        title={copy.restore.backToSetup}
        onPress={restore.onBackToSetup}
      />
    </View>
  ) : null

  if (!account.account) {
    return (
      <Screen palette={palette} className="gap-4 p-4">
        {backToSetup}
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {restore ? copy.restore.intro : copy.explanation}
        </Text>

        <View className="gap-3">
          {account.link ? (
            <LinkPanel
              strings={strings}
              link={account.link}
              offered={providers.includes(account.link.existing)}
              button={signInButton(account.link.existing)}
              onCancel={onCancelLink}
            />
          ) : (
            providers.map((provider) => <View key={provider}>{signInButton(provider)}</View>)
          )}
        </View>

        <SignInNotice
          strings={strings}
          legal={legal}
          linkColor={colors.accentInk}
          textColor={colors.secondaryLabel}
        />

        <View accessibilityLiveRegion="polite">
          {busy ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {copy.signingIn}
            </Text>
          ) : null}
        </View>
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" className="gap-1">
          {account.error ? (
            <>
              <Text className="text-sm" style={{ color: errorColor }}>
                {copy.signInFailed}
              </Text>
              <Text className="text-sm" style={{ color: errorColor }}>
                {errorText(strings, account.error)}
              </Text>
            </>
          ) : null}
        </View>
      </Screen>
    )
  }

  const { email, displayName, provider } = account.account
  const linked = account.account.providers
  const linkable = providers.filter((each) => !linked.includes(each))
  const status =
    account.status === 'syncing' ? copy.syncing : account.status === 'idle' ? copy.upToDate : null
  const identity = (
    <View className="gap-1">
      {displayName ? (
        <Text className="font-semibold text-base" style={{ color: colors.label }}>
          {displayName}
        </Text>
      ) : null}
      {email ? (
        <Text
          className="text-base"
          style={{ color: displayName ? colors.secondaryLabel : colors.label }}>
          {email}
        </Text>
      ) : null}
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {copy.signedInWith[provider]}
      </Text>
    </View>
  )

  // Restoring takes the whole screen until it settles; errors, a mismatch and
  // the rest fall through to the ordinary signed-in view below.
  if (restore && restore.outcome !== 'idle') {
    return (
      <Screen palette={palette} className="gap-4 p-4">
        {identity}
        <RestorePanel strings={strings} restore={restore} textColor={colors.label} />
      </Screen>
    )
  }

  return (
    <Screen palette={palette} className="gap-4 p-4">
      {backToSetup}
      {identity}

      <View accessibilityLiveRegion="polite" className="gap-1">
        <Text className="text-sm" style={{ color: colors.label }}>
          {syncedLine(strings, account.lastSyncedAt, now)}
        </Text>
        {status ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {status}
          </Text>
        ) : null}
      </View>
      <View accessibilityLiveRegion="assertive" accessibilityRole="alert" className="gap-1">
        {account.status === 'error' ? (
          <Text className="text-sm" style={{ color: errorColor }}>
            {account.error && account.error !== 'sync'
              ? errorText(strings, account.error)
              : copy.syncFailed}
          </Text>
        ) : null}
      </View>

      {account.status === 'account-mismatch' ? (
        <Question title={copy.mismatchTitle} body={copy.mismatchBody}>
          <Button title={copy.merge} onPress={() => onResolveMismatch('merge')} />
          <Button
            variant="secondary"
            title={copy.fresh}
            onPress={() => onResolveMismatch('fresh')}
          />
        </Question>
      ) : null}

      {thing.step === 'sign-out' ? (
        <Question title={copy.signOutTitle} body={copy.signOutBody}>
          <Button
            title={copy.keepData}
            onPress={() => {
              close()
              onSignOut('keep')
            }}
          />
          <Button
            {...destructive}
            title={copy.removeData}
            onPress={() => {
              close()
              onSignOut('remove')
            }}
          />
          {cancel}
        </Question>
      ) : null}

      {thing.step === 'delete' ? (
        <Question title={copy.deleteTitle} body={copy.deleteBody}>
          <Button
            {...destructive}
            title={copy.deleteConfirm}
            onPress={() => open('delete-choice', 'delete')}
          />
          {cancel}
        </Question>
      ) : null}

      {thing.step === 'delete-choice' ? (
        <Question title={copy.deleteChoiceTitle} body={copy.deleteChoiceBody}>
          <Button
            title={copy.keepData}
            onPress={() => {
              close()
              onDeleteAccount('keep')
            }}
          />
          <Button
            {...destructive}
            title={copy.removeData}
            onPress={() => {
              close()
              onDeleteAccount('remove')
            }}
          />
          {cancel}
        </Question>
      ) : null}

      {thing.step === 'none' ? (
        <>
          <View className="gap-2">
            <Text
              accessibilityRole="header"
              className="font-semibold text-base"
              style={{ color: colors.label }}>
              {copy.methodsTitle}
            </Text>
            {ALL_PROVIDERS.filter((each) => linked.includes(each)).map((each) => (
              <Text
                key={each}
                accessibilityLabel={copy.methodLinked(PROVIDER_NAMES[each])}
                className="text-sm"
                style={{ color: colors.label }}>
                {`✓ ${PROVIDER_NAMES[each]}`}
              </Text>
            ))}
            {linkable.map((each) => (
              <Button
                key={each}
                variant="secondary"
                title={copy.linkProvider(PROVIDER_NAMES[each])}
                disabled={busy}
                onPress={() => onLink(each)}
              />
            ))}
            {linkable.length > 0 ? (
              <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
                {copy.methodsHint}
              </Text>
            ) : null}
          </View>
          <Row title={copy.syncNow} onPress={busy ? undefined : onSyncNow} />
          <View ref={signOutRow}>
            <Row
              title={copy.signOut}
              detail={copy.signOutDetail}
              onPress={() => open('sign-out', 'sign-out')}
            />
          </View>
          <View ref={deleteRow}>
            <Row
              title={copy.deleteAccount}
              detail={copy.deleteAccountDetail}
              onPress={() => open('delete', 'delete')}
            />
          </View>
        </>
      ) : null}
    </Screen>
  )
}
