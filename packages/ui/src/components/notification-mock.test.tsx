import { afterEach, describe, expect, it } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { NotificationMock } from './notification-mock'

const props = {
  title: 'Evening adhkar',
  body: 'The evening remembrance, from Asr until the light goes.',
  actions: ['Done', 'Later'],
} as const

afterEach(() => {
  process.env.EXPO_OS = 'web'
})

describe('NotificationMock', () => {
  it('draws iOS by default: the title beside "now", the body, and the actions as a menu', () => {
    const { strings } = renderScreen(<NotificationMock {...props} />)
    const card = screen.getByTestId('notification-preview')
    expect(within(card).getByText(props.title)).toBeInTheDocument()
    expect(within(card).getByText(props.body)).toBeInTheDocument()
    expect(within(card).getByText(strings.onboarding.previewNow)).toBeInTheDocument()
    expect(within(card).getByText('Done')).toBeInTheDocument()
    expect(within(card).getByText('Later')).toBeInTheDocument()
    // iOS shows no app name on a notification with a title; its icon says whose it is.
    expect(within(card).queryByText(/Ihsaanly/)).toBeNull()
    // A picture: nothing on it can be pressed.
    expect(within(card).queryByRole('button')).toBeNull()
  })

  it('draws Android on Android: "Ihsaanly · now" over the title, body and text buttons', () => {
    process.env.EXPO_OS = 'android'
    const { strings } = renderScreen(<NotificationMock {...props} />)
    const card = screen.getByTestId('notification-preview')
    expect(
      within(card).getByText(`Ihsaanly · ${strings.onboarding.previewNow}`),
    ).toBeInTheDocument()
    expect(within(card).getByText(props.title)).toBeInTheDocument()
    expect(within(card).getByText(props.body)).toBeInTheDocument()
    expect(within(card).getByText('Later')).toBeInTheDocument()
  })

  it('draws the platform it is asked for', () => {
    renderScreen(<NotificationMock {...props} platform="android" />)
    expect(screen.getByText(/^Ihsaanly · /)).toBeInTheDocument()
  })
})
