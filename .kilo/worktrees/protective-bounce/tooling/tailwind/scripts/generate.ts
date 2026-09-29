import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTheme, renderWeb } from './render'

const ROOT = join(import.meta.dir, '..')
writeFileSync(join(ROOT, 'theme.css'), renderTheme())
writeFileSync(join(ROOT, 'web.css'), renderWeb())
console.log('wrote theme.css and web.css')
