import { afterAll, afterEach, beforeAll, describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import * as reactDom from 'react-dom/client'
import { resetApp, strings } from '../test/route'

// main.tsx cannot hand back the root it creates; collect it so the test can unmount it.
const realClient = { ...reactDom }
const roots: reactDom.Root[] = []
const actFlag = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
const wasActEnvironment = actFlag.IS_REACT_ACT_ENVIRONMENT

beforeAll(() => {
  actFlag.IS_REACT_ACT_ENVIRONMENT = false
  mock.module('react-dom/client', () => ({
    ...realClient,
    createRoot: (...args: Parameters<typeof reactDom.createRoot>) => {
      const root = realClient.createRoot(...args)
      roots.push(root)
      return root
    },
  }))
})
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount()
  document.body.innerHTML = ''
})
afterAll(() => {
  actFlag.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment
  mock.module('react-dom/client', () => realClient)
})

describe('main', () => {
  it('boots the popup into #root', async () => {
    resetApp()
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')

    expect(await screen.findByRole('heading', { name: strings.today.title })).toBeInTheDocument()
  })
})
