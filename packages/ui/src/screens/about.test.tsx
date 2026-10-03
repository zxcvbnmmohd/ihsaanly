import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { AboutScreen } from './about'
import { aboutFixture } from './fixtures'

describe('AboutScreen', () => {
  it('shows version with build, unreviewed content and every link', async () => {
    const onPress = {
      donate: mock(() => {}),
      privacy: mock(() => {}),
      terms: mock(() => {}),
      licence: mock(() => {}),
    }
    const { user, strings } = renderScreen(
      <AboutScreen
        {...aboutFixture}
        donate={{ destination: 'donate.example', onPress: onPress.donate }}
        privacy={{ destination: 'privacy.example', onPress: onPress.privacy }}
        terms={{ destination: 'terms.example', onPress: onPress.terms }}
        licences={[{ label: 'Amiri', destination: 'ofl.example', onPress: onPress.licence }]}
      />,
    )
    expect(screen.getByText('1.0.0 (12)')).toBeInTheDocument()
    expect(screen.getByText(strings.about.contentUnreviewed(32))).toBeInTheDocument()
    expect(screen.getByText(strings.about.donateBody)).toBeInTheDocument()
    expect(screen.getByText(strings.about.privacyBody)).toBeInTheDocument()
    expect(screen.getByText(strings.about.licencesBody)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: named(strings.about.donate) }))
    await user.click(screen.getByRole('button', { name: named(strings.about.privacyPolicy) }))
    await user.click(screen.getByRole('button', { name: named(strings.about.termsOfUse) }))
    await user.click(screen.getByRole('button', { name: named('Amiri') }))
    for (const handler of Object.values(onPress)) expect(handler).toHaveBeenCalledTimes(1)
  })

  it('shows who reviewed the content, a bare version and omits donate and terms', () => {
    const { strings } = renderScreen(
      <AboutScreen
        {...aboutFixture}
        build={null}
        reviewedBy="Shaykh Test"
        donate={null}
        terms={undefined}
        licences={[]}
      />,
    )
    expect(screen.getByText('1.0.0')).toBeInTheDocument()
    expect(screen.getByText(strings.about.contentReviewedBy('Shaykh Test', 32))).toBeInTheDocument()
    expect(screen.queryByText(strings.about.donateBody)).toBeNull()
    expect(screen.queryByRole('button', { name: named(strings.about.termsOfUse) })).toBeNull()
  })
})
