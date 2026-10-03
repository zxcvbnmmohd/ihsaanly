import { expect, test } from './fixtures.ts'
import { chooseCity, go } from './helpers.ts'

test('an item opens from today and Done is recorded', async ({ openPopup }) => {
  const { page, errors } = await openPopup()
  await chooseCity(page)
  // The anchor is display: contents; a real click lands on the Pressable in it.
  const item = page.locator('a[href*="#/item/"]').first()
  const href = await item.getAttribute('href')
  expect(href).toMatch(/^\/popup\.html#\/item\//)
  await item.locator('> *').first().click()
  await expect(page).toHaveURL(new RegExp(`${(href as string).split('#')[1]}$`))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('WHY')).toBeVisible()
  await expect(page.getByText('EVIDENCE')).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByText('PRAYERS')).toBeVisible()
  expect(errors).toEqual([])
})

test('item view lets the user add it to today', async ({ openPopup }) => {
  const { page } = await openPopup()
  await go(page, '/item/siwak-before-prayer')
  const toggle = page.getByRole('switch', { name: /On Today/ })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
})

test('marking a prayer persists across popup reopen (history of the day)', async ({
  openPopup,
}) => {
  const first = await openPopup()
  await chooseCity(first.page)
  // Fajr's window may not be current; use whichever prayer box the app lets us tick.
  const boxes = first.page.getByRole('checkbox')
  await expect(boxes.first()).toBeVisible()
  const names = await boxes.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  let ticked: string | null = null
  for (const name of names) {
    const box = first.page.getByRole('checkbox', { name: name as string })
    await box.click()
    if ((await box.getAttribute('aria-checked')) === 'true') {
      ticked = name
      break
    }
  }
  expect(ticked).not.toBeNull()
  await first.page.close()

  const { page } = await openPopup()
  await expect(page.getByRole('checkbox', { name: ticked as string })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('qada: counts can be raised and lowered, and persist', async ({ openPopup }) => {
  const first = await openPopup()
  await go(first.page, '/qada')
  await expect(first.page.getByRole('heading', { name: 'To make up' })).toBeVisible()
  const add = first.page.getByRole('button', { name: 'Owed from before +' }).first()
  await add.click()
  await add.click()
  await expect(first.page.getByText('2').first()).toBeVisible()
  await first.page.getByRole('button', { name: 'Owed from before −' }).first().click()
  await expect(first.page.getByText('1').first()).toBeVisible()
  await first.page.close()

  const { page } = await openPopup()
  await go(page, '/qada')
  await expect(page.getByText('1').first()).toBeVisible()
})

test('fasts owed: the made-up button records one', async ({ openPopup }) => {
  const { page } = await openPopup()
  await go(page, '/qada')
  await expect(page.getByText('Fasts', { exact: true })).toBeVisible()
  // Raise the owed count from before, then record one made up.
  const fastOwed = page.getByRole('button', { name: 'Owed from before +' }).last()
  await fastOwed.click()
  await fastOwed.click()
  await page.getByRole('button', { name: 'Record one made up' }).click()
  await expect(page.getByText('2 owed')).toBeHidden()
  await expect(page.getByText('1 owed')).toBeVisible()
})

test('sunnah rows have circles; ticking one marks it done and Undo takes it back', async ({
  openPopup,
}) => {
  const { page, errors } = await openPopup()
  await chooseCity(page)
  const circle = page.getByRole('button', { name: /^Mark .* done$/ }).first()
  await expect(circle).toBeVisible()
  const label = (await circle.getAttribute('aria-label')) as string
  const title = label.replace(/^Mark /, '').replace(/ done$/, '')

  await circle.click()
  await expect(page.getByText('Marked done')).toBeVisible()
  await expect(page.getByRole('button', { name: label })).toHaveCount(0)
  await page.getByRole('button', { name: 'Done today (1)' }).click()
  await expect(page.getByRole('button', { name: `Unmark ${title}` })).toBeVisible()

  await page.getByRole('button', { name: `Undo ${title}` }).click()
  await expect(page.getByRole('button', { name: label })).toBeVisible()
  await expect(page.getByText('Marked done')).toBeHidden()
  expect(errors).toEqual([])
})

test('a ticked sunnah stays ticked when the popup is reopened', async ({ openPopup }) => {
  const { page } = await openPopup()
  await chooseCity(page)
  const circle = page.getByRole('button', { name: /^Mark .* done$/ }).first()
  await circle.click()
  await expect(page.getByText('Marked done')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Done today (1)' }).click()
  await expect(page.getByRole('button', { name: /^Unmark / }).first()).toBeVisible()
})

test('Show me around starts the tour on Today, and it fits inside the popup', async ({
  openPopup,
}) => {
  const { page, errors } = await openPopup()
  await chooseCity(page)
  await go(page, '/settings')
  await page.getByRole('link', { name: 'Show me around' }).first().click()
  await expect(page).toHaveURL(/popup\.html#\/\?tour=1$/)

  for (const step of [1, 2, 3]) {
    const tip = page.getByRole('dialog', { name: `${step} of 3` })
    await expect(tip).toBeVisible()
    const frame = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      scrollWidth: (document.scrollingElement as Element).scrollWidth,
      clientWidth: (document.scrollingElement as Element).clientWidth,
    }))
    const box = await tip.boundingBox()
    expect(box).not.toBeNull()
    const { x, width, y, height } = box as NonNullable<typeof box>
    expect(x).toBeGreaterThanOrEqual(0)
    expect(x + width).toBeLessThanOrEqual(frame.width)
    expect(y).toBeGreaterThanOrEqual(0)
    expect(y + height).toBeLessThanOrEqual(frame.height)
    expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth)
    await page.getByRole('button', { name: step === 3 ? 'Got it' : 'Next' }).click()
  }
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/popup\.html#\/$/)
  expect(errors).toEqual([])
})
