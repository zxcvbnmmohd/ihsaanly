import '../../test/more'
import { describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { router } from '../../test/router'

const screenProps: { palette: { accent: string } }[] = []
mock.module('@ihsaanly/ui/components/screen', () => ({
  Screen: (props: { palette: { accent: string }; children: ReactNode }) => {
    screenProps.push(props)
    return <>{props.children}</>
  },
}))

const { default: NotFound } = await import('../app/+not-found')
const { getStrings } = await import('@ihsaanly/state/strings')
const { usePalette } = await import('@/theme/store')

describe('not found route', () => {
  it('titles the header and offers a way back to Today', () => {
    const strings = getStrings()
    render(<NotFound />)

    expect(router.screens).toEqual([expect.objectContaining({ title: strings.notFound.title })])
    expect(screen.getByText(strings.notFound.body)).toBeInTheDocument()
    expect(screen.getByText(strings.tabs.today).closest('a')?.getAttribute('data-href')).toBe('/')
  })

  it('paints with the current palette', () => {
    let palette: ReturnType<typeof usePalette> | undefined
    function Probe(): null {
      palette = usePalette()
      return null
    }
    render(
      <>
        <Probe />
        <NotFound />
      </>,
    )
    expect(screenProps.at(-1)?.palette).toEqual(palette as never)
  })
})
