/**
 * Joins class names, dropping falsy parts. Used instead of template literals,
 * whose pieces Biome's class sorter trims, gluing `demo-tab` and `is-active`
 * into one class.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
