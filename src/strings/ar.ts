import type { Strings } from './en'

/**
 * Arabic interface copy. A complete draft, written in one pass and not yet
 * reviewed by a qualified speaker; the review is a release condition, not a
 * nicety. Content text (adhkar, duas, evidence) does not live here.
 */

/** Arabic counts: singular, dual, 3 to 10 take the plural, 11 and up the singular accusative. */
function count(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one
  if (n === 2) return two
  if (n >= 3 && n <= 10) return `${n} ${few}`
  return `${n} ${many}`
}

export const ar: Strings = {
  tabs: {
    today: 'اليوم',
    library: 'المكتبة',
    more: 'المزيد',
  },
  today: {
    title: 'اليوم',
    empty: 'لا شيء هنا بعد.',
    needsLocation: 'حدّد موقعك ليعرف التطبيق في أي جزء من اليوم أنت.',
  },
  plan: {
    rightNow: 'الآن',
    context: 'بالقرب منك',
    comingUp: 'قادم',
    tomorrow: 'غدًا',
    inDays: (days: number): string => `بعد ${count(days, 'يوم', 'يومين', 'أيام', 'يومًا')}`,
    prayers: 'الصلوات',
    optional: 'اختياري',
    expected: 'متوقَّع',
    confirmLocally: 'تأكد من جهتك المحلية',
    prayed: 'صُلّيت',
    makeUp: 'للقضاء',
    outstanding: (n: number): string =>
      `${count(n, 'صلاة واحدة', 'صلاتان', 'صلوات', 'صلاةً')} للقضاء`,
  },
  prayer: {
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
  },
  window: {
    fajr: 'الفجر',
    sunrise: 'الصباح',
    dhuhr: 'بعد الظهر',
    asr: 'المساء',
    maghrib: 'بعد المغرب',
    isha: 'الليل',
  },
  notifications: {
    title: 'التنبيهات',
    windows: 'أذكار الصباح والمساء',
    lookAhead: 'أيام الصيام القادمة',
    prayers: 'تنبيهات الصلاة',
    prayersDetail: 'معطَّلة افتراضيًا — تطبيق الأذان لديك يقوم بذلك.',
    quietHours: 'ساعات الهدوء',
    quietHoursDetail: (from: number, to: number): string => `من ${from}:00 إلى ${to}:00`,
    quietHoursOff: 'معطَّل',
    perDay: 'في اليوم على الأكثر',
    body: {
      window: 'الآن، حتى ينتهي الوقت.',
      tomorrow: 'غدًا.',
    },
  },
  event: {
    ascending: 'الصعود',
    descending: 'النزول',
    driving: 'القيادة',
    travel: 'السفر',
    'leaving-home': 'الخروج من المنزل',
    'entering-home': 'العودة إلى المنزل',
  },
  events: {
    title: 'أين أنت',
    explanation:
      'أكثر هذه اللحظات لا يستطيع الهاتف رصدها أصلًا — مصعد، أو تلّ، أو درج. أدعيتها على بُعد نقرة في المكتبة وعلى الأداة.',
    detectHome: 'لاحظ خروجي من المنزل',
    detectHomeDetail:
      'تقريبي. يلاحظ الهاتف على بُعد نحو مئة متر من الباب وبتأخير يصل إلى دقيقة، فاعتبره تذكيرًا لا اللحظة نفسها.',
    setHome: 'اجعل مكاني الحالي هو المنزل',
    homeUnset: 'غير محدد',
    manual: 'أخبر التطبيق بنفسك',
    manualDetail: 'أعلن الحالة بنفسك حين لا يجدها أي مستشعر.',
  },
  history: {
    title: 'السجل',
    empty: 'لم يُسجَّل شيء بعد.',
    daysActive: (days: number): string =>
      count(days, 'يوم واحد مسجَّل', 'يومان مسجَّلان', 'أيام مسجَّلة', 'يومًا مسجَّلًا'),
    prayers: 'الصلوات',
    completed: 'المُنجَز',
    times: (n: number): string => count(n, 'مرة واحدة', 'مرتان', 'مرات', 'مرة'),
    early: (minutes: number): string =>
      `عادةً بعد نحو ${count(minutes, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')} من بداية الوقت`,
    late: (minutes: number): string =>
      `عادةً قبل نحو ${count(minutes, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')} من انتهائه`,
  },
  data: {
    title: 'بياناتك',
    explanation: 'كل ما هنا يبقى على هذا الجهاز. لا يخرج منه شيء إلا إن أرسلته أنت من هذه الشاشة.',
    export: 'تصدير بياناتي',
    exportDetail: 'نص مقروء تحتفظ به أو تنقله إلى جهاز آخر.',
    importing: 'استيراد من ملف',
    importDetail: 'يُدمج ولا يستبدل. استيراد الملف نفسه مرتين لا يغيّر شيئًا.',
    diagnostics: 'إرسال تقرير تشخيصي',
    diagnosticsDetail:
      'لإصلاح مشكلة. يحوي إعداداتك وسجل ممارستك وإحداثياتك التقريبية والأخطاء الأخيرة. ستراه قبل إرساله.',
    imported: (n: number): string =>
      n >= 3 && n <= 10
        ? `أُضيفت ${n} مدخلات.`
        : `أُضيف ${count(n, 'مدخل واحد', 'مدخلان', 'مدخلات', 'مدخلًا')}.`,
    importFailed: 'تعذّرت قراءة هذا الملف.',
    shareFailed: 'المشاركة غير متاحة على هذا الجهاز.',
  },
  memorise: {
    title: 'احفظه',
    start: 'تدرَّب',
    hide: 'أخفِ سطرًا آخر',
    known: 'أعرف هذا',
    knownDetail: 'يبقى في المكتبة ويتوقف عن الظهور في التنبيهات.',
    notKnown: 'ما زلت أتعلم',
    noAudio: 'لا تلاوة لهذا بعد.',
    play: 'تشغيل',
    stop: 'إيقاف',
    loop: 'تكرار',
  },
  language: {
    title: 'اللغة',
    restart: 'العربية تُقرأ من اليمين إلى اليسار. التبديل إليها أو منها يعيد تشغيل التطبيق.',
    incomplete: 'تظهر اللغة هنا فقط بعد اكتمال محتواها ومراجعته. لا شيء مترجم آليًا.',
    names: {
      en: 'English',
      ar: 'العربية',
    },
  },
  appearance: {
    title: 'المظهر',
    system: 'النظام',
    light: 'فاتح',
    dark: 'داكن',
    note: 'الألوان تأتي من النظام على أي حال، فتنطبق إعدادات التباين فيه.',
  },
  moonSighting: {
    title: 'رؤية الهلال',
    explanation:
      'التواريخ في هذا التطبيق محسوبة. تختلف المجتمعات بين اتباع الحساب والرؤية المحلية، وكثيرًا ما يتفاوت الاثنان بيوم. اتبع من يتبعه مجتمعك، وعدّل التاريخ في الإعدادات ليوافقهم التطبيق.',
    disclaimer: 'هذه مذكورة لتجد جهتك بينها. التطبيق لا يتبنّى أيًّا منها.',
  },
  tracking: {
    title: 'التتبع',
    travelling: 'مسافر',
    travellingDetail: 'يُتاح القصر، وتتنحّى السنن الرواتب، ويُعرض الصيام ولا يُنتظر.',
    paused: 'إيقاف تتبع الصلاة',
    pausedDetail: 'لا تُسجَّل الصلوات ولا يتراكم قضاء. يبقى متوقفًا حتى تعيد تشغيله.',
  },
  hijri: {
    title: 'التاريخ الهجري',
    offset: 'تعديل التاريخ',
    approximate: 'محسوب — تأكد من الجهة التي يتبعها مجتمعك.',
    explanation:
      'كثيرًا ما يختلف التقويم المحسوب عن الرؤية المحلية بيوم أو يومين. حرّك التاريخ هنا ليوافق التطبيق مجتمعك. تُعرض تواريخ الصيام دائمًا على أنها متوقعة، لا مؤكدة.',
    offsetLabel: (days: number): string =>
      days === 0
        ? 'بلا تغيير'
        : `${days > 0 ? 'زيادة' : 'نقصان'} ${count(Math.abs(days), 'يوم', 'يومين', 'أيام', 'يومًا')}`,
    format: (day: number, month: string, year: number): string => `${day} ${month} ${year}`,
  },
  hijriMonth: {
    1: 'محرّم',
    2: 'صفر',
    3: 'ربيع الأول',
    4: 'ربيع الآخر',
    5: 'جمادى الأولى',
    6: 'جمادى الآخرة',
    7: 'رجب',
    8: 'شعبان',
    9: 'رمضان',
    10: 'شوّال',
    11: 'ذو القعدة',
    12: 'ذو الحجة',
  },
  calculation: {
    title: 'حساب مواقيت الصلاة',
    method: 'الطريقة',
    asr: 'العصر',
    highLatitude: 'العروض العليا',
    selected: 'مُحدَّد',
    explanation:
      'تُحسب المواقيت على هذا الجهاز ولا تُعرض أبدًا كأوقات بالساعة — إنما تحدد في أي جزء من اليوم أنت.',
    highLatitudeExplanation:
      'فوق نحو 48° شمالًا لا يقع وقت العشاء في جزء من السنة. هذا يحدد ما يُستخدم بدلًا منه.',
  },
  asr: {
    shafi: 'الجمهور',
    hanafi: 'الحنفي',
  },
  highLatitude: {
    middleofthenight: 'منتصف الليل',
    seventhofthenight: 'سُبع الليل',
    twilightangle: 'زاوية الشفق',
  },
  method: {
    MuslimWorldLeague: 'رابطة العالم الإسلامي',
    Egyptian: 'الهيئة المصرية العامة للمساحة',
    Karachi: 'جامعة العلوم الإسلامية، كراتشي',
    UmmAlQura: 'أم القرى، مكة',
    Dubai: 'دبي',
    MoonsightingCommittee: 'لجنة رؤية الهلال',
    NorthAmerica: 'الجمعية الإسلامية لأمريكا الشمالية',
    Kuwait: 'الكويت',
    Qatar: 'قطر',
    Singapore: 'سنغافورة',
    Tehran: 'طهران',
    Turkey: 'تركيا',
  },
  library: {
    title: 'المكتبة',
    empty: 'ستُدرج هنا الأذكار والأدعية والأعمال المسنونة.',
    search: 'ابحث بالاسم أو الموقف',
    noResults: 'لا شيء يطابق ذلك.',
  },
  category: {
    adhkar: 'الأذكار',
    dhikr: 'بعد الصلاة',
    fasting: 'الصيام',
    food: 'الطعام',
    home: 'المنزل',
    masjid: 'المسجد',
    prayer: 'الصلاة',
    sleep: 'النوم والاستيقاظ',
    travel: 'السفر',
  },
  item: {
    transliteration: 'النقل الصوتي',
    translation: 'الترجمة',
    evidence: 'الدليل',
    note: 'اختلف العلماء',
    repeat: (times: number): string => `كرِّر ${count(times, 'مرة واحدة', 'مرتين', 'مرات', 'مرة')}`,
    gradedBy: (grader: string): string => `حكم عليه ${grader}`,
    quranReference: (surah: number, ayah: number): string => `القرآن ${surah}:${ayah}`,
  },
  ruling: {
    fard: 'فرض',
    wajib: 'واجب',
    'sunnah-muakkadah': 'سنة مؤكدة',
    sunnah: 'سنة',
    mustahabb: 'مستحب',
    mubah: 'مباح',
  },
  grading: {
    sahih: 'صحيح',
    hasan: 'حسن',
    "da'if": 'ضعيف',
    disputed: 'مختلَف فيه',
  },
  more: {
    title: 'المزيد',
    empty: 'هنا سيكون السجل والإعدادات والمساعدة.',
  },
  onboarding: {
    welcomeTitle: 'اللحظة، لا الساعة.',
    welcomeBody: 'يخبرك إحسانلي حين يحين وقت أذكار المساء. لا وقتًا بالساعة، ولا درجات.',
    howTitle: 'تُسجِّل الصلاة، فتظهر السنة.',
    howBody:
      'انقر على الظهر بعد أن تصليه، فتجد الذكر الذي يليه في انتظارك. لا يخرج شيء من هذا الهاتف. لا حساب ولا خادم.',
    language: 'اللغة',
    appearance: 'المظهر',
    howSample: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    locationStep: 'أين أنت؟',
    locationWhy: 'يُستخدم على هذا الجهاز لتحديد أجزاء اليوم. لا يُرسل إلى أي مكان.',
    genderStep: 'أمر أخير',
    genderWhy:
      'يُسأل عنه فقط ليُتاح إيقاف التتبع حيث ينطبق. يُحفظ على هذا الجهاز ولا يُستخدم لغير ذلك.',
    female: 'أنثى',
    male: 'ذكر',
    skip: 'أفضّل عدم الإجابة',
    remindersStep: 'التنبيهات',
    remindersWhy:
      'اثنان أو ثلاثة في اليوم، ولا شيء في الليل. يمكنك تغيير أي من هذا لاحقًا من «المزيد».',
    windowsDetail: 'عند بداية كل وقت',
    lookAheadDetail: 'في المساء السابق',
    startStep: 'نقطة بداية',
    startWhy: 'اختر حجمًا تبدأ به. أضِف أو أزِل ما تشاء من المكتبة في أي وقت.',
    essentials: 'الأساسيات',
    essentialsDetail: (n: number): string =>
      `${count(n, 'عنصر واحد', 'عنصران', 'عناصر', 'عنصرًا')}، اختيرت لتكون يومًا معقولًا لا كاملًا.`,
    everything: 'الكل',
    everythingDetail: (n: number): string =>
      `جميع العناصر، ${count(n, 'عنصر', 'عنصران', 'عناصر', 'عنصرًا')}.`,
    skipIntro: 'تخطّي',
    back: 'رجوع',
    continue: 'متابعة',
    allowReminders: 'السماح بالتنبيهات',
    notNow: 'ليس الآن',
    done: 'ابدأ',
  },
  location: {
    title: 'الموقع',
    notSet: 'غير محدد',
    currentLocation: 'الموقع الحالي',
    useDevice: 'استخدم موقعي',
    search: 'ابحث عن مدينة',
    noResults: 'لا مدن تطابق ذلك.',
    unavailable: 'خدمات الموقع معطّلة على هذا الجهاز. فعّلها، أو ابحث عن مدينتك بدلًا من ذلك.',
    declined: 'رُفض الوصول إلى الموقع. ابحث عن مدينتك بدلًا من ذلك — كل شيء يعمل كما هو.',
    explanation: 'يُستخدم على هذا الجهاز لتحديد أوقات الصلاة. لا يُرسل إلى أي مكان.',
    attribution: 'بيانات المدن من city-timezones (MIT).',
  },
  error: {
    title: 'حدث خطأ ما',
    retry: 'أعد المحاولة',
  },
  notFound: {
    title: 'غير موجود',
    body: 'هذه الشاشة غير موجودة.',
  },
}
