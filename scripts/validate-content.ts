import document from '../content/items.json'
import { translationFiles } from '../src/content/translation-files'
import { applyTranslations, missingIn, TranslationFile } from '../src/content/translations'
import { validateContentDocument } from '../src/content/validate'

const ids = new Set(document.items.map((item) => item.id))
const fileProblems = translationFiles.flatMap((file) => {
  const parsed = TranslationFile.safeParse(file)
  const shape = parsed.success
    ? []
    : parsed.error.issues.map(
        (issue) => `translations/${file.language}: ${issue.path.join('.')}: ${issue.message}`,
      )
  const strays = Object.keys(file.items ?? {})
    .filter((id) => !ids.has(id))
    .map((id) => `translations/${file.language}: no item "${id}"`)
  return [...shape, ...strays]
})

const result = validateContentDocument(applyTranslations(document as never, translationFiles))

if (result.valid && fileProblems.length === 0) {
  result.warnings.forEach((warning) => console.warn(`⚠ ${warning}`))
  translationFiles.forEach((file) => {
    const missing = missingIn(result.document, file.language)
    if (missing.length > 0) {
      console.warn(
        `⚠ ${file.language} is missing ${missing.length} strings: ${missing.slice(0, 5).join(', ')}…`,
      )
    }
  })
  console.log(
    `✔ content/items.json valid — ${result.document.items.length} item${result.document.items.length === 1 ? '' : 's'}`,
  )
} else {
  const problems = [...(result.valid ? [] : result.problems), ...fileProblems]
  console.error(`✖ content is invalid (${problems.length} problems)\n`)
  problems.forEach((problem) => console.error(`  ${problem}`))
  process.exit(1)
}
