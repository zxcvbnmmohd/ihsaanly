import { describe, expect, it } from 'bun:test'

import { publishTimeline } from './publish'

describe('publishTimeline on platforms without widgets', () => {
  it('resolves without doing anything', async () => {
    await expect(publishTimeline([])).resolves.toBeUndefined()
  })
})
