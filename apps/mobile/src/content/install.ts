// Imported first by the app entry (index.ts), before the background tasks and
// Expo Router load anything that reads the content: the last good download
// from an earlier open replaces the content the app shipped with. A missing
// or bad download leaves the shipped content in place.
import { installCachedContent } from '@ihsaanly/state/content/cache'

installCachedContent()
