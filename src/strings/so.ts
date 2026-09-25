import type { Strings } from './en'

/**
 * Somali interface copy, in standard Latin orthography. A complete draft,
 * written in one pass and awaiting review by a qualified speaker; that review
 * is a release condition. Content text (adhkar, duas, evidence) does not live
 * here.
 */

/** Somali counts: "hal" plus the singular for one, the number plus the counted plural otherwise. */
function count(n: number, one: string, many: string): string {
  return n === 1 ? one : `${n} ${many}`
}

export const so: Strings = {
  tabs: {
    today: 'Maanta',
    library: 'Maktabadda',
    more: 'Dheeraad',
  },
  today: {
    title: 'Maanta',
    nothingElse: 'Maanta wax kale lagaama rabo.',
    empty: 'Weli halkan waxba ma yaallaan.',
    needsLocationTitle: 'Xaggee joogtaa?',
    needsLocation:
      'Waqtiyada salaadda, taariikhda Hijriga iyo wax kasta oo maalintu kaa rabto waxay ku xiran yihiin goob qiyaas ah. Taleefankan ayaa lagu xisaabiyaa, meelna looma diro.',
    chooseCity: 'Beddelkeeda magaalo dooro',
    chooseCityDetail: 'Ogolaansho looma baahna. Wax walba sidooda ayey u shaqeynayaan.',
  },
  plan: {
    rightNow: 'Hadda',
    tryOneMore: 'Isku day mid kale',
    add: 'Ku dar',
    notNow: 'Hadda maya',
    alsoNow: 'Sidoo kale hadda',
    upNext: 'Xiga',
    before: 'Ka hor',
    after: 'Kadib',
    soon: 'Dhawaan',
    inAboutAnHour: 'Qiyaastii saacad kadib',
    inAboutHours: (hours: number): string =>
      `Qiyaastii ${count(hours, 'saacad', 'saacadood')} kadib`,
    context: 'Halka aad joogto',
    comingUp: 'Toddobaadkan dambe',
    alsoToday: 'Sidoo kale maanta',
    tomorrow: 'Berri',
    inDays: (days: number): string => `${count(days, 'Hal maalin', 'maalmood')} kadib`,
    prayers: 'Salaadaha',
    optional: 'Ikhtiyaari',
    expected: 'La filayo',
    confirmLocally: 'Ka xaqiiji hay’adda deegaankaaga',
    prayed: 'Waa la tukaday',
    makeUp: 'Qadaa',
    outstanding: (n: number): string => `${count(n, 'Hal salaad', 'salaadood')} oo qadaa ah`,
  },
  prayer: {
    fajr: 'Subax',
    dhuhr: 'Duhur',
    asr: 'Casar',
    maghrib: 'Maqrib',
    isha: 'Cishe',
    jumuah: 'Jimce',
  },
  window: {
    fajr: 'Subax',
    sunrise: 'Barqo',
    dhuhr: 'Duhur kadib',
    asr: 'Galab',
    maghrib: 'Maqrib kadib',
    isha: 'Habeen',
    jumuah: 'Jimce kadib',
  },
  notifications: {
    title: 'Xusuusiyeyaal',
    windows: 'Adkaarta subaxa iyo galabta',
    lookAhead: 'Maalmaha soonka ee soo socda',
    prayers: 'Xusuusiyeyaasha salaadda',
    prayersDetail: 'Si caadi ah waa dansan yihiin — abka aadaanku horeba wuu kuu qabtaa.',
    quietHours: 'Saacadaha aamusnaanta',
    quietHoursDetail: (from: number, to: number): string => `${from}:00 ilaa ${to}:00`,
    quietHoursOff: 'Dansan',
    perDay: 'Xadka maalinlaha ah',
    permission: 'Ogolaansho',
    permissionGranted: 'La oggolaaday',
    permissionDenied: 'Waa laga damiyey dejinta nidaamka',
    permissionUndetermined: 'Weli lama weydiin',
    permissionUnavailable: 'Qalabkan laguma heli karo',
    openSettings: 'Fur dejinta nidaamka',
    whichItems: 'Qodobbadee',
    whichItemsDetail: 'Waxaa halkan ka muuqda oo keliya qodobbada leh waqti lagugu xusuusiyo.',
    sendTest: 'Dir xusuusiye tijaabo ah',
    sendTestDetail: 'Dhowr ilbiriqsi gudahood ayuu imanayaa.',
    testTitle: 'Xusuusiye tijaabo ah',
    testBody: 'Sidan ayuu u eg yahay xusuusiye ka yimaada Ihsaanly.',
    action: {
      done: 'Waa la sameeyey',
      later: 'Goor dambe',
    },
    body: {
      window: 'Hadda, ilaa waqtigu ka dhammaanayo.',
      windowUntil: (closes: string): string => `Furan ilaa ${closes}.`,
      tomorrow: 'Berri.',
      prayerWindow: 'Waqtigii waa galay. Wuu furnaanayaa ilaa salaadda xigta.',
    },
  },
  event: {
    ascending: 'Kor u bixid',
    descending: 'Hoos u degid',
    driving: 'Gaari wadid',
    travel: 'Safar',
    'leaving-home': 'Ka bixidda guriga',
    'entering-home': 'Guriga oo la yimaado',
  },
  events: {
    title: 'Halka aad joogto',
    explanation:
      'Inta badan xilliyadan taleefan ma ogaan karo gabi ahaanba — wiish, buur, jaranjaro. Ducooyinkooda hal taabasho ayey u jiraan, Maktabadda iyo widget-ka.',
    detectHome: 'I ogeysii markaan guriga ka baxo',
    detectHomeDetail:
      'Waa qiyaas. Taleefanku wuxuu dareemaa qiyaastii boqol mitir albaabka ka dib, ilaa daqiiqad dib u dhac ah, sidaa darteed u qaado xusuusin ee ha u qaadan xilliga saxda ah.',
    setHome: 'Ka dhig guriga meesha aan hadda joogo',
    homeUnset: 'Lama dejin',
    homeNeeded: 'Weli waxba lama ilaalinayo — hoos ka deji guriga.',
    noPlaceYet: 'Marka hore deji halka aad joogto',
    manual: 'Beddelkeeda abka u sheeg',
    manualDetail: 'Adigu xaalad kici marka aanu dareeme ogaan karin.',
  },
  qada: {
    title: 'Qadaa',
    intro:
      'Salaadaha kugu dhiman intaadan diiwaangelin bilaabin, iyo kuwa kugu dhiman tan iyo markaas. Tiro keliya, marna liis maaha. Tirintu waxay ka bilaabataa salaadda ugu horreysa ee aad calaamadiso.',
    owed: 'Kuwa hore kuugu dhiman',
    madeUp: 'Kuwa hadda la qadeeyey',
    record: (n: number): string => (n === 1 ? 'Diiwaan geli mid' : `Diiwaan geli ${n}`),
    outstanding: (n: number): string => `${n === 1 ? 'Hal' : n} baa kugu dhiman`,
    none: 'Waxba kuguma dhimna',
    summary: (n: number): string => `${count(n, 'Hal salaad', 'salaadood')} baa kugu dhiman`,
    manage: 'Hagaaji waxa kugu dhiman',
    manageDetail: 'Deji waxa aad soo wadato, oo hal mar ku diiwaan geli qadaada.',
  },
  fasting: {
    title: 'Soonka',
    intro:
      'Maalmaha Ramadaan ee aadan soomin, iyo kuwii hore kugu dhimanaa. Tiro keliya, marna liis maaha.',
    notFastingToday: 'Maanta soon ma ihi',
    notFastingTodayDetail: 'Hal maalin ayuu u haynayaa qadaa goor dambe ah.',
    recordedToday: 'Waa la qoray: maanta soon ma ihid',
    undo: 'Taabo si aad uga noqoto',
    summary: (n: number): string => `Qadaa soon: ${count(n, 'hal maalin', 'maalmood')}`,
    outstanding: (n: number): string =>
      n === 1 ? 'Hal maalin baa kugu dhiman' : `${n} maalmood baa kugu dhiman`,
    none: 'Waxba kuguma dhimna',
    owed: 'Kuwa hore kuugu dhiman',
    recordMadeUp: 'Diiwaan geli mid la qadeeyey',
  },
  history: {
    title: 'Taariikhda',
    empty: 'Weli waxba lama diiwaangelin.',
    firstWeek:
      'Maalin kasta oo aad salaad calaamadiso ama qodob dhammayso halkan ayaa lagu hayaa. Toddobaad kadib waxaad arki doontaa salaadaha aad badanaa goor hore tukato iyo qodobbada aad joogteyso.',
    daysActive: (days: number): string =>
      `${count(days, 'Hal maalin', 'maalmood')} ayaa la diiwaangeliyey`,
    prayers: 'Salaadaha',
    completed: 'La dhammeeyey',
    times: (n: number): string => (n === 1 ? 'hal mar' : `${n} jeer`),
    early: (minutes: number): string =>
      `badanaa qiyaastii ${minutes} daqiiqo marka waqtigu galo kadib`,
    late: (minutes: number): string =>
      `badanaa qiyaastii ${minutes} daqiiqo ka hor inta waqtigu uusan bixin`,
  },
  data: {
    title: 'Xogtaada',
    explanation:
      'Wax walba oo halkan ah waxay ku jiraan qalabkan. Waxba kama baxaan ilaa adigu aad dirto, shaashaddan ayaadna ka dirtaa.',
    export: 'Dhoofi xogtayda',
    exportDetail: 'Qoraal la akhriyi karo oo aad hayn karto, ama u qaadan karto qalab kale.',
    importing: 'Ka soo gali fayl',
    importDetail:
      'Wuu isku daraa, ma beddelo. Isla faylka oo laba jeer la soo geliyo waxba ma beddelo.',
    diagnostics: 'Dir warbixin cilad-baaris',
    diagnosticsDetail:
      'Waxaa loogu talagalay xallinta dhibaato. Waxay ka kooban tahay dejintaada, diiwaanka camalkaaga, isku-duwayaashaada qiyaasta ah iyo khaladaadkii dhowaa. Waad arki doontaa inta aan la dirin.',
    imported: (n: number): string => `Waxaa lagu daray ${count(n, 'hal diiwaan', 'diiwaan')}.`,
    importFailed: 'Faylkaas lama akhriyi karo.',
    shareFailed: 'Wadaagistu qalabkan kama shaqeyso.',
    delete: 'Tirtir xogtayda',
    deleteDetail:
      'Wax walba oo qalabkan ku jira: dejinta iyo diiwaanka camalkaaga. Abku mar kale ayuu bilaabanayaa.',
    deleteConfirmTitle: 'Wax walba ma la tirtiraa?',
    deleteConfirmBody:
      'Dejintaada iyo diiwaanka camalkaaga waa laga saarayaa qalabkan. Meel kale nuqul kuma jiro haddii aadan mid dhoofin.',
    deleteConfirm: 'Tirtir',
    cancel: 'Jooji',
  },
  diagnostics: {
    title: 'Warbixinta cilad-baarista',
    explanation:
      'Kani waa waxa warbixintu ka kooban tahay. Waxba lama dirayo ilaa aad doorato inaad dirto, adigaana dooranaya meesha ay u socoto.',
    version: 'Nooca abka',
    device: 'Qalabka',
    coordinates: 'Isku-duwayaasha qiyaasta ah',
    noCoordinates: 'Waxba lama kaydin',
    records: 'Diiwaanka camalka',
    settings: 'Dejinta la kaydiyey',
    failures: 'Cilladaha la diiwaangeliyey',
    failuresDetail: (n: number): string => `${n} uu abku xalliyey adigoon loo sheegin`,
    reminders: 'Xusuusiyeyaal',
    remindersDetail: (permission: string, pending: number): string =>
      `${permission} · ${pending} sugaya`,
    error: 'Khaladkii ugu dambeeyey',
    errorIncluded: 'Mid ayaa ku jira',
    showRaw: 'Tus warbixinta oo dhan',
    hideRaw: 'Qari warbixinta oo dhan',
    send: 'Dir',
    cancel: 'Hadda maya',
  },
  about: {
    title: 'Ku saabsan',
    version: 'Nooca',
    content: 'Waxa ku jira',
    contentUnreviewed: (n: number): string =>
      `${n} qodob, qabyo ah oo sugaya in aqoonyahan diini ah oo magaciisa la sheegay dib u eego.`,
    contentReviewedBy: (name: string, n: number): string => `${n} qodob, uu dib u eegay ${name}.`,
    donate: 'Deeq bixi',
    donateBody:
      'Waa ikhtiyaari, waxna kuuma furayso. Qayb kasta oo abka ah waa bilaash, bilaashna way ahaan doontaa. Waxay ka furmaysaa biraawsarkaaga.',
    privacyPolicy: 'Siyaasadda asturnaanta',
    privacyTitle: 'Waxba kama baxaan taleefankan',
    privacyBody:
      'Ihsaanly ma laha akoon, server iyo falanqeyn midna. Goobtaada waxaa qalabka lagu isticmaalaa si loo xisaabiyo waqtiyada salaadda, halkan oo keliya ayaana lagu kaydiyaa. Diiwaanka camalkaaga halkan oo keliya ayaa lagu kaydiyaa. Meelna waxba looma diro ilaa adigu aad dhoofiso ama wadaagto. Deeqdu waa xiriirka keliya ee abka ka baxa: waxay furtaa biraawsarkaaga, boggaasna qayb kama aha Ihsaanly.',
    licences: 'Waxaa lagu dhisay',
    licencesBody:
      'Expo iyo React Native, maktabadda adhan ee waqtiyada salaadda, jaantusyada kalandarka Umm al-Qura, xogta magaalooyinka ee city-timezones, iyo Natural Earth ee khariidadda. Mid kasta waxaa loo isticmaalaa sida ruqsaddiisa furan, oo ku qoran kaydka koodka.',
  },
  memorise: {
    title: 'Baro',
    start: 'Ku celceli',
    hide: 'Qari mid kale',
    known: 'Waan aqaan',
    knownDetail: 'Maktabadda ayuu ku jiraa. Xusuusiyeyaasha kama soo muuqdo mar dambe.',
    notKnown: 'Weli waan baranayaa',
    noAudio: 'Kan weli akhris cod ah uma laha.',
    play: 'Shid',
    stop: 'Jooji',
    loop: 'Ku celi',
  },
  language: {
    title: 'Luqadda',
    restart:
      'Carabigu wuxuu ka akhrismaa midig ilaa bidix. U beddelidda ama ka beddelidda waxay dib u bilaabaysaa abka, ama waxay kaa codsanaysaa inaad dib u furto.',
    incomplete:
      'Ingiriisigu waa asalka. Luqad kasta oo kale waa qabyo weli sugaysa dib u eegis qof si fiican u yaqaan.',
    reopenTitle: 'Dib u fur Ihsaanly',
    reopenBody:
      'Luqaddan waxay ka akhrismaa midig ilaa bidix. Xir Ihsaanly oo mar kale fur si isbeddelku u dhammaado.',
    names: {
      en: 'English',
      ar: 'العربية',
      fr: 'Français',
      it: 'Italiano',
      ja: '日本語',
      hi: 'हिन्दी',
      ur: 'اردو',
      so: 'Soomaali',
      zh: '中文（普通话）',
      yue: '廣東話',
    },
  },
  appearance: {
    title: 'Muuqaalka',
    system: 'Nidaamka',
    light: 'Iftiin',
    dark: 'Mugdi',
    note: 'Midabbadu weli nidaamka ayey ka yimaadaan, sidaa darteed dejintiisa kala-soocidda midabka way shaqeysaa labada xaaladoodba.',
  },
  moonSighting: {
    title: 'Muuqashada bisha',
    explanation:
      'Taariikhaha abkan waa la xisaabiyaa. Bulshooyinku way ku kala duwan yihiin inay raacaan xisaabta ama muuqashada deegaanka, labaduna inta badan hal maalin ayey ku kala duwan yihiin. Raac cidda bulshadaadu raacdo, oo taariikhda ka hagaaji dejinta si abku ula jaanqaado.',
    disclaimer: 'Kuwan waxaa loo taxay si aad taada u hesho. Abkani midkoodna ma taageerayo.',
  },
  tracking: {
    title: 'Diiwaangelinta',
    active: 'Shaqeynaysa',
    travelling: 'Safar',
    travellingDetail:
      'Gaabinta salaadda waa laguu soo bandhigayaa, sunnooyinka joogtada ah waa la dhinac dhigayaa, soonkuna waa laguu soo jeedinayaa, lagaama filayo.',
    paused: 'Hakad geli diiwaangelinta salaadda',
    pausedDetail:
      'Salaadaha lama diiwaangelinayo, qadaana kuma soo kordhayso. Way dansanaanaysaa ilaa aad dib u shiddo.',
    jumuah: 'Jimcaha maalinta Jimcaha',
    jumuahChoice: {
      auto: 'Si toos ah',
      attend: 'Waxaan tukadaa Jimcaha',
      dhuhr: 'Waxaan tukadaa Duhur',
    },
    jumuahAutoDetail:
      'Jimce maalinta Jimcaha, haddii aadan safar ku jirin ama aadan dooran "Walaal (dhedig)".',
  },
  hijri: {
    title: 'Taariikhda Hijriga',
    offset: 'Hagaaji taariikhda',
    approximate: 'La xisaabiyey — ka xaqiiji hay’adda ay bulshadaadu raacdo.',
    explanation:
      'Kalandar la xisaabiyey iyo muuqashada bisha ee deegaanku inta badan hal ama laba maalmood ayey ku kala duwan yihiin. Halkan ka dhaqaaji taariikhda si abku ula jaanqaado bulshadaada. Taariikhaha maalmaha soonka had iyo jeer waxaa loo muujiyaa sida la filayo, marna sida hubaal ah.',
    offsetLabel: (days: number): string =>
      days === 0
        ? 'Isbeddel ma leh'
        : `${days > 0 ? '+' : ''}${days} ${Math.abs(days) === 1 ? 'maalin' : 'maalmood'}`,
    format: (day: number, month: string, year: number): string => `${day} ${month} ${year}`,
  },
  hijriMonth: {
    1: 'Muxarram',
    2: 'Safar',
    3: 'Rabiicul Awwal',
    4: 'Rabiicul Aakhir',
    5: 'Jamaadal Uulaa',
    6: 'Jamaadal Aakhira',
    7: 'Rajab',
    8: 'Shacbaan',
    9: 'Ramadaan',
    10: 'Shawwaal',
    11: 'Dul Qacda',
    12: 'Dul Xijja',
  },
  calculation: {
    title: 'Xisaabinta salaadda',
    method: 'Habka',
    asr: 'Casar',
    highLatitude: 'Loolka sare',
    selected: 'La doortay',
    explanation:
      'Waqtiyada salaadda qalabkan ayaa lagu xisaabiyaa, marna saacad ahaan looma muujiyo — waxay go’aamiyaan oo keliya qaybta maalinta aad ku jirto.',
    highLatitudeExplanation:
      'Qiyaastii 48° waqooyi wixii ka sarreeya, Cishuhu ma dhaco qayb ka mid ah sannadka. Tani waxay go’aamisaa waxa beddelkeeda la isticmaalo.',
  },
  asr: {
    shafi: 'Caadi',
    hanafi: 'Xanafi',
  },
  highLatitude: {
    middleofthenight: 'Bartamaha habeenka',
    seventhofthenight: 'Toddobaad meelood oo habeenka ah',
    twilightangle: 'Xagasha shafaqa',
  },
  method: {
    MuslimWorldLeague: 'Ururka Caalamka Islaamka',
    Egyptian: 'Hay’adda Guud ee Masar',
    Karachi: 'Jaamacadda Cilmiga Islaamka, Karachi',
    UmmAlQura: 'Umm al-Qura, Makka',
    Dubai: 'Dubay',
    MoonsightingCommittee: 'Guddiga Muuqashada Bisha',
    NorthAmerica: 'ISNA, Waqooyiga Ameerika',
    Kuwait: 'Kuwayt',
    Qatar: 'Qadar',
    Singapore: 'Singabuur',
    Tehran: 'Tehraan',
    Turkey: 'Turkiga',
  },
  library: {
    title: 'Maktabadda',
    empty: 'Adkaarta, ducooyinka iyo camallada sunnada ah halkan ayaa lagu taxi doonaa.',
    search: 'Ku raadi magac ama xaalad',
    noResults: 'Waxba lama mid aha.',
    filterAll: 'Dhammaan',
    filterOnToday: 'Maanta ku jira',
    filterKnown: 'La yaqaan',
    onToday: 'Maanta ku jira',
    known: 'La yaqaan',
    emptyOnToday: 'Weli waxba kuma jiraan Maanta. Fur qodob kasta oo shid.',
    emptyKnown:
      'Weli waxba looma calaamadin la yaqaan. Ku celceli qodob, oo sheeg marka aad xafiddo.',
    terms: 'Qaamuuska ereyada',
    termsDetail: 'Sunno, rawaatib, adkaar, qadaa iyo inta kale, mid kasta hal weedh.',
  },
  category: {
    adhkar: 'Adkaar',
    dhikr: 'Salaadda kadib',
    fasting: 'Soon',
    food: 'Cunid',
    home: 'Guri',
    masjid: 'Masaajid',
    prayer: 'Salaad',
    sleep: 'Hurdo iyo toosid',
    travel: 'Safar',
  },
  item: {
    done: 'Waa la sameeyey',
    doneToday: 'Maanta waa la sameeyey',
    undo: 'Ka noqo',
    counterReset: 'Dib u bilow',
    yourDay: 'Maalintaada',
    onToday: 'Maanta ku jira',
    onTodayDetail: 'Wuxuu soo muuqdaa marka xilligiisu yimaado',
    remind: 'I xusuusi',
    remindWindow: 'Marka waqtigiisu furmo',
    remindLookAhead: 'Fiidka ka horreeya',
    share: 'La wadaag',
    shareText: 'U wadaag qoraal ahaan',
    shareImage: 'U wadaag sawir ahaan',
    sharedFrom: 'Laga soo wadaagay Ihsaanly',
    transliteration: 'Higgaadda Laatiinka',
    translation: 'Macnaha',
    why: 'Sababta',
    how: 'Sida loo sameeyo',
    unreviewed: 'Sugaya dib u eegis',
    evidence: 'Daliilka',
    note: 'Culimadu way ku kala duwan yihiin',
    repeat: (times: number): string => `Ku celi ${times} jeer`,
    parts: 'Waxa la yiraahdo',
    partRepeat: (times: number): string => `${times} jeer`,
    gradedBy: (grader: string): string => `waxaa darajeeyey ${grader}`,
    quranReference: (surah: number, ayah: number): string => `Qur’aanka ${surah}:${ayah}`,
  },
  glossary: {
    title: 'Macnaha ereyada',
  },
  ruling: {
    fard: 'Faral',
    wajib: 'Waajib',
    'sunnah-muakkadah': 'Sunno la adkeeyey',
    sunnah: 'Sunno',
    mustahabb: 'Mustaxab',
    mubah: 'Bannaan',
  },
  grading: {
    sahih: 'Saxiix',
    hasan: 'Xasan',
    "da'if": 'Daciif',
    disputed: 'Lagu kala duwan yahay',
  },
  more: {
    title: 'Dheeraad',
    search: 'Raadi dejinta',
    prayer: 'Salaadda',
    app: 'Abka',
    practice: 'Camalkaaga',
    empty: 'Taariikhda, dejinta iyo caawimaaddu halkan ayey ku jiri doonaan.',
  },
  onboarding: {
    welcomeTitle: 'Xilliga, ee maaha saacadda.',
    welcomeBody:
      'Ihsaanly wuxuu kuu sheegaa marka adkaarta galabtu furan yihiin. Marna saacad maaha. Marna dhibco maaha.',
    howTitle: 'Adigu salaadda calaamadi. Sunnadu way soo baxaysaa.',
    howBody:
      'Taabo Duhur marka aad tukato, dikriga ka dambeeyaana wuu ku sugayaa. Waxba kama baxaan taleefankan. Akoon ma jiro, server ma jiro.',
    language: 'Luqadda',
    appearance: 'Muuqaalka',
    howSample: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    locationStep: 'Xaggee joogtaa?',
    locationWhy: 'Qalabkan ayaa loogu isticmaalaa ogaanshaha qaybaha maalinta. Meelna looma diro.',
    genderStep: 'Hakadka diiwaangelinta',
    genderWhy:
      'Maalmaha qaarkood diiwaangelinta salaadda waa inay joogsato, iyadoo aan qadaa soo kordhin. Tani waxay abka u sheegaysaa inuu taas soo bandhigo iyo in kale.',
    brother: 'Walaal (lab)',
    brotherDetail: 'Hakad ma jiro',
    sister: 'Walaal (dhedig)',
    sisterDetail: 'Hakad waa la soo bandhigayaa',
    skip: 'Door inaanan sheegin',
    skipDetail: 'Hakadka si kastaba waa la soo bandhigayaa.',
    genderPrivacy: 'Qalabkan ayaa lagu kaydiyaa. Meelna looma diro, waxna kale looma isticmaalo.',
    remindersStep: 'Xusuusiyeyaal',
    remindersWhy:
      'Laba ama saddex maalintii, marna habeenkii. Waxaas oo dhan goor dambe ka beddel Dheeraad.',
    windowsDetail: 'Marka waqti kasta furmo',
    lookAheadDetail: 'Fiidka ka horreeya',
    startStep: 'Meel laga bilaabo',
    startWhy:
      'Dooro cabbir aad ku bilowdo. Wax kasta Maktabadda ku dar ama ka saar goorta aad rabto.',
    starting: 'Hadda bilaabaya',
    startingDetail: (n: number): string =>
      `${n} shay oo aad qaadi karto maalinta koowaad: laba waqti, hal dikri, laba duco. Qof waxan oo dhan ku cusub.`,
    essentials: 'Aasaasiga',
    essentialsDetail: (n: number): string =>
      `${n} qodob, maalin macquul ah ee maaha mid dhammaystiran. Qof horeba tukada oo raba sunnada ku xeeran.`,
    everything: 'Wax walba',
    everythingDetail: (n: number): string =>
      `Dhammaan ${n} qodob. Qof yaqaan waxa ku jira oo raba kalandarka oo dhan.`,
    skipIntro: 'Ka bood',
    skipLocation: 'Hadda ka bood',
    reminderPolicy: (perDay: number, from: number, to: number): string =>
      `Ugu badnaan ${perDay} maalintii, waxbana ${from}:00 iyo ${to}:00 dhexdooda.`,
    reminderCap: (perDay: number): string => `Ugu badnaan ${perDay} maalintii.`,
    included: 'Ku jira',
    andMore: (n: number): string => `iyo ${n} kale`,
    back: 'Dib',
    continue: 'Sii wad',
    allowReminders: 'Oggolow xusuusiyeyaasha',
    notNow: 'Hadda maya',
    done: 'Bilow',
  },
  location: {
    title: 'Goobta',
    notSet: 'Lama dejin',
    currentLocation: 'Goobta hadda',
    useDevice: 'Isticmaal goobtayda',
    useDeviceDetail: 'Waxba kama baxaan taleefankan.',
    locating: 'Waa lagu raadinayaa…',
    orSearch: 'ama raadi magaalo',
    follows: 'Waqtiyada salaadda waxay raaci doonaan meeshan.',
    search: 'Raadi magaalo',
    noResults: 'Magaalo taas la mid ah lama helin.',
    unavailable:
      'Adeegyada goobta waa laga damiyey qalabkan. Shid, ama beddelkeeda raadi magaaladaada.',
    declined:
      'Helitaanka goobta waa la diiday. Beddelkeeda raadi magaaladaada — wax walba way shaqeynayaan.',
    explanation:
      'Qalabkan ayaa loogu isticmaalaa ogaanshaha waqtiyada salaadda. Marna meelna looma diro.',
    attribution: 'Xogta magaalooyinka waxaa laga qaatay city-timezones (MIT).',
  },
  textField: {
    clear: 'Tirtir',
  },
  error: {
    title: 'Wax baa khaldamay',
    retry: 'Isku day mar kale',
  },
  notFound: {
    title: 'Lama helin',
    body: 'Shaashaddaas ma jirto.',
  },
  widgets: {
    quickDuas: 'Duco degdeg ah',
    duaOfTheDay: 'Ducada maanta',
    nothingNow: 'Hadda waxba lagaa rabo ma jiraan',
    openApp: 'Fur Ihsaanly si aad u cusboonaysiiso',
  },
}
