import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { type ReactElement, useState } from 'react'
import { Pressable, Text } from 'react-native'
import { renderScreen } from '../../test/render'
import { RecedeProvider, useRecede } from './recede'

function Receding(): null {
  useRecede()
  return null
}

interface Thing {
  open: boolean
}

function Host(): ReactElement {
  const [thing, setThing] = useState<Thing>({ open: false })
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setThing({ open: !thing.open })}>
        <Text>Toggle</Text>
      </Pressable>
      {thing.open ? <Receding /> : null}
    </>
  )
}

describe('RecedeProvider', () => {
  it('steps the app back while a receding component is mounted', async () => {
    const { user } = renderScreen(
      <RecedeProvider>
        <Host />
      </RecedeProvider>,
    )
    const button = screen.getByRole('button', { name: 'Toggle' })
    await user.click(button)
    await user.click(button)
    expect(button).toBeInTheDocument()
  })

  it('does nothing without a provider', () => {
    renderScreen(<Receding />)
  })
})
