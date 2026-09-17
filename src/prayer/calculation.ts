import { z } from 'zod';

export const CalculationMethodName = z.enum([
  'MuslimWorldLeague',
  'Egyptian',
  'Karachi',
  'UmmAlQura',
  'Dubai',
  'MoonsightingCommittee',
  'NorthAmerica',
  'Kuwait',
  'Qatar',
  'Singapore',
  'Tehran',
  'Turkey',
]);

export const AsrOpinion = z.enum(['shafi', 'hanafi']);

export const HighLatitudeRuleName = z.enum([
  'middleofthenight',
  'seventhofthenight',
  'twilightangle',
]);

export const CalculationPreferences = z.object({
  method: CalculationMethodName,
  asr: AsrOpinion,
  highLatitudeRule: HighLatitudeRuleName,
});

export type CalculationPreferences = z.infer<typeof CalculationPreferences>;

/**
 * Asr follows the standard opinion and cannot be derived from coordinates.
 * The high-latitude rule has no neutral answer above roughly 48°N, where Isha
 * does not occur for part of the year, so one must be chosen rather than left
 * to chance.
 */
export const DEFAULT_CALCULATION_PREFERENCES: CalculationPreferences = {
  method: 'MuslimWorldLeague',
  asr: 'shafi',
  highLatitudeRule: 'middleofthenight',
};
