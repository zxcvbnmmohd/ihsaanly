import type { Strings } from '@ihsaanly/core/strings/en'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { type ReactElement, useState } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { useUi } from '../provider'
import type { AccountView, SignInProvider } from '../types'

export type DataChoice = 'keep' | 'remove'
export type MismatchChoice = 'merge' | 'fresh'

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
}

/** Which question is open. Only the screen asks; the host gets the answer. */
interface Thing {
  step: 'none' | 'sign-out' | 'delete' | 'delete-choice'
}

const MINUTE = 60_000

function syncedLine(strings: Strings, lastSyncedAt: number | null, now: number): string {
  if (lastSyncedAt === null) return strings.account.neverSynced
  const minutes = Math.max(0, Math.floor((now - lastSyncedAt) / MINUTE))
  if (minutes < 1) return strings.account.lastSynced(strings.account.justNow)
  if (minutes < 60) return strings.account.lastSynced(strings.account.minutesAgo(minutes))
  if (minutes < 24 * 60)
    return strings.account.lastSynced(strings.account.hoursAgo(Math.floor(minutes / 60)))
  return strings.account.lastSynced(strings.account.daysAgo(Math.floor(minutes / (24 * 60))))
}

interface QuestionProps {
  title: string
  body: string
  children: ReactElement | ReactElement[]
}

/** The in-screen version of Data's confirm dialog: title, what happens, then the answers. */
function Question({ title, body, children }: QuestionProps): ReactElement {
  const colors = useColors()
  return (
    <Surface style={{ borderRadius: 16, padding: 16 }}>
      <View className="gap-3" accessibilityLiveRegion="polite">
        <Text
          accessibilityRole="header"
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

export function AccountScreen({
  account,
  providers,
  now,
  onSignIn,
  onSyncNow,
  onSignOut,
  onResolveMismatch,
  onDeleteAccount,
}: AccountScreenProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ step: 'none' })
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const copy = strings.account
  const busy = account.status === 'syncing'
  const ask = (step: Thing['step']): void => setThing({ step })

  const destructive = { color: palette.accent, onColor: palette.onAccent }
  const cancel = (
    <Button key="cancel" variant="secondary" title={copy.cancel} onPress={() => ask('none')} />
  )

  if (!account.account) {
    return (
      <Screen palette={palette} className="gap-4 p-4">
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {copy.explanation}
        </Text>

        {providers.map((provider) => (
          <Button
            key={provider}
            title={provider === 'apple' ? copy.continueWithApple : copy.continueWithGoogle}
            disabled={busy}
            onPress={() => onSignIn(provider)}
          />
        ))}

        <View accessibilityLiveRegion="polite" className="gap-1">
          {busy ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {copy.signingIn}
            </Text>
          ) : null}
          {account.error ? (
            <>
              <Text className="text-sm" style={{ color: colors.label }}>
                {copy.signInFailed}
              </Text>
              <Text selectable className="text-xs" style={{ color: colors.secondaryLabel }}>
                {account.error}
              </Text>
            </>
          ) : null}
        </View>
      </Screen>
    )
  }

  const { email, displayName, provider } = account.account
  const status =
    account.status === 'syncing'
      ? copy.syncing
      : account.status === 'error'
        ? copy.syncFailed
        : account.status === 'idle'
          ? copy.upToDate
          : null

  return (
    <Screen palette={palette} className="gap-4 p-4">
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

      <View accessibilityLiveRegion="polite" className="gap-1">
        <Text className="text-sm" style={{ color: colors.label }}>
          {syncedLine(strings, account.lastSyncedAt, now)}
        </Text>
        {status ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {status}
          </Text>
        ) : null}
        {account.status === 'error' && account.error ? (
          <Text selectable className="text-xs" style={{ color: colors.secondaryLabel }}>
            {account.error}
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
              ask('none')
              onSignOut('keep')
            }}
          />
          <Button
            {...destructive}
            title={copy.removeData}
            onPress={() => {
              ask('none')
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
            onPress={() => ask('delete-choice')}
          />
          {cancel}
        </Question>
      ) : null}

      {thing.step === 'delete-choice' ? (
        <Question title={copy.deleteChoiceTitle} body={copy.deleteChoiceBody}>
          <Button
            {...destructive}
            title={copy.keepData}
            onPress={() => {
              ask('none')
              onDeleteAccount('keep')
            }}
          />
          <Button
            {...destructive}
            title={copy.removeData}
            onPress={() => {
              ask('none')
              onDeleteAccount('remove')
            }}
          />
          {cancel}
        </Question>
      ) : null}

      {thing.step === 'none' ? (
        <>
          <Row title={copy.syncNow} onPress={busy ? undefined : onSyncNow} />
          <Row title={copy.signOut} detail={copy.signOutDetail} onPress={() => ask('sign-out')} />
          <Row
            title={copy.deleteAccount}
            detail={copy.deleteAccountDetail}
            onPress={() => ask('delete')}
          />
        </>
      ) : null}
    </Screen>
  )
}
