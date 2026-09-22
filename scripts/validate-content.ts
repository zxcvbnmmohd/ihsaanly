import document from '../content/items.json'
import { validateContentDocument } from '../src/content/validate'

const result = validateContentDocument(document)

if (result.valid) {
  result.warnings.forEach((warning) => console.warn(`⚠ ${warning}`))
  console.log(
    `✔ content/items.json valid — ${result.document.items.length} item${result.document.items.length === 1 ? '' : 's'}`,
  )
} else {
  console.error(`✖ content/items.json is invalid (${result.problems.length} problems)\n`)
  result.problems.forEach((problem) => console.error(`  ${problem}`))
  process.exit(1)
}
