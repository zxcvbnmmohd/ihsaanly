import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, screen, waitFor } from '@testing-library/react'
import { AccessibilityInfo, Text } from 'react-native'
import { renderScreen } from '../../test/render'
import { useColors } from '../colors'
import { Surface, webInteractiveStyle } from './surface.web'

// `?native` loads the native file itself: the preload only swaps a `.web` sibling in for the
// plain path. A template, so TypeScript does not look for a module of that name.
const NATIVE = '.tsx?native'

// react-native-web has no Reduce Transparency setting, so the native Surface's
// two AccessibilityInfo calls are stood in for.
const info = AccessibilityInfo as unknown as Record<string, unknown>
const original = { ...info }

beforeEach(() => {
  info.isReduceTransparencyEnabled = async () => false
  info.addEventListener = () => ({ remove: () => {} })
})

afterEach(() => {
  process.env.EXPO_OS = 'web'
  Object.assign(info, original)
})

describe('Surface (web)', () => {
  it('wraps its children on the warm veil', () => {
    renderScreen(
      <Surface interactive style={{ padding: 4 }}>
        <Text>Inside</Text>
      </Surface>,
    )
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })
})

describe('webInteractiveStyle', () => {
  function styleFor(state: {
    pressed: boolean
    hovered?: boolean
    focused?: boolean
  }): ReturnType<typeof webInteractiveStyle> {
    let result: ReturnType<typeof webInteractiveStyle> = []
    function Probe(): null {
      result = webInteractiveStyle(state, useColors())
      return null
    }
    renderScreen(<Probe />)
    return result
  }

  it('is empty at rest', () => {
    expect(styleFor({ pressed: false })).toEqual([{}, {}])
  })

  it('tints on hover', () => {
    const [hover] = styleFor({ pressed: false, hovered: true })
    expect(hover).toHaveProperty('backgroundColor')
  })

  it('rings on focus', () => {
    const [, focus] = styleFor({ pressed: false, focused: true })
    expect(focus).toMatchObject({ outlineWidth: 2, outlineStyle: 'solid' })
  })
})

/** Lets the pending Reduce Transparency promise land inside act. */
async function settle(): Promise<void> {
  // biome-ignore lint/nursery/useAwaitThenable: act returns a thenable for an async callback.
  await act(async () => {})
}

describe('Surface (native)', () => {
  // One module instance for every test: coverage is recorded per file, and a
  // second instance of the same file would replace the first's record.
  let glassAvailable = false
  const load = async (): Promise<typeof Surface> => {
    mock.module('expo-glass-effect', () => ({
      GlassView: ({ children }: { children?: unknown }) => (
        <div data-testid="glass">{children as never}</div>
      ),
      isLiquidGlassAvailable: () => glassAvailable,
      isGlassEffectAPIAvailable: () => glassAvailable,
    }))
    mock.module('expo-blur', () => ({
      BlurView: ({ children }: { children?: unknown }) => (
        <div data-testid="blur">{children as never}</div>
      ),
    }))
    return (await import(`./surface${NATIVE}`)).Surface
  }

  afterEach(() => {
    glassAvailable = false
  })

  it('is liquid glass on iOS 26+', async () => {
    const Native = await load()
    process.env.EXPO_OS = 'ios'
    glassAvailable = true
    renderScreen(
      <Native interactive>
        <Text>In</Text>
      </Native>,
    )
    await settle()
    expect(screen.getByTestId('glass')).toHaveTextContent('In')
  })

  it('is a system material blur on older iOS', async () => {
    const Native = await load()
    process.env.EXPO_OS = 'ios'
    renderScreen(
      <Native>
        <Text>In</Text>
      </Native>,
    )
    await settle()
    expect(screen.getByTestId('blur')).toHaveTextContent('In')
    expect(screen.queryByTestId('glass')).toBeNull()
  })

  it.each(['android', 'web'] as const)('is a veil on %s', async (os) => {
    const Native = await load()
    process.env.EXPO_OS = os
    glassAvailable = true
    renderScreen(
      <Native>
        <Text>In</Text>
      </Native>,
    )
    await settle()
    expect(screen.getByText('In')).toBeInTheDocument()
    expect(screen.queryByTestId('blur')).toBeNull()
    expect(screen.queryByTestId('glass')).toBeNull()
  })

  it('falls back to a solid fill when Reduce Transparency is on', async () => {
    const Native = await load()
    process.env.EXPO_OS = 'ios'
    info.isReduceTransparencyEnabled = async () => true
    renderScreen(
      <Native>
        <Text>In</Text>
      </Native>,
    )
    await waitFor(() => expect(screen.queryByTestId('blur')).toBeNull())
    expect(screen.getByText('In')).toBeInTheDocument()
  })

  it('keeps the default when the Reduce Transparency query rejects', async () => {
    const Native = await load()
    process.env.EXPO_OS = 'ios'
    info.isReduceTransparencyEnabled = async () => {
      throw new Error('unsupported')
    }
    renderScreen(
      <Native>
        <Text>In</Text>
      </Native>,
    )
    await settle()
    expect(screen.getByTestId('blur')).toBeInTheDocument()
  })

  it('follows later changes to Reduce Transparency and unsubscribes', async () => {
    const Native = await load()
    process.env.EXPO_OS = 'ios'
    let listener: ((value: boolean) => void) | undefined
    const remove = mock(() => {})
    info.addEventListener = (_event: string, handler: (value: boolean) => void) => {
      listener = handler
      return { remove }
    }
    const { unmount } = renderScreen(
      <Native>
        <Text>In</Text>
      </Native>,
    )
    await settle()
    expect(screen.getByTestId('blur')).toBeInTheDocument()
    act(() => listener?.(true))
    expect(screen.queryByTestId('blur')).toBeNull()
    unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
