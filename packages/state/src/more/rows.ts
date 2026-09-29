import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { moreGroups } from '@ihsaanly/ui/props/more'
import type { MoreGroup, ThemePreference } from '@ihsaanly/ui/types'
import { useAccount } from '../cloud/session'
import { useHijriOffset } from '../hijri/store'
import { useLocale } from '../i18n/store'
import { usePlace } from '../location/store'
import { useUserState } from '../plan/user-state-store'
import { useQada } from '../prayer/marks'
import { useCalculationPreferences } from '../prayer/store'
import { useStrings } from '../strings'

/**
 * The settings list as data, so More can render it and Search can look through
 * it. Reads the stores and hands the values to the pure builder, which
 * decides what each row is called and what it currently says. Theme lives
 * outside this package — each host's own store differs — so it is taken as a
 * parameter rather than read here, as is whether this build has a cloud.
 */
export function useMoreGroups(theme: ThemePreference, cloud = false): MoreGroup[] {
  const strings = useStrings()
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const userState = useUserState()
  const locale = useLocale()
  const account = useAccount().account
  const owed = Object.values(useQada()).reduce((sum, count) => sum + (count ?? 0), 0)

  return moreGroups({
    strings,
    placeLabel: place?.label ?? null,
    asr: calculation.asr,
    hijriOffset,
    travelling: userState.travelling,
    trackingPaused: userState.trackingPaused,
    language: supportedLanguageOf(locale),
    theme,
    qadaOwed: owed,
    accountDetail: cloud
      ? (account?.email ??
        account?.displayName ??
        (account ? strings.account.signedInWith[account.provider] : strings.account.notSignedIn))
      : undefined,
  })
}
