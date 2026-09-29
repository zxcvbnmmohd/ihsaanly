export interface SightingAuthority {
  region: string
  bodies: string[]
}

/**
 * Listed so a user can find whoever their own community follows, and for no
 * other reason. Which body to follow is not a decision this app makes, and
 * the order here is alphabetical rather than any kind of ranking.
 *
 * Names only, deliberately: a wrong or dead link would be worse than none.
 * Pending the content reviewer's eye along with everything else.
 */
export const MOON_SIGHTING_AUTHORITIES: SightingAuthority[] = [
  { region: 'Australia', bodies: ['Australian National Imams Council'] },
  {
    region: 'Europe',
    bodies: ['European Council for Fatwa and Research'],
  },
  {
    region: 'North America',
    bodies: [
      'Fiqh Council of North America',
      'Hilal Committee of North America',
      'Islamic Society of North America',
    ],
  },
  { region: 'Saudi Arabia', bodies: ['Supreme Court of Saudi Arabia (Umm al-Qura)'] },
  { region: 'South Africa', bodies: ['Crescent Observers Society'] },
  {
    region: 'South Asia',
    bodies: ['Islamic Foundation Bangladesh', 'Ruet-e-Hilal Committee, Pakistan'],
  },
  { region: 'Türkiye', bodies: ['Diyanet İşleri Başkanlığı'] },
  {
    region: 'United Kingdom',
    bodies: ['Birmingham Central Mosque', 'New Crescent Society', 'Wifaqul Ulama'],
  },
]
