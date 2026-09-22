/**
 * react-native-view-shot 5.1.1 ships TypeScript source that does not typecheck
 * against react-native 0.88's view ref types. Only `captureRef` is used here,
 * so this is the whole surface the app depends on. Remove when the package
 * publishes declarations that compile against the installed react-native.
 */
declare module 'react-native-view-shot' {
  import type { RefObject } from 'react'

  export interface CaptureOptions {
    width?: number
    height?: number
    format?: 'jpg' | 'png' | 'webp' | 'raw'
    quality?: number
    result?: 'tmpfile' | 'base64' | 'data-uri'
  }

  export function captureRef(
    target: number | RefObject<unknown>,
    options?: CaptureOptions,
  ): Promise<string>
}
