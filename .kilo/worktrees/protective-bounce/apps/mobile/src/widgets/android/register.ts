/**
 * `react-native-android-widget` looks its native module up at import, which
 * throws anywhere but Android, so the registration lives in
 * `register.android.ts` and every other platform gets this empty module.
 */
export {}
