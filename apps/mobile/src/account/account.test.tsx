import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import * as session from '@ihsaanly/state/cloud/session'
import { act, render, waitFor } from '@testing-library/react'
import { Linking } from 'react-native'
import { buttons, installProviderButtons, screens } from '../../test/accounts'
import { run } from '../../test/act'
import { installAppearance, restoreAppearance, restoreOS, setOS } from '../../test/theme'

installProviderButtons()
const { MobileAccount } = await import('./account')
const { setThemePreference } = await import('@/theme/store')
const { LEGAL_URLS } = await import('@/cloud')

interface Props {
  providers: string[]
  legal: { termsUrl: string; privacyUrl: string; onOpen: (url: string) => void }
  renderSignInButton: (provider: string, onPress: () => void, disabled: boolean) => React.ReactNode
  restore: unknown
  onSignIn: (provider: string) => void
  onSyncNow: () => void
  onSignOut: (mode: string) => void
  onResolveMismatch: (mode: string) => void
  onDeleteAccount: (mode: string) => void
  onLink: (provider: string) => void
  onCancelLink: () => void
}

const latest = (): Props => screens.account.at(-1) as unknown as Props

const spies: { mockRestore: () => void }[] = []
function spy<K extends keyof typeof session>(
  name: K,
): { mockRestore: () => void } & ReturnType<typeof spyOn> {
  const created = spyOn(session, name).mockResolvedValue(undefined as never)
  spies.push(created)
  return created
}

beforeEach(() => {
  installProviderButtons()
  installAppearance()
  setOS('android')
  setThemePreference('light')
  screens.account = []
  buttons.apple = []
  buttons.google = []
  buttons.appleAvailable = true
})
afterEach(() => {
  for (const created of spies.splice(0)) created.mockRestore()
  restoreOS()
  restoreAppearance()
})

describe('MobileAccount providers', () => {
  it('offers only Google where Apple sign-in does not exist', () => {
    render(<MobileAccount />)
    expect(latest().providers).toEqual(['google'])
  })

  it('adds Apple, first, on an iOS device that supports it', async () => {
    setOS('ios')
    render(<MobileAccount />)
    expect(latest().providers).toEqual(['google'])
    await waitFor(() => expect(latest().providers).toEqual(['apple', 'google']))
  })

  it('keeps Google alone on an iOS device without Apple sign-in', async () => {
    setOS('ios')
    buttons.appleAvailable = false
    render(<MobileAccount />)
    await run(async () => {
      await Promise.resolve()
    })
    expect(latest().providers).toEqual(['google'])
  })
})

describe('MobileAccount wiring', () => {
  it('passes restore through, and the published terms and privacy pages', () => {
    const restore = { outcome: 'restored' }
    render(<MobileAccount restore={restore as never} />)
    expect(latest().restore).toBe(restore)
    expect(latest().legal.termsUrl).toBe(LEGAL_URLS.terms)
    expect(latest().legal.privacyUrl).toBe(LEGAL_URLS.privacy)
  })

  it('opens legal pages in the system browser', () => {
    const open = spyOn(Linking, 'openURL').mockResolvedValue(true as never)
    spies.push(open)
    render(<MobileAccount />)
    latest().legal.onOpen('https://example.com/x')
    expect(open).toHaveBeenCalledWith('https://example.com/x')
  })

  it('routes every action to the session', () => {
    const signIn = spy('signIn')
    const syncNow = spy('syncNow')
    const signOut = spy('signOut')
    const resolveMismatch = spy('resolveMismatch')
    const deleteAccount = spy('deleteAccount')
    const linkProvider = spy('linkProvider')
    const cancelLink = spy('cancelLink')
    render(<MobileAccount />)
    const props = latest()

    props.onSignIn('google')
    props.onSyncNow()
    props.onSignOut('remove')
    props.onResolveMismatch('merge')
    props.onDeleteAccount('keep')
    props.onLink('apple')
    props.onCancelLink()

    expect(signIn).toHaveBeenCalledWith('google')
    expect(syncNow).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith('remove')
    expect(resolveMismatch).toHaveBeenCalledWith('merge')
    expect(deleteAccount).toHaveBeenCalledWith('keep')
    expect(linkProvider).toHaveBeenCalledWith('apple')
    expect(cancelLink).toHaveBeenCalledTimes(1)
  })
})

describe('the official sign-in buttons', () => {
  function mount(
    provider: string,
    disabled: boolean,
  ): { pressed: string[]; container: HTMLElement } {
    render(<MobileAccount />)
    const pressed: string[] = []
    const { container } = render(
      <>{latest().renderSignInButton(provider, () => pressed.push(provider), disabled)}</>,
    )
    return { pressed, container }
  }

  it("draws Apple's own button, black in light mode and white in dark", () => {
    mount('apple', false)
    expect(buttons.apple.at(-1)).toMatchObject({ buttonType: 0, buttonStyle: 2, cornerRadius: 24 })

    act(() => setThemePreference('dark'))
    mount('apple', false)
    expect(buttons.apple.at(-1)).toMatchObject({ buttonStyle: 0 })
  })

  it("draws Google's own button in the scheme's colour", () => {
    mount('google', false)
    expect(buttons.google.at(-1)).toMatchObject({ size: 1, color: 1, disabled: false })

    act(() => setThemePreference('dark'))
    mount('google', false)
    expect(buttons.google.at(-1)).toMatchObject({ color: 0 })
  })

  it('passes the press through to the provider button', () => {
    const { pressed } = mount('apple', false)
    const onPress = buttons.apple.at(-1)?.onPress as () => void
    onPress()
    expect(pressed).toEqual(['apple'])
  })

  it('dims the wrapper and blocks touches while signing in', () => {
    const idle = mount('google', false).container.firstElementChild as HTMLElement
    expect(idle.style.opacity).toBe('1')

    const busy = mount('google', true).container.firstElementChild as HTMLElement
    expect(busy.style.opacity).toBe('0.6')
    // react-native-web turns pointerEvents into a class: only the busy wrapper swallows touches.
    expect(busy.className).not.toBe(idle.className)
    expect(buttons.google.at(-1)).toMatchObject({ disabled: true })
  })
})
