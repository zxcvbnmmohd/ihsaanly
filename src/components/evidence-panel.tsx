import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import type { Evidence } from '@/content/schema'
import { resolveText } from '@/content'
import { useStrings, type Strings } from '@/strings'
import { colors } from '@/theme/colors'

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
  const strings = useStrings()
  useColorScheme()

  return (
    <View className="gap-4">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
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
