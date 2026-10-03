import { expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { render } from '@testing-library/react'
import { router } from '../../../test/router'
import '../../../test/library'
import TodayLayout, { unstable_settings } from '../../app/(home)/_layout'

it('anchors deep links on the index', () => {
  expect(unstable_settings).toEqual({ anchor: 'index' })
})

it('declares the index screen titled Today', () => {
  render(<TodayLayout />)
  expect(router.screens).toEqual([{ title: en.today.title }])
})
