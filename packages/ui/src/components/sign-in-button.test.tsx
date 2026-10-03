import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { SignInButton } from './sign-in-button'

// `?native` loads the native file itself: the preload only swaps a `.web` sibling in for the
// plain path. A template, so TypeScript does not look for a module of that name.
const NATIVE = '.tsx?native'
type Button = typeof SignInButton

// The preload swaps a `.web` sibling in for the native file; `?native` loads
// the native file itself, so both implementations are held to one contract.
const variants = [
  ['web', async (): Promise<Button> => SignInButton],
  ['native', async (): Promise<Button> => (await import(`./sign-in-button${NATIVE}`)).SignInButton],
] as const

describe.each(variants)('SignInButton (%s)', (_name, load) => {
  it.each([
    ['apple', 'signInWithApple'],
    ['google', 'signInWithGoogle'],
  ] as const)('is the approved %s title and presses', async (provider, key) => {
    const Button = await load()
    const onPress = mock(() => {})
    const { user, strings } = renderScreen(<Button provider={provider} onPress={onPress} />)
    await user.click(screen.getByRole('button', { name: strings.account[key] }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it.each(['apple', 'google'] as const)(
    'does nothing when %s is disabled, in dark mode',
    async (provider) => {
      const Button = await load()
      const onPress = mock(() => {})
      const { user } = renderScreen(<Button provider={provider} onPress={onPress} disabled />, {
        scheme: 'dark',
      })
      const button = screen.getByRole('button')
      await user.click(button)
      expect(onPress).not.toHaveBeenCalled()
    },
  )

  it('is localised', async () => {
    const Button = await load()
    const { strings } = renderScreen(<Button provider="google" onPress={() => {}} />, {
      locale: 'fr',
    })
    expect(
      screen.getByRole('button', { name: strings.account.signInWithGoogle }),
    ).toBeInTheDocument()
  })
})
