import { afterAll, expect, it } from 'bun:test'

import { currentHomeTransition, noHomeTransition, setHomeTransitionSource } from './home-transition'

afterAll(() => setHomeTransitionSource(noHomeTransition))

it('reports no transition until a host registers a source', () => {
  expect(noHomeTransition()).toBeNull()
  setHomeTransitionSource(noHomeTransition)
  expect(currentHomeTransition()).toBeNull()
})

it('asks the registered source every time', () => {
  let answer: 'entering-home' | 'leaving-home' | null = 'entering-home'
  setHomeTransitionSource(() => answer)

  expect(currentHomeTransition()).toBe('entering-home')
  answer = 'leaving-home'
  expect(currentHomeTransition()).toBe('leaving-home')
})
