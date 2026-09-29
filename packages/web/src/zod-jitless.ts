import { z } from 'zod'

// zod's JIT compiles validators with `new Function`, which the site's
// Content-Security-Policy forbids. Jitless mode must be set before any schema
// parses, so this module is imported first by the router.
z.config({ jitless: true })
