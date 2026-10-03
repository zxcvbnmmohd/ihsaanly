import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FaqItem } from './faq-item'

test('shows the question, and the answer once opened', async () => {
  render(<FaqItem question="Why?" answer="Because." />)
  const details = document.querySelector('details') as HTMLDetailsElement
  expect(details.open).toBe(false)
  expect(screen.getByText('Why?').tagName).toBe('SUMMARY')
  await userEvent.click(screen.getByText('Why?'))
  expect(details.open).toBe(true)
  expect(screen.getByText('Because.')).toBeVisible()
})
