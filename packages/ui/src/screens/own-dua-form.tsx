import {
  type DraftProblem,
  MAX_OWN_DUA_REPEAT,
  MOMENTS,
  type Moment,
  OWN_DUA_LIMITS,
  type OwnDuaDraft,
} from '@ihsaanly/core/content/my-duas'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement, ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Chip } from '../components/chip'
import { Screen } from '../components/screen'
import { Stepper } from '../components/stepper'
import { TextField } from '../components/text-field'
import { useUi } from '../provider'

export interface OwnDuaFormScreenProps {
  draft: OwnDuaDraft
  onChange: (draft: OwnDuaDraft) => void
  /** What still stops it saving; the route shows it once a save was tried. */
  problem: DraftProblem | null
  /** A new dua past the cap: nothing more can be saved until one is deleted. */
  full: boolean
  onSave: () => void
}

interface FieldProps {
  label: string
  children: ReactNode
}

function Field({ label, children }: FieldProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-2">
      <Text className="font-semibold text-sm" style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

/** Writing or editing one of the user's own duas: a few fields and a moment, nothing more. */
export function OwnDuaFormScreen({
  draft,
  onChange,
  problem,
  full,
  onSave,
}: OwnDuaFormScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const set = (patch: Partial<OwnDuaDraft>): void => onChange({ ...draft, ...patch })
  const moments: { value: Moment | null; label: string }[] = [
    { value: null, label: strings.myDuas.noReminder },
    ...MOMENTS.map((moment) => ({ value: moment, label: strings.myDuas.moment[moment] })),
  ]
  const message = full
    ? strings.myDuas.full
    : problem === 'title'
      ? strings.myDuas.needsTitle
      : problem === 'words'
        ? strings.myDuas.needsWords
        : null

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <Field label={strings.myDuas.fieldTitle}>
        <TextField
          value={draft.title}
          onChangeText={(title) => set({ title })}
          placeholder={strings.myDuas.fieldTitleHint}
          label={strings.myDuas.fieldTitle}
          accent={palette.accent}
          autoCapitalize="sentences"
          maxLength={OWN_DUA_LIMITS.title}
        />
      </Field>
      <Field label={strings.myDuas.fieldArabic}>
        <TextField
          value={draft.arabic}
          onChangeText={(arabic) => set({ arabic })}
          placeholder={strings.myDuas.fieldArabic}
          label={strings.myDuas.fieldArabic}
          accent={palette.accent}
          autoCapitalize="none"
          multiline
          maxLength={OWN_DUA_LIMITS.arabic}
        />
      </Field>
      <Field label={strings.myDuas.fieldTransliteration}>
        <TextField
          value={draft.transliteration}
          onChangeText={(transliteration) => set({ transliteration })}
          placeholder={strings.myDuas.fieldTransliteration}
          label={strings.myDuas.fieldTransliteration}
          accent={palette.accent}
          autoCapitalize="sentences"
          multiline
          maxLength={OWN_DUA_LIMITS.transliteration}
        />
      </Field>
      <Field label={strings.myDuas.fieldText}>
        <TextField
          value={draft.text}
          onChangeText={(text) => set({ text })}
          placeholder={strings.myDuas.fieldText}
          label={strings.myDuas.fieldText}
          accent={palette.accent}
          autoCapitalize="sentences"
          multiline
          maxLength={OWN_DUA_LIMITS.text}
        />
      </Field>

      <Stepper
        label={strings.myDuas.fieldRepeat}
        value={draft.repeat}
        min={1}
        max={MAX_OWN_DUA_REPEAT}
        onChange={(repeat) => set({ repeat })}
        palette={palette}
      />

      <Field label={strings.myDuas.remind}>
        <View className="flex-row flex-wrap gap-2">
          {moments.map((moment) => (
            <Chip
              key={moment.value ?? 'none'}
              label={moment.label}
              selected={draft.moment === moment.value}
              onPress={() => set({ moment: moment.value })}
              palette={palette}
            />
          ))}
        </View>
        <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
          {strings.myDuas.remindDetail}
        </Text>
      </Field>

      <View className="gap-3">
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-center text-sm"
            style={{ color: colors.label }}>
            {message}
          </Text>
        ) : null}
        <Button
          title={strings.myDuas.save}
          onPress={onSave}
          color={palette.accent}
          onColor={palette.onAccent}
          disabled={full}
        />
      </View>
    </Screen>
  )
}
