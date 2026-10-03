import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Button } from './button'

describe('Button', () => {
  it('presses a primary button', async () => {
    const onPress = mock(() => {})
    const { user } = renderScreen(<Button title="Save" onPress={onPress} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('presses a secondary button, in dark mode', async () => {
    const onPress = mock(() => {})
    const { user } = renderScreen(
      <Button title="Later" variant="secondary" color="#123456" onColor="#fff" onPress={onPress} />,
      { scheme: 'dark' },
    )
    await user.click(screen.getByRole('button', { name: 'Later' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it.each(['primary', 'secondary'] as const)(
    'does not fire when a %s button is disabled',
    async (variant) => {
      const onPress = mock(() => {})
      const { user } = renderScreen(
        <Button title="Go" variant={variant} disabled onPress={onPress} />,
      )
      const button = screen.getByRole('button', { name: 'Go' })
      expect(button).toHaveAttribute('aria-disabled', 'true')
      await user.click(button)
      expect(onPress).not.toHaveBeenCalled()
    },
  )
})
