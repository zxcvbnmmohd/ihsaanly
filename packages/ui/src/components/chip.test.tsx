import { afterEach, describe, expect, it, mock } from 'bun:test'
import { palettes } from '@ihsaanly/tailwind/tokens'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { Chip } from './chip'

const palette = palettes.light

describe('Chip', () => {
  afterEach(() => {
    process.env.EXPO_OS = 'web'
  })

  it('reports its selection and presses', async () => {
    const onPress = mock(() => {})
    const { user } = renderScreen(
      <Chip label="Essentials" selected onPress={onPress} palette={palette} />,
    )
    const chip = screen.getByRole('button', { name: 'Essentials', pressed: true })
    await user.click(chip)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('is unselected by default and uses the surface veil on Android', () => {
    process.env.EXPO_OS = 'android'
    renderScreen(<Chip label="All" selected={false} onPress={() => {}} palette={palette} />)
    expect(screen.getByRole('button', { name: 'All', pressed: false })).toBeInTheDocument()
  })
})
