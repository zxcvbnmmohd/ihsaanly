// `chrome` only exists inside worker.evaluate() callbacks; type it loosely here.
// biome-ignore lint/suspicious/noExplicitAny: evaluated in the service worker, not in this process.
declare const chrome: any
