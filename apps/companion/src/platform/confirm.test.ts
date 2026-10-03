import { afterEach, expect, it } from 'bun:test'
import { confirmAction } from './confirm'

const original = window.confirm

afterEach(() => {
  window.confirm = original
})

it('asks the browser and returns its answer', () => {
  const asked: string[] = []
  window.confirm = (message?: string) => {
    asked.push(message ?? '')
    return message === 'yes?'
  }
  expect(confirmAction('yes?')).toBe(true)
  expect(confirmAction('no?')).toBe(false)
  expect(asked).toEqual(['yes?', 'no?'])
})
