import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { ArabicText } from './arabic-text'

describe('ArabicText', () => {
  it('renders right to left in Arabic whatever the interface language', () => {
    renderScreen(<ArabicText>بِسْمِ اللَّهِ</ArabicText>)
    const text = screen.getByText('بِسْمِ اللَّهِ')
    expect(text).toHaveStyle({ direction: 'rtl', textAlign: 'right' })
    expect(text).toHaveAttribute('lang', 'ar')
    expect(text).toHaveAttribute('dir', 'rtl')
  })

  it('centres the hero variant', () => {
    renderScreen(<ArabicText variant="hero">الْحَمْدُ لِلَّهِ</ArabicText>)
    expect(screen.getByText('الْحَمْدُ لِلَّهِ')).toHaveStyle({ textAlign: 'center' })
  })
})
