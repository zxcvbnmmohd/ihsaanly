import type { SystemColors, UiLinkProps } from '@ihsaanly/ui/provider'
import { UiProvider } from '@ihsaanly/ui/provider'
import { type Href, Link } from 'expo-router'
import { type ReactElement, type ReactNode, useEffect } from 'react'
import { colorScheme } from 'react-native-css'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { useEffectiveColorScheme } from '@/theme/store'

function RouterLink({ href, ...props }: UiLinkProps): ReactNode {
  return <Link href={href as Href} {...props} />
}

/**
 * Reads the `colors` getters for one scheme. The scheme is an argument, not
 * read inside, so React Compiler memoises per scheme instead of freezing the
 * first answer: the getters resolve Android's Material colours at read time.
 */
function systemColorsFor(_scheme: 'light' | 'dark'): SystemColors {
  return {
    label: colors.label,
    secondaryLabel: colors.secondaryLabel,
    separator: colors.separator,
    systemBackground: colors.systemBackground,
    secondarySystemBackground: colors.secondarySystemBackground,
    tint: colors.tint,
    onTint: colors.onTint,
  }
}

interface MobileUiProviderProps {
  children: ReactNode
}

/**
 * Feeds @ihsaanly/ui from the app: strings from the locale store, the scheme
 * the theme preference resolves to, expo-router's Link, and the OS colours.
 * Screens paint with these in `style` (useColors in @ihsaanly/ui): NativeWind 5
 * (RC) did not apply stylesheet colour variables on native, nor runtime ones
 * supplied through its VariableContextProvider.
 */
export function MobileUiProvider({ children }: MobileUiProviderProps): ReactElement {
  const strings = useStrings()
  const scheme = useEffectiveColorScheme()
  const systemColors = systemColorsFor(scheme)

  // NativeWind's `dark:` and prefers-color-scheme follow Appearance, which
  // applyThemePreference sets. On Android, Dark to System can leave that cache
  // on the scheme being left (see useEffectiveColorScheme), so the stylesheet
  // is told the scheme the app actually renders in, after every render.
  useEffect(() => {
    colorScheme.set(scheme)
  })

  return (
    <UiProvider value={{ strings, scheme, Link: RouterLink, systemColors }}>{children}</UiProvider>
  )
}
