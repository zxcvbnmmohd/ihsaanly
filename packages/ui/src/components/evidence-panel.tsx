import { resolveText } from '@ihsaanly/core/content/language'
import type { Evidence } from '@ihsaanly/core/content/schema'
import type { Strings } from '@ihsaanly/core/strings/en'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { useUi } from '../provider'

function citationFor(evidence: Evidence, strings: Strings): string {
  if (evidence.type === 'quran') {
    return strings.item.quranReference(evidence.surah, evidence.ayah)
  }

  const grading = strings.grading[evidence.grading]
  const attribution = evidence.gradedBy ? ` — ${strings.item.gradedBy(evidence.gradedBy)}` : ''

  return `${evidence.collection} ${evidence.reference} · ${grading}${attribution}`
}

interface EvidencePanelProps {
  evidence: Evidence[]
}

export function EvidencePanel({ evidence }: EvidencePanelProps): ReactElement {
  const { strings } = useUi()
  const colors = useColors()

  return (
    <View className="gap-4">
      <Text
        accessibilityRole="header"
        aria-level={2}
        className="font-semibold text-xs uppercase"
        style={{ color: colors.secondaryLabel }}>
        {strings.item.evidence}
      </Text>

      {evidence.map((entry, index) => {
        const narration = resolveText(entry.text)

        return (
          <View key={`${entry.type}-${index}`} className="gap-1">
            <Text className="text-sm" style={{ color: colors.label }}>
              {citationFor(entry, strings)}
            </Text>
            {narration ? (
              <Text className="text-sm italic" style={{ color: colors.secondaryLabel }}>
                {narration}
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}
