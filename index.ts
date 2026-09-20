/**
 * The app's entry. Background tasks must be defined before the bundle finishes
 * loading, or TaskManager cannot run them when the OS starts the app headless
 * (an action tap on a reminder while the app is killed). Expo Router's entry
 * loads routes lazily, so a task defined inside a route's import chain is too
 * late; both are named here instead.
 */
import '@/events/geofence'
import '@/notifications/background-task'
import 'expo-router/entry'
