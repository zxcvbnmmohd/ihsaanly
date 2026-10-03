import { describe, expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { BrandMark, IconBack, IconLibrary, IconMore, IconSearch, IconToday } from './icons.tsx'

describe('icons', () => {
  test('each is a decorative SVG drawn from currentColor', () => {
    for (const Icon of [IconToday, IconLibrary, IconMore, IconBack, IconSearch]) {
      const { container, unmount } = render(<Icon />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(svg?.getAttribute('width')).toBe('24')
      expect(svg?.getAttribute('height')).toBe('24')
      expect(svg?.getAttribute('stroke')).toBe('currentColor')
      unmount()
    }
  })

  test('a class name reaches the SVG', () => {
    for (const Icon of [IconToday, IconLibrary, IconMore, IconSearch]) {
      const { container, unmount } = render(<Icon className="size-4" />)
      expect(container.querySelector('svg')).toHaveClass('size-4')
      unmount()
    }
  })

  test('the back chevron mirrors under RTL, with or without a class', () => {
    const plain = render(<IconBack />)
    expect(plain.container.querySelector('svg')).toHaveClass('rtl:-scale-x-100')
    plain.unmount()
    const styled = render(<IconBack className="text-red" />)
    expect(styled.container.querySelector('svg')).toHaveClass('rtl:-scale-x-100', 'text-red')
  })

  test('the brand mark is a 30px decorative star', () => {
    const { container } = render(<BrandMark className="mark" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('mark')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('width')).toBe('30')
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('currentColor')
  })

  test('renders a bare brand mark with no class', () => {
    const { container } = render(<BrandMark />)
    expect(container.querySelector('svg')).not.toHaveAttribute('class')
  })
})
