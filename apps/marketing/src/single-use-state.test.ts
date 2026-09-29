// The one-useState-per-file convention, checked across this app's source.
import { expect, test } from 'bun:test'
import { offendersUnder } from '@ihsaanly/lint/single-use-state'

test('every file in src follows single-use-state', async () => {
  expect(await offendersUnder(`${import.meta.dir}/..`)).toEqual([])
})
