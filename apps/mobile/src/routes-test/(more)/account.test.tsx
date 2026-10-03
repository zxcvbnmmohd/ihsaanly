import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  account: { status: string; account: unknown }
  providers: string[]
  restore: unknown
  legal: { termsUrl: string; privacyUrl: string }
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/account', 'AccountScreen')

const { default: AccountRoute } = await import('../../app/(more)/account')
const { LEGAL_URLS } = await import('@/cloud')

describe('account route', () => {
  beforeEach(() => {
    renders.length = 0
  })

  it('renders the mobile Account screen, signed out, for settings rather than for restoring', () => {
    render(<AccountRoute />)
    const props = last(renders)
    expect(props.account.status).toBe('signed-out')
    expect(props.account.account).toBeNull()
    expect(props.providers).toEqual(['google'])
    expect(props.restore).toBeUndefined()
    expect(props.legal).toMatchObject({
      termsUrl: LEGAL_URLS.terms,
      privacyUrl: LEGAL_URLS.privacy,
    })
  })
})
