import { expect, it } from 'bun:test'

import { noteLocalWrite, onLocalWrite } from './local-writes'

it('tells every listener which key was written, null for the event log', () => {
  const heard: (string | null)[] = []
  const stop = onLocalWrite((key) => heard.push(key))

  noteLocalWrite('locale')
  noteLocalWrite(null)
  stop()
  noteLocalWrite('after')

  expect(heard).toEqual(['locale', null])
})

it('never lets a failing listener reach the write or its neighbours', () => {
  const heard: (string | null)[] = []
  const stopBad = onLocalWrite(() => {
    throw new Error('sync is broken')
  })
  const stopGood = onLocalWrite((key) => heard.push(key))

  expect(() => noteLocalWrite('locale')).not.toThrow()
  expect(heard).toEqual(['locale'])
  stopBad()
  stopGood()
})
