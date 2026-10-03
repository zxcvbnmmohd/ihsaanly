// Preloaded after the DOM (bunfig.toml): the fake `chrome` global, and the
// environment of a beta (development) build, so the header's Beta pill renders.
import './chrome'

process.env.VITE_APP_ENV = 'development'
