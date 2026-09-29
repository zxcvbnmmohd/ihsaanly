/**
 * expo-widgets hands props to Swift as `[String: Any]`, and a JavaScript null
 * inside that dictionary fails the conversion: the Widget constructor threw
 * "Exception in HostFunction" at import, which took the Today route down with
 * it. Absent keys read the same as null in the layouts, so nulls are dropped.
 */
export function withoutNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(withoutNulls) as T
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== null)
        .map(([key, entry]) => [key, withoutNulls(entry)]),
    ) as T
  }
  return value
}
