import type { CSSProperties, ReactElement } from 'react'

import { useColors, useSystemColors } from '../colors'
import type { DropdownProps } from './dropdown'

/**
 * The web twin of `dropdown.tsx`: a real `<select>`, so the browser supplies
 * the option list, keyboard, focus ring and screen reader semantics. Styled
 * as the same field; the native arrow is replaced by a chevron that follows
 * the writing direction.
 */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  accent,
}: DropdownProps<T>): ReactElement {
  const systemColors = useSystemColors()
  const colors = useColors()

  const style: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: 52,
    paddingBlock: 0,
    paddingInlineStart: 16,
    paddingInlineEnd: 40,
    borderRadius: 16,
    border: `1.5px solid ${colors.fieldBorder}`,
    backgroundColor: String(systemColors.secondarySystemBackground),
    color: String(colors.label),
    font: 'inherit',
    fontSize: 16,
    appearance: 'none',
    cursor: 'pointer',
    outlineColor: accent === undefined ? undefined : String(accent),
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value)
          if (next) onChange(next.value)
        }}
        style={style}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        focusable="false"
        width={14}
        height={8}
        viewBox="0 0 14 8"
        style={{
          position: 'absolute',
          insetInlineEnd: 16,
          top: '50%',
          marginTop: -4,
          pointerEvents: 'none',
        }}>
        <path
          d="M1 1l6 6 6-6"
          fill="none"
          stroke={String(systemColors.secondaryLabel)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
