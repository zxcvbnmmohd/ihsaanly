import { expect, test } from './fixtures.ts'
import { chooseCity, go } from './helpers.ts'

const planAlarms = (worker: import('@playwright/test').Worker): Promise<string[]> =>
  worker.evaluate(async () =>
    (await chrome.alarms.getAll())
      .map((a: { name: string }) => a.name)
      .filter((n: string) => n.startsWith('plan:')),
  )

test('with a location, reminders become chrome.alarms and the badge shows a countdown', async ({
  openPopup,
  worker,
}) => {
  const { page, errors } = await openPopup()
  expect(await planAlarms(worker)).toEqual([])
  await chooseCity(page)

  await expect.poll(() => planAlarms(worker)).not.toEqual([])
  const names = await worker.evaluate(async () =>
    (await chrome.alarms.getAll()).map((a: { name: string }) => a.name),
  )
  expect(names).toContain('badge')
  const badge = await worker.evaluate(async () =>
    (await chrome.alarms.getAll()).find((a: { name: string }) => a.name === 'badge'),
  )
  expect(badge?.periodInMinutes).toBe(1)
  await expect
    .poll(() => worker.evaluate(() => chrome.action.getBadgeText({})))
    .toMatch(/^\d+[mh]$/)
  expect(errors).toEqual([])
})

test('turning the reminder categories off clears the plan alarms; on again restores them', async ({
  openPopup,
  worker,
}) => {
  const { page } = await openPopup()
  await chooseCity(page)
  await expect.poll(() => planAlarms(worker)).not.toEqual([])

  await go(page, '/notifications')
  await page.getByRole('switch', { name: 'Morning and evening adhkar' }).click()
  await page.getByRole('switch', { name: 'Upcoming fasting days' }).click()
  await expect.poll(() => planAlarms(worker)).toEqual([])
  // The badge countdown is not a reminder and stays.
  expect(
    await worker.evaluate(async () =>
      (await chrome.alarms.getAll()).map((a: { name: string }) => a.name),
    ),
  ).toContain('badge')

  await page.getByRole('switch', { name: 'Morning and evening adhkar' }).click()
  await expect.poll(() => planAlarms(worker)).not.toEqual([])
})

test('the notifications screen says how far reminders are set', async ({ openPopup, worker }) => {
  const { page } = await openPopup()
  await chooseCity(page)
  await expect.poll(() => planAlarms(worker)).not.toEqual([])
  await go(page, '/notifications')
  await expect(page.getByText(/Reminders are set through/)).toBeVisible()
})

test('without a location the badge is empty and there are no reminders', async ({
  openPopup,
  worker,
}) => {
  await openPopup()
  expect(await worker.evaluate(() => chrome.action.getBadgeText({}))).toBe('')
  expect(await planAlarms(worker)).toEqual([])
})

test('the worker turns a due reminder alarm into a notification', async ({ openPopup, worker }) => {
  await openPopup()
  const shown = await worker.evaluate(async () => {
    await chrome.storage.local.set({
      'plan:test@1': {
        title: 'Test title',
        body: 'Test body',
        itemId: null,
        endsAt: null,
        actions: { done: 'Done', later: 'Later' },
      },
    })
    await chrome.alarms.create('plan:test@1', { when: Date.now() + 200 })
    // The reminder moves from storage.local to storage.session once shown.
    for (let i = 0; i < 50; i++) {
      const s = await chrome.storage.session.get('plan:test@1')
      if (s['plan:test@1'])
        return (await chrome.storage.local.get('plan:test@1'))['plan:test@1'] === undefined
      await new Promise((r) => setTimeout(r, 100))
    }
    return false
  })
  expect(shown).toBe(true)
})
