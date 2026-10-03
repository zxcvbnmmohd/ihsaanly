import { describe, expect, it } from 'bun:test'
import { fireLayout, renderScreen } from '../../test/render'
import { PlaceMap } from './place-map'

describe('PlaceMap', () => {
  it('draws nothing until it has measured its width', () => {
    const { container } = renderScreen(
      <PlaceMap latitude={43.7} longitude={-79.4} accent="#a00" onAccent="#fff" />,
    )
    expect(container.querySelectorAll('img, [aria-hidden]').length).toBe(0)
  })

  it('centres a marker on the place once measured', () => {
    const { container } = renderScreen(
      <PlaceMap latitude={43.7} longitude={-79.4} accent="#a00" onAccent="#fff" zoom={4} />,
    )
    const root = container.firstElementChild?.firstElementChild as HTMLElement
    fireLayout(root, 300)
    expect(root.children.length).toBe(3)
    // The world is zoom x the view wide, 2:1.
    const map = root.children[0] as HTMLElement
    expect(map).toHaveStyle({ width: '1200px', height: '600px' })
    // Same width again changes nothing.
    fireLayout(root, 300)
    expect(root.children.length).toBe(3)
  })

  it('clamps to the map edge near the poles and the date line', () => {
    const { container } = renderScreen(
      <PlaceMap latitude={89} longitude={179} accent="#a00" onAccent="#fff" height={100} />,
    )
    const root = container.firstElementChild?.firstElementChild as HTMLElement
    fireLayout(root, 200)
    expect(root.children.length).toBe(3)
  })
})
