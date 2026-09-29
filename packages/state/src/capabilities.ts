/**
 * What the host platform can actually do. A screen or a signal reads this
 * instead of asking `Platform.OS`, so the same code answers correctly on a
 * device and on the web without a second copy of the question. Native can do
 * all of it.
 */
export interface Capabilities {
  reminders: boolean
  homeDetection: boolean
  shareImage: boolean
  systemSettings: boolean
}

export const capabilities: Capabilities = {
  reminders: true,
  homeDetection: true,
  shareImage: true,
  systemSettings: true,
}
