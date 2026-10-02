import type { CSSProperties, ReactElement } from 'react'

import { useUi } from '../provider'
import type { SignInProvider } from '../types'

export interface SignInButtonProps {
  provider: SignInProvider
  onPress: () => void
  disabled?: boolean
}

/**
 * Both buttons share one box, so neither is more prominent than the other:
 * 40px tall (Google's web height; Apple's minimum is 30pt), full width, pill.
 * Google allows a pill or a rectangle; Apple allows any radius up to a capsule.
 */
const HEIGHT = 40

/**
 * Google's "Sign in with Google" branding guidelines
 * (developers.google.com/identity/branding-guidelines): fill, 1px inside
 * stroke and text colour per theme, 12px before the logo, 10px between logo
 * and text, 12px after the text, text 14/20 in Google Sans Medium. Google Sans
 * is not bundled, so Roboto and then the system font stand in.
 */
const GOOGLE = {
  light: { fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F' },
  dark: { fill: '#131314', stroke: '#8E918F', text: '#E3E3E3' },
} as const

/**
 * Apple's HIG for Sign in with Apple: logo and title are black or white only —
 * a black button on light backgrounds, white on dark. Title in the system font
 * (SF on Apple platforms), sized at 43% of the button height.
 */
const APPLE = {
  light: { fill: '#000000', stroke: '#000000', text: '#FFFFFF' },
  dark: { fill: '#FFFFFF', stroke: '#FFFFFF', text: '#000000' },
} as const

const GOOGLE_FONT = "'Google Sans', Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif"
const APPLE_FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

/** The standard multicolour "G", as Google ships it in its own web button. */
function GoogleLogo(): ReactElement {
  return (
    <svg aria-hidden="true" focusable="false" width={20} height={20} viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

/**
 * The Apple logo glyph. The HIG asks for the logo artwork to span the button's
 * full height with its built-in padding, so the viewBox carries that padding:
 * the glyph sits at roughly the title's cap height inside a 40px-tall box.
 */
function AppleLogo({ color }: { color: string }): ReactElement {
  return (
    <svg aria-hidden="true" focusable="false" height={HEIGHT} width={22} viewBox="-5 -20 34 64">
      <path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </svg>
  )
}

/**
 * The web twin of `sign-in-button.tsx`: a real `<button>`, so keyboard, focus
 * ring and disabled state come from the browser. Titles are the approved
 * "Sign in with …" wording, localised (both brands allow translated titles),
 * and the visible title is the accessible name, so voice control matches it.
 */
export function SignInButton({
  provider,
  onPress,
  disabled = false,
}: SignInButtonProps): ReactElement {
  const { strings, scheme } = useUi()
  const apple = provider === 'apple'
  const colors = (apple ? APPLE : GOOGLE)[scheme === 'dark' ? 'dark' : 'light']

  const style: CSSProperties = {
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: apple ? 4 : 10,
    width: '100%',
    height: HEIGHT,
    paddingBlock: 0,
    paddingInline: 12,
    borderRadius: HEIGHT / 2,
    border: `1px solid ${colors.stroke}`,
    backgroundColor: colors.fill,
    color: colors.text,
    fontFamily: apple ? APPLE_FONT : GOOGLE_FONT,
    fontWeight: 500,
    fontSize: apple ? 17 : 14,
    lineHeight: apple ? '22px' : '20px',
    letterSpacing: apple ? 0 : 0.25,
    whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  }

  return (
    <button type="button" disabled={disabled} onClick={onPress} style={style}>
      {apple ? <AppleLogo color={colors.text} /> : <GoogleLogo />}
      <span>{apple ? strings.account.signInWithApple : strings.account.signInWithGoogle}</span>
    </button>
  )
}
