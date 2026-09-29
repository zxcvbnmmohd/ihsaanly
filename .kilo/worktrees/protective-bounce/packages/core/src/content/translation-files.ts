import ar from '../../content/translations/ar.json'
import fr from '../../content/translations/fr.json'
import hi from '../../content/translations/hi.json'
import it from '../../content/translations/it.json'
import ja from '../../content/translations/ja.json'
import so from '../../content/translations/so.json'
import ur from '../../content/translations/ur.json'
import yue from '../../content/translations/yue.json'
import zh from '../../content/translations/zh.json'
import type { TranslationFile } from './translations'

/** Shape is checked by the content gate, so the app does not re-parse them at startup. */
export const translationFiles = [ar, fr, hi, it, ja, so, ur, yue, zh] as TranslationFile[]
