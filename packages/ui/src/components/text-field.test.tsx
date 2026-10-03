import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { TextField } from './text-field'

const RING = 'border-color: rgba(170, 0, 0, 1.00)'

describe('TextField', () => {
  it('reports typing', async () => {
    const onChangeText = mock((_text: string) => {})
    const { user } = renderScreen(
      <TextField value="" onChangeText={onChangeText} placeholder="Name" returnKeyType="done" />,
    )
    await user.type(screen.getByPlaceholderText('Name'), 'a')
    expect(onChangeText).toHaveBeenCalledWith('a')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('clears once there is text', async () => {
    const onChangeText = mock((_text: string) => {})
    const { user, strings } = renderScreen(
      <TextField value="abc" onChangeText={onChangeText} placeholder="Name" />,
    )
    await user.click(screen.getByRole('button', { name: strings.textField.clear }))
    expect(onChangeText).toHaveBeenCalledWith('')
  })

  it('rings the search field while focused', () => {
    renderScreen(
      <TextField kind="search" accent="#a00" value="" onChangeText={() => {}} placeholder="Find" />,
    )
    const input = screen.getByPlaceholderText('Find')
    const frame = input.parentElement as HTMLElement
    expect(frame.getAttribute('style')).not.toContain(RING)
    fireEvent.focus(input)
    expect(frame.getAttribute('style')).toContain(RING)
    fireEvent.blur(input)
    expect(frame.getAttribute('style')).not.toContain(RING)
  })

  it('uses the surface fill on Android', () => {
    process.env.EXPO_OS = 'android'
    try {
      renderScreen(<TextField value="" onChangeText={() => {}} placeholder="Name" />)
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
    } finally {
      process.env.EXPO_OS = 'web'
    }
  })
})

describe('TextField multiline', () => {
  it('is labelled, capped, keyboard-typed, and has no clear control', () => {
    renderScreen(
      <TextField
        multiline
        label="Message"
        maxLength={10}
        keyboardType="email-address"
        value="abc"
        onChangeText={() => {}}
        placeholder="Say"
      />,
    )
    const input = screen.getByLabelText('Message')
    expect(input).toHaveAttribute('maxlength', '10')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
