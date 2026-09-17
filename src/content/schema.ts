import { z } from 'zod';

/**
 * Bukhari and Muslim carry their own authentication, so an item citing them
 * needs no named grader. Every other collection does — that rule is the build
 * gate that stops ungraded religious content shipping by accident.
 */
const COLLECTIONS_CARRYING_THEIR_OWN_GRADING = ['Sahih al-Bukhari', 'Sahih Muslim'];

const LanguageCode = z.string().regex(/^[a-z]{2,3}$/);
const LocalisedText = z.record(LanguageCode, z.string().min(1));
const Slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const Ruling = z.enum(['fard', 'wajib', 'sunnah-muakkadah', 'sunnah', 'mustahabb', 'mubah']);

export const Grading = z.enum(['sahih', 'hasan', "da'if", 'disputed']);

export const Prayer = z.enum(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

const HadithEvidence = z.object({
  type: z.literal('hadith'),
  collection: z.string().min(1),
  reference: z.string().min(1),
  grading: Grading,
  gradedBy: z.string().min(1).nullable(),
  text: LocalisedText,
});

const QuranEvidence = z.object({
  type: z.literal('quran'),
  surah: z.number().int().min(1).max(114),
  ayah: z.number().int().positive(),
  text: LocalisedText,
});

const Evidence = z.discriminatedUnion('type', [HadithEvidence, QuranEvidence]);

const Trigger = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('window'), window: z.enum(['morning', 'evening']) }),
  z.object({
    kind: z.literal('prayer'),
    // 'any' covers acts tied to every obligatory prayer rather than one of
    // them, such as the dhikr after salah or the siwak before it.
    prayer: z.union([Prayer, z.literal('any')]),
    when: z.enum(['before', 'after']),
  }),
  z.object({
    kind: z.literal('day'),
    day: z.enum([
      'monday',
      'thursday',
      'white-days',
      'ashura',
      'arafah',
      'shawwal-6',
      'dhul-hijjah',
      'ramadan',
    ]),
  }),
  z.object({
    kind: z.literal('event'),
    event: z.enum([
      'leaving-home',
      'entering-home',
      'travel',
      'driving',
      'ascending',
      'descending',
      'eating',
      'sleeping',
      'waking',
      'entering-masjid',
    ]),
  }),
]);

function needsNamedGrader(evidence: z.infer<typeof Evidence>): boolean {
  return (
    evidence.type === 'hadith' &&
    !COLLECTIONS_CARRYING_THEIR_OWN_GRADING.includes(evidence.collection) &&
    evidence.gradedBy === null
  );
}

const Item = z
  .object({
    id: Slug,
    category: Slug,
    title: LocalisedText,
    ruling: Ruling,
    arabic: z.string().min(1).nullable(),
    transliteration: LocalisedText.nullable(),
    translation: LocalisedText.nullable(),
    repeat: z.number().int().positive(),
    evidence: z.array(Evidence).min(1),
    trigger: Trigger,
    defaultOn: z.boolean(),
    note: LocalisedText.nullable(),
    audio: z.string().min(1).nullable(),
    audioTranslation: LocalisedText.nullable(),
  })
  .superRefine((item, ctx) => {
    item.evidence.forEach((evidence, index) => {
      if (!needsNamedGrader(evidence)) return;
      ctx.addIssue({
        code: 'custom',
        path: ['evidence', index, 'gradedBy'],
        message: `"${item.id}" cites a collection that does not carry its own grading, so it must name a grader`,
      });
    });
  });

export const ContentDocument = z
  .object({
    schemaVersion: z.literal(1),
    reviewedBy: z.string().min(1).nullable(),
    audioReciter: z.string().min(1).nullable(),
    contentLanguages: z.array(LanguageCode).min(1),
    translationSources: z.record(LanguageCode, z.string().nullable()),
    items: z.array(Item),
  })
  .superRefine((document, ctx) => {
    const declared = new Set(document.contentLanguages);
    const undeclared = document.items.flatMap((item) =>
      localisedFieldsOf(item)
        .flatMap((field) => Object.keys(field))
        .filter((language) => !declared.has(language))
        .map((language) => ({ item: item.id, language })),
    );

    undeclared.forEach(({ item, language }) =>
      ctx.addIssue({
        code: 'custom',
        path: ['contentLanguages'],
        message: `"${item}" has text in "${language}", which is not declared in contentLanguages`,
      }),
    );

    const duplicates = document.items
      .map((item) => item.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);

    duplicates.forEach((id) =>
      ctx.addIssue({ code: 'custom', path: ['items'], message: `duplicate item id "${id}"` }),
    );
  });

function localisedFieldsOf(item: z.infer<typeof Item>): Record<string, string>[] {
  return [
    item.title,
    item.transliteration,
    item.translation,
    item.note,
    item.audioTranslation,
    ...item.evidence.map((evidence) => evidence.text),
  ].filter((field) => field !== null);
}

export type Ruling = z.infer<typeof Ruling>;
export type Grading = z.infer<typeof Grading>;
export type ContentDocument = z.infer<typeof ContentDocument>;
export type Item = z.infer<typeof Item>;
export type Evidence = z.infer<typeof Evidence>;
export type Trigger = z.infer<typeof Trigger>;
