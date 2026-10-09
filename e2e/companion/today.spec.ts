// Today, onboarded in London at 13:30 on a Tuesday: marking and unmarking a
// prayer, what that changes on the page, and History.
import { en } from '@ihsaanly/core/strings/en'
import { expect, skipTour, test, useOnboarded } from './fixtures.ts'

useOnboarded()

test('mark Dhuhr, see it kept, unmark it', async ({ page, errors }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/today$/)
  await skipTour(page)
  await expect(page).toHaveTitle(`${en.today.title} · Ihsaanly`)

  const dhuhr = page.getByRole('checkbox', { name: en.prayer.dhuhr })
  await expect(dhuhr).not.toBeChecked()
  // Before Dhuhr is marked, its "before" sunnah is what is asked right now.
  await expect(
    page.getByRole('link', { name: 'Two or four rak’ah before Dhuhr' }).first(),
  ).toBeVisible()

  await dhuhr.click()
  await expect(dhuhr).toBeChecked()
  await expect(page.getByRole('link', { name: 'Two rak’ah after Dhuhr' }).first()).toBeVisible()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).not.toBeChecked()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).not.toBeChecked()
  expect(errors).toEqual([])
})

test('History shows a marked prayer', async ({ page }) => {
  await page.goto('/history')
  await expect(page.getByText(en.history.empty)).toBeVisible()

  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeChecked()

  await page.getByRole('navigation').getByRole('link', { name: en.more.title }).first().click()
  await page.getByRole('link', { name: en.history.title }).first().click()
  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByText(en.history.daysActive(1))).toBeVisible()
  await expect(
    page.getByText(new RegExp(`${en.prayer.dhuhr} · ${en.history.times(1)}`)),
  ).toBeVisible()
})

test('the tab bar moves between Today, Library and More', async ({ page }) => {
  await page.goto('/today')
  const nav = page.getByRole('navigation')
  await nav.getByRole('link', { name: en.library.title }).first().click()
  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByRole('textbox', { name: en.library.searchLabel })).toBeVisible()
  await nav.getByRole('link', { name: en.more.title }).first().click()
  await expect(page.getByRole('textbox', { name: en.more.searchLabel })).toBeVisible()
  await nav.getByRole('link', { name: en.today.title }).first().click()
  await expect(page).toHaveURL(/\/today$/)
})

// Marking whole items from their circles. At FIXED_NOW (13:30, after Dhuhr
// began) the sunnah before Dhuhr and the tasbih after prayer are due.
const BEFORE_DHUHR = 'Two or four rak’ah before Dhuhr'
const TASBIH = 'Tasbih after prayer'
const MORNING_CLOCK = new Date('2026-03-10T08:00:00Z')

test('a circle marks a sunnah: it moves to Done today with an undo bar, and Undo restores it', async ({
  page,
  errors,
}) => {
  await page.goto('/today')
  await skipTour(page)
  const circle = page.getByRole('button', { name: en.today.markDone(BEFORE_DHUHR) })
  await circle.click()

  await expect(circle).toBeHidden()
  await expect(page.getByRole('button', { name: en.today.doneToday(1) })).toBeVisible()
  const undo = page.getByRole('button', { name: en.today.undoItem(BEFORE_DHUHR) })
  await expect(undo).toBeVisible()

  await undo.click()
  await expect(page.getByRole('button', { name: en.today.markDone(BEFORE_DHUHR) })).toBeVisible()
  await expect(page.getByRole('button', { name: en.today.doneToday(1) })).toBeHidden()
  expect(errors).toEqual([])
})

test('a done sunnah is unmarked from Done today, and stays done after a reload', async ({
  page,
}) => {
  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('button', { name: en.today.markDone(BEFORE_DHUHR) }).click()
  await page.reload()
  await page.getByRole('button', { name: en.today.doneToday(1) }).click()
  await page.getByRole('button', { name: en.today.unmark(BEFORE_DHUHR) }).click()
  await expect(page.getByRole('button', { name: en.today.markDone(BEFORE_DHUHR) })).toBeVisible()
  await expect(page.getByRole('button', { name: en.today.doneToday(1) })).toBeHidden()
})

test('the tasbih after prayer is counted to 33 in its panel, and completes', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('button', { name: en.today.countItem(TASBIH, 0, 33) }).click()
  const panel = page.getByRole('dialog', { name: TASBIH })
  await expect(panel.getByText(en.panel.tapToCount)).toBeVisible()

  for (let count = 0; count < 33; count += 1) {
    await panel.getByRole('button', { name: en.today.countItem(TASBIH, count, 33) }).click()
  }

  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: en.today.undoItem(TASBIH) })).toBeVisible()
  await expect(page.getByRole('button', { name: en.today.doneToday(1) })).toBeVisible()
})

test('a half-counted tasbih shows its progress on the circle', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('button', { name: en.today.countItem(TASBIH, 0, 33) }).click()
  const panel = page.getByRole('dialog', { name: TASBIH })
  for (let count = 0; count < 12; count += 1) {
    await panel.getByRole('button', { name: en.today.countItem(TASBIH, count, 33) }).click()
  }
  await panel.getByRole('button', { name: en.panel.close }).click()
  await expect(page.getByRole('button', { name: en.today.countItem(TASBIH, 12, 33) })).toBeVisible()
  await expect(page.getByText('12/33')).toBeVisible()
})

test('the morning adhkar open a parts panel: tick one, then Mark all done', async ({ page }) => {
  await page.clock.setFixedTime(MORNING_CLOCK)
  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('button', { name: en.today.partsItem('Morning adhkar', 0, 10) }).click()
  const panel = page.getByRole('dialog', { name: 'Morning adhkar' })
  await panel.getByRole('checkbox').first().click()
  await expect(panel.getByRole('checkbox').first()).toBeChecked()

  await panel.getByRole('button', { name: en.panel.markAll }).click()
  await expect(panel).toBeHidden()
  await expect(
    page.getByRole('button', { name: en.today.undoItem('Morning adhkar') }),
  ).toBeVisible()
})

test('tapping a card opens its item page', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  await page
    .getByRole('link', { name: en.today.open(BEFORE_DHUHR) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/item\/sunnah-before-dhuhr$/)
})

test('the prayer hint goes away after three prayers are marked', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  await expect(page.getByText(en.today.prayerHint)).toBeVisible()
  for (const prayer of ['fajr', 'dhuhr', 'asr'] as const) {
    await page.getByRole('checkbox', { name: en.prayer[prayer] }).click()
  }
  await expect(page.getByText(en.today.prayerHint)).toBeHidden()
})

test('the first-run tour shows after onboarding; Skip ends it for good', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByText(en.tour.prayer)).toBeVisible()
  await expect(page.getByText(en.tour.step(1, 3))).toBeVisible()
  await skipTour(page)
  await page.reload()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()
  await expect(page.getByText(en.tour.prayer)).toBeHidden()
})

test('marking a prayer moves the tour on, and Got it ends it', async ({ page }) => {
  await page.goto('/today')
  await expect(page.getByText(en.tour.prayer)).toBeVisible()
  await page.getByRole('checkbox', { name: en.prayer.dhuhr }).click()
  await expect(page.getByText(en.tour.sunnah)).toBeVisible()
  await page.getByRole('button', { name: en.tour.next }).click()
  await expect(page.getByText(en.tour.card)).toBeVisible()
  await page.getByRole('button', { name: en.tour.done }).click()
  await expect(page.getByText(en.tour.card)).toBeHidden()
})

test('More → Show me around replays the tour', async ({ page }) => {
  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('navigation').getByRole('link', { name: en.more.title }).first().click()
  await page.getByRole('link', { name: en.more.showMeAround }).first().click()
  await expect(page).toHaveURL(/\/today\?tour=1$/)
  await expect(page.getByText(en.tour.prayer)).toBeVisible()
  await skipTour(page)
  await expect(page).toHaveURL(/\/today$/)
})

test('paused: a notice replaces the prayers; on the check-in day Resume brings them back', async ({
  page,
}) => {
  await page.goto('/today')
  await skipTour(page)
  const fasting = page.getByText(en.fasting.notFastingToday)
  await expect(fasting).toBeVisible()

  await page.goto('/tracking')
  await page.getByRole('switch', { name: en.tracking.paused }).click()
  await expect(page.getByText(en.tracking.checkInAfter(7))).toBeVisible()

  await page.goto('/today')
  await expect(fasting).toBeHidden()
  await expect(page.getByText(en.today.paused)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeHidden()
  await expect(page.getByText(en.today.prayerHint)).toBeHidden()
  await expect(page.getByText(en.today.checkInTitle)).toBeHidden()

  // A week on, the check-in is due.
  await page.clock.setFixedTime(new Date('2026-03-17T13:30:00Z'))
  await page.reload()
  await expect(page.getByText(en.today.checkInTitle)).toBeVisible()
  await page.getByRole('button', { name: en.today.resume }).click()
  await expect(page.getByRole('checkbox', { name: en.prayer.dhuhr })).toBeVisible()
  await expect(page.getByText(en.today.checkInTitle)).toBeHidden()
})

test('check-in: Not yet asks again tomorrow', async ({ page }) => {
  await page.goto('/tracking')
  await page.getByRole('switch', { name: en.tracking.paused }).click()
  await page.getByRole('button', { name: `${en.tracking.checkInDays} −` }).click()
  await expect(page.getByText(en.tracking.checkInAfter(6))).toBeVisible()

  await page.clock.setFixedTime(new Date('2026-03-16T13:30:00Z'))
  await page.goto('/today')
  await skipTour(page)
  await page.getByRole('button', { name: en.today.notYet }).click()
  await expect(page.getByText(en.today.checkInTitle)).toBeHidden()
  await expect(page.getByText(en.today.paused)).toBeVisible()

  await page.clock.setFixedTime(new Date('2026-03-17T13:30:00Z'))
  await page.reload()
  await expect(page.getByText(en.today.checkInTitle)).toBeVisible()
})
