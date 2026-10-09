// The Library: browsing by category, the filters, search, an item with its
// source, the glossary, and learning an item by heart (Practise).
import { en } from '@ihsaanly/core/strings/en'
import { contentItem } from './content.ts'
import { expect, test, useOnboarded } from './fixtures.ts'

useOnboarded()

const {
  title: SLEEP,
  arabic: ARABIC,
  transliteration: TRANSLITERATION,
  translation: TRANSLATION,
} = contentItem('dua-sleeping')

test('browse, filter and search the Library', async ({ page, errors }) => {
  await page.goto('/library')
  await expect(page).toHaveTitle(`${en.library.title} · Ihsaanly`)
  const main = page.getByRole('main')
  await expect(main.getByRole('heading', { name: 'Adhkar' })).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Sleep and waking' })).toBeVisible()

  const all = main.getByRole('button', { name: /^All · \d+$/ })
  const onToday = main.getByRole('button', { name: /^On Today · \d+$/ })
  await expect(all).toHaveAttribute('aria-pressed', 'true')
  const total = Number((await all.textContent())?.match(/\d+/)?.[0])
  const planned = Number((await onToday.textContent())?.match(/\d+/)?.[0])
  expect(total).toBeGreaterThan(planned)

  await onToday.click()
  await expect(onToday).toHaveAttribute('aria-pressed', 'true')
  await expect(main.getByRole('link', { name: /Waking up/ })).toHaveCount(0) // not in Essentials
  await all.click()
  await expect(main.getByRole('link', { name: /Waking up/ }).first()).toBeVisible()

  const search = main.getByRole('textbox', { name: en.library.searchLabel })
  await search.fill('sleep')
  await expect(main.getByRole('button', { name: /^All · 3$/ })).toBeVisible()
  await expect(main.getByRole('link', { name: new RegExp(`^${SLEEP}`) }).first()).toBeVisible()
  await expect(main.getByRole('heading', { name: 'Adhkar' })).toHaveCount(0)

  await search.fill('zzzz-nothing')
  await expect(main.getByText(en.library.noResults)).toBeVisible()
  await main.getByRole('button', { name: en.textField.clear }).click()
  await expect(search).toHaveValue('')
  await expect(main.getByRole('heading', { name: 'Adhkar' })).toBeVisible()
  expect(errors).toEqual([])
})

test('open an item: its text, why, how and source', async ({ page, errors }) => {
  await page.goto('/library')
  await page.getByRole('main').getByRole('textbox', { name: en.library.searchLabel }).fill('sleep')
  await page
    .getByRole('link', { name: new RegExp(`^${SLEEP}`) })
    .first()
    .click()

  await expect(page).toHaveURL(/\/item\/dua-sleeping$/)
  await expect(page).toHaveTitle(`${SLEEP} · Ihsaanly`)
  const main = page.getByRole('main')
  await expect(main.getByText(ARABIC).first()).toBeVisible()
  await expect(main.getByRole('heading', { name: en.item.why })).toBeVisible()
  await expect(main.getByRole('heading', { name: en.item.how })).toBeVisible()
  await expect(main.getByRole('heading', { name: en.item.evidence })).toBeVisible()
  await expect(main.getByText(/Sahih al-Bukhari 6314/)).toBeVisible()
  await expect(main.getByRole('switch', { name: en.item.onToday })).toBeChecked()

  // Done marks it for today, Undo takes it back.
  await main.getByRole('button', { name: en.item.done, exact: true }).click()
  await expect(main.getByRole('button', { name: new RegExp(en.item.undo) })).toBeVisible()
  expect(errors).toEqual([])
})

test('an unknown item says so', async ({ page }) => {
  await page.goto('/item/no-such-item')
  await expect(page).toHaveTitle(`${en.notFound.title} · Ihsaanly`)
  await expect(page.getByText(en.notFound.body)).toBeVisible()
})

test('the glossary opens from the Library', async ({ page }) => {
  await page.goto('/library')
  await page
    .getByRole('link', { name: new RegExp(`^${en.library.terms}`) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/glossary$/)
  await expect(page).toHaveTitle(`${en.glossary.title} · Ihsaanly`)
  await expect(page.getByText(/rawatib/i).first()).toBeVisible()
})

test('memorise: hide a line at a time, then mark it known', async ({ page, errors }) => {
  await page.goto('/item/dua-sleeping')
  await page.getByRole('link', { name: en.memorise.start }).first().click()
  await expect(page).toHaveURL(/\/item\/memorise\/dua-sleeping$/)
  await expect(page).toHaveTitle(`${en.memorise.title} · Ihsaanly`)

  const main = page.getByRole('main')
  const translation = main.getByText(TRANSLATION)
  const transliteration = main.getByText(TRANSLITERATION)
  await expect(translation).toBeVisible()
  await expect(transliteration).toBeVisible()
  await expect(main.getByText(en.memorise.noAudio)).toBeVisible()

  // One line at a time: the transliteration, then the translation, leaving the Arabic.
  await main.getByRole('button', { name: en.memorise.hide }).click()
  await expect(transliteration).toBeHidden()
  await expect(translation).toBeVisible()
  await main.getByRole('button', { name: en.memorise.hide }).click()
  await expect(translation).toBeHidden()
  await expect(main.getByText(ARABIC).first()).toBeVisible()

  await main.getByRole('button', { name: new RegExp(`^${en.memorise.notKnown}`) }).click()
  await expect(
    main.getByRole('button', { name: new RegExp(`^${en.memorise.known}`) }),
  ).toBeVisible()

  await page.goto('/library')
  const known = page.getByRole('main').getByRole('button', { name: /^Known · \d+$/ })
  await expect(known).toHaveText(`${en.library.filterKnown} · 1`)
  await known.click()
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: new RegExp(`^${SLEEP}`) })
      .first(),
  ).toBeVisible()
  expect(errors).toEqual([])
})
