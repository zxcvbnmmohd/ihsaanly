import type { ReactElement } from 'react'
import { useHijriOffset } from '@/hijri/store'
import { supportedLanguageOf } from '@/i18n/locale'
import { useLocale } from '@/i18n/store'
import { useUserState } from '@/plan/user-state-store'
import { usePlace } from '@/location/store'
import { useQada } from '@/prayer/marks'
import { useCalculationPreferences } from '@/prayer/store'
import { MoreScreen } from '@/screens/more'
import { useStrings } from '@/strings'
import { useThemePreference } from '@/theme/store'

export default function MoreRoute(): ReactElement {
  const strings = useStrings()
  const place = usePlace()
  const calculation = useCalculationPreferences()
  const hijriOffset = useHijriOffset()
  const userState = useUserState()
  const locale = useLocale()
  const theme = useThemePreference()
  const owed = Object.values(useQada()).reduce((sum, count) => sum + (count ?? 0), 0)

  const tracking = [
    userState.travelling ? strings.tracking.travelling : null,
    userState.trackingPaused ? strings.tracking.paused : null,
  ].filter(Boolean)

  return (
    <MoreScreen
      locationHref="/location"
      locationLabel={place?.label ?? strings.location.notSet}
      calculationHref="/calculation"
      calculationLabel={strings.asr[calculation.asr]}
      hijriHref="/hijri"
      hijriLabel={strings.hijri.offsetLabel(hijriOffset)}
      trackingHref="/tracking"
      aboutHref="/about"
      notificationsHref="/notifications"
      eventsHref="/events"
      historyHref="/history"
      qadaHref="/qada"
      qadaLabel={owed > 0 ? strings.qada.summary(owed) : strings.qada.none}
      dataHref="/data"
      languageHref="/language"
      languageLabel={strings.language.names[supportedLanguageOf(locale)]}
      appearanceHref="/appearance"
      appearanceLabel={strings.appearance[theme]}
      trackingLabel={tracking.length > 0 ? tracking.join(', ') : strings.tracking.title}
    />
  )
}
