// The app-side half of the mobile test environment (bunfig.toml loads
// packages/ui/test/preload.ts first, for the DOM and react-native-web).
// Modules every route touches are faked here once, so a test file never has to
// remember them; native modules specific to one feature are mocked in the test
// that needs them (docs/TESTING.md).
import { afterEach, mock } from 'bun:test'
import { installFirebaseFakes, resetFirebaseFakes } from './firebase'
import { expoRouter, nativeTabs, navigationTheme, resetRouter, stackModule } from './router'

mock.module('expo-router', () => expoRouter)
mock.module('expo-router/stack', () => stackModule)
mock.module('expo-router/native-tabs', () => nativeTabs)
mock.module('expo-router/react-navigation', () => navigationTheme)
mock.module('expo-status-bar', () => ({ StatusBar: () => null }))
installFirebaseFakes()

afterEach(() => {
  resetRouter()
  resetFirebaseFakes()
})
