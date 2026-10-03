// Runs after the shared component preload (bunfig.toml). A build with the
// four required Firebase values has cloud sync, so tests run as that build:
// src/cloud.ts reads them once, when it first loads, so they must be set
// before any test file imports the app. The values are never contacted; the
// tests connect the session to an in-memory cloud (test/memory-cloud.ts).
process.env.VITE_FIREBASE_API_KEY = 'test-key'
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com'
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project'
process.env.VITE_FIREBASE_APP_ID = 'test-app'
