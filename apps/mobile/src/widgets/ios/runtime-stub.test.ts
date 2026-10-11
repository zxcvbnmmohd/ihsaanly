import { describe, expect, it } from 'bun:test'
import { dirname, join } from 'node:path'

// The widget extension evaluates ExpoWidgets.bundle in JavaScriptCore with
// expo-widgets' React stub in place of React. @expo/ui/swift-ui calls `memo`
// at module scope (src/recycling/useRecycledRows.tsx), so a stub without it
// throws while the bundle loads and every widget fails, gallery previews
// included. expo-widgets 58.0.7 lacks it; patches/expo-widgets@58.0.7.patch
// backports the 58.0.10 stub. This fails if an upgrade or reinstall drops it.
const stubPath = join(
  dirname(require.resolve('expo-widgets/package.json')),
  'bundle',
  'react-stub.ts',
)

describe('expo-widgets runtime React stub', () => {
  it('provides the React APIs @expo/ui calls at module scope', async () => {
    const stub = await import(stubPath)
    expect(typeof stub.memo).toBe('function')
    expect(typeof stub.forwardRef).toBe('function')
    const component = () => null
    expect(stub.memo(component)).toBe(component)
  })
})
