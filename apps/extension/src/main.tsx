// Same boot order as apps/companion/src/main.tsx: zod jitless before any schema
// parses (the extension CSP forbids `new Function` too), and the language and
// direction applied before the first paint (./popup).
import '@ihsaanly/web/zod-jitless'
import { startPopup } from './popup'
import './styles.css'

startPopup(document.getElementById('root'))
