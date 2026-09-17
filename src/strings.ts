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
  plan: {
    rightNow: 'Right now',
    context: 'Nearby',
    comingUp: 'Coming up',
    tomorrow: 'Tomorrow',
    inDays: (days: number) => `In ${days} days`,
    prayers: 'Prayers',
    optional: 'Optional',
    prayed: 'Prayed',
    makeUp: 'To make up',
    outstanding: (count: number) => `${count} to make up`,
  },
  prayer: {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  },
  window: {
    fajr: 'Fajr',
    sunrise: 'Morning',
    dhuhr: 'After Dhuhr',
    asr: 'Evening',
    maghrib: 'After Maghrib',
    isha: 'Night',
  },
  tracking: {
    title: 'Tracking',
    travelling: 'Travelling',
    travellingDetail:
      'Shortening is offered, the regular sunnah prayers step aside, and fasting is offered rather than expected.',
    paused: 'Pause prayer tracking',
    pausedDetail:
      'Prayers are not recorded and nothing accrues to make up. It stays off until you turn it back on.',
  },
  hijri: {
    title: 'Hijri date',
    offset: 'Adjust the date',
    approximate: 'Calculated \u2014 confirm with the authority your community follows.',
    explanation:
      'A calculated calendar and local moon sighting often differ by a day or two. Shift the date here so the app agrees with your community. Dates for fasting days are always shown as expected, never as certain.',
    offsetLabel: (days: number) =>
      days === 0
        ? 'No change'
        : `${days > 0 ? '+' : ''}${days} day${Math.abs(days) === 1 ? '' : 's'}`,
    format: (day: number, month: string, year: number) => `${day} ${month} ${year}`,
  },
  hijriMonth: {
    1: 'Muharram',
    2: 'Safar',
    3: 'Rabi\u2019 al-Awwal',
    4: 'Rabi\u2019 ath-Thani',
    5: 'Jumada al-Ula',
    6: 'Jumada al-Akhirah',
    7: 'Rajab',
    8: 'Sha\u2019ban',
    9: 'Ramadan',
    10: 'Shawwal',
    11: 'Dhu al-Qa\u2019dah',
    12: 'Dhu al-Hijjah',
  } as Record<number, string>,
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
    unavailable:
      'Location services are switched off on this device. Turn them on, or search for your city instead.',
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
} as const
