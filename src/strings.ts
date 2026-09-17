/** Single source for user-facing text. #19 swaps the internals for locale-aware lookup. */
export const strings = {
  tabs: {
    today: 'Today',
    library: 'Library',
    more: 'More',
  },
  today: {
    title: 'Today',
    empty: 'Nothing here yet.',
    needsLocation: 'Set your location so the app knows which part of the day you are in.',
  },
  window: {
    fajr: 'Fajr',
    sunrise: 'Morning',
    dhuhr: 'After Dhuhr',
    asr: 'Evening',
    maghrib: 'After Maghrib',
    isha: 'Night',
  },
  calculation: {
    title: 'Prayer calculation',
    method: 'Method',
    asr: 'Asr',
    highLatitude: 'High latitude',
    selected: 'Selected',
    explanation:
      'Prayer times are computed on this device and never shown as clock times \u2014 they only decide which part of the day you are in.',
    highLatitudeExplanation:
      'Above roughly 48\u00b0 north, Isha does not occur for part of the year. This decides what is used instead.',
  },
  asr: {
    shafi: 'Standard',
    hanafi: 'Hanafi',
  },
  highLatitude: {
    middleofthenight: 'Middle of the night',
    seventhofthenight: 'Seventh of the night',
    twilightangle: 'Twilight angle',
  },
  method: {
    MuslimWorldLeague: 'Muslim World League',
    Egyptian: 'Egyptian General Authority',
    Karachi: 'University of Islamic Sciences, Karachi',
    UmmAlQura: 'Umm al-Qura, Makkah',
    Dubai: 'Dubai',
    MoonsightingCommittee: 'Moonsighting Committee',
    NorthAmerica: 'ISNA, North America',
    Kuwait: 'Kuwait',
    Qatar: 'Qatar',
    Singapore: 'Singapore',
    Tehran: 'Tehran',
    Turkey: 'Turkey',
  },
  library: {
    title: 'Library',
    empty: 'Adhkar, duas and sunnah actions will be listed here.',
  },
  item: {
    transliteration: 'Transliteration',
    translation: 'Translation',
    evidence: 'Evidence',
    note: 'Scholars differ',
    repeat: (times: number) => `Repeat ${times} times`,
    gradedBy: (grader: string) => `graded by ${grader}`,
    quranReference: (surah: number, ayah: number) => `Qur\u2019an ${surah}:${ayah}`,
  },
  ruling: {
    fard: 'Obligatory',
    wajib: 'Obligatory',
    'sunnah-muakkadah': 'Emphasised sunnah',
    sunnah: 'Sunnah',
    mustahabb: 'Recommended',
    mubah: 'Permissible',
  },
  grading: {
    sahih: 'Sahih',
    hasan: 'Hasan',
    "da'if": 'Da\u2019if',
    disputed: 'Disputed',
  },
  more: {
    title: 'More',
    empty: 'History, settings and help will live here.',
  },
  location: {
    title: 'Location',
    notSet: 'Not set',
    currentLocation: 'Current location',
    useDevice: 'Use my location',
    search: 'Search for a city',
    noResults: 'No cities match that.',
    declined:
      'Location access was declined. Search for your city instead \u2014 everything still works.',
    explanation: 'Used on this device to work out prayer windows. It is never sent anywhere.',
    attribution: 'City data from city-timezones (MIT).',
  },
  error: {
    title: 'Something went wrong',
    retry: 'Try again',
  },
  notFound: {
    title: 'Not found',
    body: 'That screen does not exist.',
  },
} as const;
