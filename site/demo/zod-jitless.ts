// Imported first by main.ts, so it runs before the content module validates
// items.json. Without it zod probes `new Function('')` to decide whether to
// compile its parsers, which the site's Content-Security-Policy reports as a
// violation even though zod catches the error. Interpreted parsing is plenty
// for 32 items.
import { z } from 'zod'

z.config({ jitless: true })
