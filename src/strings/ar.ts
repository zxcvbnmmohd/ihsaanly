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
    nothingElse:
      '\u0644\u0627 \u0634\u064a\u0621 \u0622\u062e\u0631 \u0645\u0637\u0644\u0648\u0628 \u0645\u0646\u0643 \u0627\u0644\u064a\u0648\u0645.',
    empty: 'لا شيء هنا بعد.',
    needsLocationTitle: 'أين أنت؟',
    needsLocation:
      'أوقات الصلاة والتاريخ الهجري وكل ما يطلبه اليوم منك تتبع موقعًا تقريبيًا. يُحسب على هذا الهاتف ولا يُرسل إلى أي مكان.',
    chooseCity: 'اختر مدينة بدلًا من ذلك',
    chooseCityDetail: 'لا يحتاج إذنًا. كل شيء يعمل كما هو.',
  },
  plan: {
    rightNow: 'الآن',
    tryOneMore: 'جرّب واحدًا آخر',
    add: 'أضِف',
    notNow: 'ليس الآن',
    alsoNow: 'أيضًا الآن',
    upNext: 'التالي',
    before: 'قبلها',
    after: 'بعدها',
    soon: 'قريبًا',
    inAboutAnHour: 'بعد نحو ساعة',
    inAboutHours: (hours: number): string =>
      `بعد نحو ${count(hours, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`,
    context: 'بالقرب منك',
    comingUp: 'لاحقًا هذا الأسبوع',
    alsoToday: 'أيضًا اليوم',
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
    permission: 'الإذن',
    permissionGranted: 'مسموح',
    permissionDenied: 'معطَّل من إعدادات النظام',
    permissionUndetermined: 'لم يُطلب بعد',
    permissionUnavailable: 'غير متاح على هذا الجهاز',
    openSettings: 'افتح إعدادات النظام',
    whichItems: 'أي العناصر',
    whichItemsDetail: 'تظهر هنا العناصر التي لها وقت يمكن التذكير به فقط.',
    sendTest: 'أرسل تنبيهًا تجريبيًا',
    sendTestDetail: 'يصل خلال ثوانٍ.',
    testTitle: 'تنبيه تجريبي',
    testBody: 'هكذا يبدو التنبيه من إحسانلي.',
    action: {
      done: 'تم',
      later: 'لاحقًا',
    },
    body: {
      window: 'الآن، حتى ينتهي الوقت.',
      windowUntil: (closes: string): string => `مفتوح حتى ${closes}.`,
      tomorrow: 'غدًا.',
      prayerWindow: 'دخل الوقت. تبقى النافذة مفتوحة حتى الصلاة التالية.',
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
    homeNeeded:
      '\u0644\u0627 \u0634\u064a\u0621 \u062a\u062d\u062a \u0627\u0644\u0645\u0631\u0627\u0642\u0628\u0629 \u0628\u0639\u062f \u2014 \u062d\u062f\u0651\u062f \u0627\u0644\u0645\u0646\u0632\u0644 \u0623\u062f\u0646\u0627\u0647.',
    noPlaceYet:
      '\u062d\u062f\u0651\u062f \u0645\u0643\u0627\u0646\u0643 \u0623\u0648\u0644\u0627\u064b',
    manual: 'أخبر التطبيق بنفسك',
    manualDetail: 'أعلن الحالة بنفسك حين لا يجدها أي مستشعر.',
  },
  qada: {
    title: 'القضاء',
    intro: 'صلوات عليك من قبل أن تبدأ المتابعة، وما تراكم بعدها. عدد لا قائمة.',
    owed: 'عليك من قبل',
    madeUp: 'قضيتها الآن',
    record: (n: number): string => `سجّل ${count(n, 'واحدة', 'اثنتين', 'صلوات', 'صلاة')}`,
    outstanding: (n: number): string => `${count(n, 'صلاة واحدة', 'صلاتان', 'صلوات', 'صلاة')} عليك`,
    none: 'لا شيء عليك',
    summary: (n: number): string => `${count(n, 'صلاة واحدة', 'صلاتان', 'صلوات', 'صلاة')} عليك`,
    manage: 'ما عليك من قبل، أو عدة مرات معًا',
    manageDetail: 'حدّد ما تحمله من قبل وسجّل القضاء دفعة واحدة.',
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
    delete: 'احذف بياناتي',
    deleteDetail: 'كل ما على هذا الجهاز: الإعدادات وسجل ممارستك. يبدأ التطبيق من جديد.',
    deleteConfirmTitle: 'حذف كل شيء؟',
    deleteConfirmBody:
      'تُزال إعداداتك وسجل ممارستك من هذا الجهاز. لا توجد نسخة في أي مكان آخر إلا إن صدّرت واحدة.',
    deleteConfirm: 'احذف',
    cancel: 'إلغاء',
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
    restart:
      'العربية تُقرأ من اليمين إلى اليسار. التبديل إليها أو منها يعيد تشغيل التطبيق أو يطلب منك إعادة فتحه.',
    incomplete: 'تظهر اللغة هنا فقط بعد اكتمال محتواها ومراجعته. لا شيء مترجم آليًا.',
    reopenTitle: 'أعد فتح إحسانلي',
    reopenBody: 'العربية تُقرأ من اليمين إلى اليسار. أغلق إحسانلي ثم افتحه من جديد ليكتمل التغيير.',
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
  diagnostics: {
    title: 'تقرير تشخيصي',
    explanation: 'هذا ما يحويه التقرير. لا يُرسل شيء حتى تختار إرساله، وأنت من يحدّد وجهته.',
    version: 'إصدار التطبيق',
    device: 'الجهاز',
    coordinates: 'إحداثيات تقريبية',
    noCoordinates: 'غير محفوظة',
    records: 'سجلات الممارسة',
    settings: 'الإعدادات المحفوظة',
    reminders: 'التذكيرات',
    remindersDetail: (permission: string, pending: number): string =>
      `${permission} · ${count(pending, 'مجدول واحد', 'مجدولان', 'مجدولة', 'مجدولة')}`,
    error: 'خطأ أخير',
    errorIncluded: 'مرفق واحد',
    showRaw: 'إظهار التقرير كاملًا',
    hideRaw: 'إخفاء التقرير كاملًا',
    send: 'أرسله',
    cancel: 'ليس الآن',
  },
  about: {
    title: 'عن التطبيق',
    version: 'الإصدار',
    content: 'المحتوى',
    contentUnreviewed: (n: number): string =>
      `${count(n, 'عنصر واحد', 'عنصران', 'عناصر', 'عنصرًا')}، مسوّدة بانتظار مراجعة عالم مسمّى.`,
    contentReviewedBy: (name: string, n: number): string =>
      `${count(n, 'عنصر واحد', 'عنصران', 'عناصر', 'عنصرًا')}، راجعها ${name}.`,
    donate: 'تبرَّع',
    donateBody: 'اختياري، ولا يفتح شيئًا. كل ما في التطبيق مجاني ويبقى مجانيًا. يُفتح في المتصفح.',
    privacyTitle: 'لا يخرج شيء من هذا الهاتف',
    privacyBody:
      'إحسانلي بلا حساب ولا خادم ولا تحليلات. يُستعمل موقعك على الجهاز لحساب أوقات الصلاة ويُخزَّن هنا فقط. وسجل ممارستك يُخزَّن هنا فقط. لا يُرسل شيء إلى أي مكان إلا إن صدّرته أو شاركته أنت. «تبرَّع» هو الرابط الوحيد الخارج من التطبيق: يفتح متصفحك، وتلك الصفحة ليست جزءًا من إحسانلي.',
    licences: 'بُني بـ',
    licencesBody:
      'Expo وReact Native، ومكتبة adhan لأوقات الصلاة، وجداول تقويم أم القرى، وبيانات المدن من city-timezones، وNatural Earth للخريطة. كلٌّ برخصته المفتوحة، مذكورة في مستودع المصدر.',
  },
  moonSighting: {
    title: 'رؤية الهلال',
    explanation:
      'التواريخ في هذا التطبيق محسوبة. تختلف المجتمعات بين اتباع الحساب والرؤية المحلية، وكثيرًا ما يتفاوت الاثنان بيوم. اتبع من يتبعه مجتمعك، وعدّل التاريخ في الإعدادات ليوافقهم التطبيق.',
    disclaimer: 'هذه مذكورة لتجد جهتك بينها. التطبيق لا يتبنّى أيًّا منها.',
  },
  tracking: {
    title: 'التتبع',
    active: '\u0645\u0641\u0639\u0651\u0644',
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
    filterAll: 'الكل',
    filterOnToday: 'في «اليوم»',
    filterKnown: 'محفوظ',
    onToday: 'في «اليوم»',
    known: 'محفوظ',
    emptyOnToday: 'لا شيء في «اليوم» بعد. افتح أي عنصر وفعّله.',
    emptyKnown: 'لم تحدد شيئًا كمحفوظ بعد. تدرّب على عنصر ثم قل إنك حفظته.',
    terms: 'معاني الكلمات',
    termsDetail: 'السنة والرواتب والأذكار والقضاء وغيرها، في جملة لكل منها.',
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
    done: 'تم',
    doneToday: 'أُنجز اليوم',
    undo: 'تراجع',
    counterReset: 'ابدأ من جديد',
    yourDay: 'يومك',
    onToday: 'في «اليوم»',
    onTodayDetail: 'يظهر حين يأتي وقته',
    remind: 'ذكّرني',
    remindWindow: 'عند دخول وقته',
    remindLookAhead: 'في المساء السابق',
    share: 'مشاركة',
    shareText: 'مشاركة كنص',
    shareImage: 'مشاركة كصورة',
    sharedFrom: 'من تطبيق إحسانلي',
    transliteration: 'النقل الصوتي',
    translation: 'الترجمة',
    why: 'لماذا',
    how: 'كيف',
    unreviewed: 'بانتظار المراجعة',
    evidence: 'الدليل',
    note: 'اختلف العلماء',
    repeat: (times: number): string => `كرِّر ${count(times, 'مرة واحدة', 'مرتين', 'مرات', 'مرة')}`,
    gradedBy: (grader: string): string => `حكم عليه ${grader}`,
    quranReference: (surah: number, ayah: number): string => `القرآن ${surah}:${ayah}`,
  },
  glossary: {
    title: 'الكلمات',
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
    search: 'ابحث في الإعدادات',
    prayer: 'الصلاة',
    app: 'التطبيق',
    practice: 'ممارستك',
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
    genderStep: 'إيقاف التتبع',
    genderWhy:
      'في بعض الأيام ينبغي أن يتوقف تتبع الصلاة دون أن يتراكم قضاء. هذا يحدد إن كان التطبيق يعرض ذلك.',
    brother: 'أخ',
    brotherDetail: 'لا يُعرض الإيقاف',
    sister: 'أخت',
    sisterDetail: 'يُعرض الإيقاف',
    skip: 'أفضّل عدم الإجابة',
    skipDetail: 'يُعرض الإيقاف على أي حال.',
    genderPrivacy: 'يُحفظ على هذا الجهاز. لا يُرسل إلى أي مكان ولا يُستخدم لغير ذلك.',
    remindersStep: 'التنبيهات',
    remindersWhy:
      'اثنان أو ثلاثة في اليوم، ولا شيء في الليل. يمكنك تغيير أي من هذا لاحقًا من «المزيد».',
    windowsDetail: 'عند بداية كل وقت',
    lookAheadDetail: 'في المساء السابق',
    startStep: 'نقطة بداية',
    startWhy: 'اختر حجمًا تبدأ به. أضِف أو أزِل ما تشاء من المكتبة في أي وقت.',
    starting: 'بداية فقط',
    startingDetail: (n: number): string =>
      `${count(n, 'شيء واحد', 'شيئان', 'أشياء', 'شيئًا')} تحملها من أول يوم: وقتان، وذكر، ودعاءان. لمن هذا كله جديد عليه.`,
    essentials: 'الأساسيات',
    essentialsDetail: (n: number): string =>
      `${count(n, 'عنصر واحد', 'عنصران', 'عناصر', 'عنصرًا')}، يوم معقول لا كامل. لمن يصلي ويريد السنن حول صلاته.`,
    everything: 'الكل',
    everythingDetail: (n: number): string =>
      `جميع العناصر، ${count(n, 'عنصر', 'عنصران', 'عناصر', 'عنصرًا')}. لمن يعرف المحتوى ويريد التقويم كله.`,
    skipIntro: 'تخطّي',
    skipLocation: 'تخطّي الآن',
    reminderPolicy: (perDay: number, from: number, to: number): string =>
      `${count(perDay, 'تنبيه واحد', 'تنبيهان', 'تنبيهات', 'تنبيهًا')} في اليوم على الأكثر، ولا شيء بين ${from}:00 و${to}:00.`,
    reminderCap: (perDay: number): string =>
      `${count(perDay, 'تنبيه واحد', 'تنبيهان', 'تنبيهات', 'تنبيهًا')} في اليوم على الأكثر.`,
    included: 'المتضمَّن',
    andMore: (n: number): string =>
      `و${count(n, 'عنصر آخر', 'عنصران آخران', 'عناصر أخرى', 'عنصرًا آخر')}`,
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
    useDeviceDetail: 'لا يخرج شيء من هذا الهاتف.',
    locating: 'جارٍ تحديد موقعك…',
    orSearch: 'أو ابحث عن مدينة',
    follows: 'ستتبع أوقات الصلاة هذا المكان.',
    search: 'ابحث عن مدينة',
    noResults: 'لا مدن تطابق ذلك.',
    unavailable: 'خدمات الموقع معطّلة على هذا الجهاز. فعّلها، أو ابحث عن مدينتك بدلًا من ذلك.',
    declined: 'رُفض الوصول إلى الموقع. ابحث عن مدينتك بدلًا من ذلك — كل شيء يعمل كما هو.',
    explanation: 'يُستخدم على هذا الجهاز لتحديد أوقات الصلاة. لا يُرسل إلى أي مكان.',
    attribution: 'بيانات المدن من city-timezones (MIT).',
  },
  textField: {
    clear: 'مسح',
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
