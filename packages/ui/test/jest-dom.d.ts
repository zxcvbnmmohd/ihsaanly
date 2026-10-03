// jest-dom's matchers on Bun's expect, registered by ./preload.ts. (jest-dom
// ships these types as types/bun.d.ts but does not export them.)
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'

declare module 'bun:test' {
  interface Matchers<T> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchers extends TestingLibraryMatchers<unknown, unknown> {}
}
