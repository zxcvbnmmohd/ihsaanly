import { describe, expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { fill, plain, rich } from './rich-text'

function html(text: string): string {
  return render(<p>{rich(text)}</p>).container.innerHTML
}

describe('fill', () => {
  test('replaces known placeholders and leaves unknown ones', () => {
    expect(fill('{a} and {b} and {c}', { a: '1', b: '2' })).toBe('1 and 2 and {c}')
  })
})

describe('plain', () => {
  test('drops every tag', () => {
    expect(plain('Hello <strong>there</strong><br>, <a href="/x">friend</a>')).toBe(
      'Hello there, friend',
    )
  })
})

describe('rich', () => {
  test('renders links, strong, em and br as elements', () => {
    expect(html('a <a href="https://x.test/">b</a> <strong>c</strong> <em>d</em><br>e')).toBe(
      '<p>a <a href="https://x.test/">b</a> <strong>c</strong> <em>d</em><br>e</p>',
    )
  })

  test('keeps relative, anchor and mailto links, and neutralises anything else', () => {
    expect(html('<a href="/legal/">1</a>')).toContain('href="/legal/"')
    expect(html('<a href="#q">1</a>')).toContain('href="#q"')
    expect(html('<a href="mailto:a@b.c">1</a>')).toContain('href="mailto:a@b.c"')
    expect(html('<a href="javascript:alert(1)">1</a>')).toContain('href="#"')
    expect(html('<a>1</a>')).toContain('href="#"')
  })

  test('shows unknown tags as text, never as markup', () => {
    const rendered = render(<p>{rich('x <script>alert(1)</script> y')}</p>).container
    expect(rendered.querySelector('script')).toBeNull()
    expect(rendered.textContent).toBe('x <script>alert(1)</script> y')
  })

  test('ignores a stray closing tag and closes tags left open', () => {
    expect(html('a</strong>b')).toBe('<p>ab</p>')
    expect(html('<em>open')).toBe('<p><em>open</em></p>')
  })

  test('nests tags', () => {
    expect(html('<strong>a <em>b</em></strong>')).toBe('<p><strong>a <em>b</em></strong></p>')
  })
})
