import type { Strings } from './en'

/**
 * Italian interface copy. A draft written in one pass and awaiting review by
 * a qualified speaker; the review is a release condition. Content text
 * (adhkar, duas, evidence) lives in content/translations/it.json.
 */

/** Italian counts: the singular for exactly one, the plural otherwise. */
function count(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}

export const it: Strings = {
  tabs: {
    today: 'Oggi',
    library: 'Biblioteca',
    more: 'Altro',
  },
  today: {
    title: 'Oggi',
    nothingElse: 'Oggi non ti è chiesto nient’altro.',
    empty: 'Ancora niente qui.',
    needsLocationTitle: 'Dove ti trovi?',
    needsLocation:
      'Le fasce di preghiera, la data dell’Egira e tutto ciò che la giornata ti chiede dipendono da una posizione approssimativa. Viene calcolata su questo telefono e non viene mai inviata altrove.',
    chooseCity: 'Scegli invece una città',
    chooseCityDetail: 'Nessun permesso necessario. Tutto funziona lo stesso.',
  },
  plan: {
    rightNow: 'Adesso',
    tryOneMore: 'Provane un’altra',
    add: 'Aggiungi',
    notNow: 'Non ora',
    alsoNow: 'Anche adesso',
    upNext: 'Poi',
    before: 'Prima',
    after: 'Dopo',
    soon: 'Tra poco',
    inAboutAnHour: 'Tra circa un’ora',
    inAboutHours: (hours: number): string => `Tra circa ${hours} ore`,
    context: 'Dove ti trovi',
    comingUp: 'Più avanti in settimana',
    alsoToday: 'Anche oggi',
    tomorrow: 'Domani',
    inDays: (days: number): string => `Tra ${days} giorni`,
    prayers: 'Preghiere',
    optional: 'Facoltativo',
    expected: 'Previsto',
    confirmLocally: 'Verifica con la tua autorità locale',
    prayed: 'Pregata',
    makeUp: 'Da recuperare',
    outstanding: (n: number): string => `${n} da recuperare`,
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
    sunrise: 'Mattino',
    dhuhr: 'Dopo Dhuhr',
    asr: 'Sera',
    maghrib: 'Dopo Maghrib',
    isha: 'Notte',
  },
  notifications: {
    title: 'Promemoria',
    windows: 'Adhkar del mattino e della sera',
    lookAhead: 'Prossimi giorni di digiuno',
    prayers: 'Promemoria delle preghiere',
    prayersDetail: 'Disattivati di default: la tua app per l’adhan lo fa già.',
    quietHours: 'Ore di silenzio',
    quietHoursDetail: (from: number, to: number): string => `Dalle ${from}:00 alle ${to}:00`,
    quietHoursOff: 'Disattivate',
    perDay: 'Limite giornaliero',
    permission: 'Permesso',
    permissionGranted: 'Consentito',
    permissionDenied: 'Disattivato nelle impostazioni di sistema',
    permissionUndetermined: 'Non ancora richiesto',
    permissionUnavailable: 'Non disponibile su questo dispositivo',
    openSettings: 'Apri le impostazioni di sistema',
    whichItems: 'Quali voci',
    whichItemsDetail: 'Qui compaiono solo le voci che hanno un momento per cui ricordartele.',
    sendTest: 'Invia un promemoria di prova',
    sendTestDetail: 'Arriva tra pochi secondi.',
    testTitle: 'Un promemoria di prova',
    testBody: 'Ecco come appare un promemoria di Ihsaanly.',
    action: {
      done: 'Fatto',
      later: 'Più tardi',
    },
    body: {
      window: 'Adesso, finché la fascia non si chiude.',
      windowUntil: (closes: string): string => `Aperta fino alle ${closes}.`,
      tomorrow: 'Domani.',
      prayerWindow: 'È entrato il tempo. La fascia resta aperta fino alla preghiera successiva.',
    },
  },
  event: {
    ascending: 'Salendo',
    descending: 'Scendendo',
    driving: 'Alla guida',
    travel: 'In viaggio',
    'leaving-home': 'Uscendo di casa',
    'entering-home': 'Rientrando a casa',
  },
  events: {
    title: 'Dove ti trovi',
    explanation:
      'La maggior parte di questi momenti un telefono non può rilevarli affatto: un ascensore, una collina, una scala. Le loro du’a sono a un tocco di distanza nella Biblioteca e nel widget.',
    detectHome: 'Accorgiti quando esco di casa',
    detectHomeDetail:
      'Approssimativo. Il telefono se ne accorge a un centinaio di metri dalla porta e fino a un minuto dopo, quindi consideralo un promemoria più che il momento esatto.',
    setHome: 'Imposta casa nel luogo in cui mi trovo',
    homeUnset: 'Non impostata',
    homeNeeded: 'Non si sta ancora osservando nulla: imposta casa qui sotto.',
    noPlaceYet: 'Prima imposta dove ti trovi',
    manual: 'Dillo tu all’app',
    manualDetail: 'Segnala tu una situazione quando nessun sensore può rilevarla.',
  },
  qada: {
    title: 'Da recuperare',
    intro:
      'Le preghiere dovute da prima che iniziassi a registrare, e quelle dovute da allora. Un conteggio, mai un elenco. Il conteggio parte dalla prima preghiera che segni.',
    owed: 'Dovute da prima',
    madeUp: 'Recuperate ora',
    record: (n: number): string => (n === 1 ? 'Registrane una' : `Registrane ${n}`),
    outstanding: (n: number): string => `${n} ${count(n, 'dovuta', 'dovute')}`,
    none: 'Niente di dovuto',
    summary: (n: number): string => `${n} ${count(n, 'preghiera dovuta', 'preghiere dovute')}`,
    manage: 'Modifica ciò che devi',
    manageDetail: 'Imposta ciò che porti con te e registra i recuperi in un colpo solo.',
  },
  fasting: {
    title: 'Digiuni',
    intro:
      'I giorni di Ramadan in cui non hai digiunato, e quelli dovuti da prima. Un conteggio, mai un elenco.',
    notFastingToday: 'Oggi non digiuno',
    notFastingTodayDetail: 'Aggiunge un digiuno da recuperare più avanti.',
    recordedToday: 'Annotato: oggi non digiuni',
    undo: 'Tocca per annullare',
    summary: (n: number): string =>
      `${n} ${count(n, 'digiuno da recuperare', 'digiuni da recuperare')}`,
    outstanding: (n: number): string => `${n} ${count(n, 'dovuto', 'dovuti')}`,
    none: 'Niente di dovuto',
    owed: 'Dovuti da prima',
    recordMadeUp: 'Registrane uno recuperato',
  },
  history: {
    title: 'Cronologia',
    empty: 'Ancora niente di registrato.',
    firstWeek:
      'Ogni giorno in cui segni una preghiera o completi una voce viene conservato qui. Dopo una settimana vedrai quali preghiere tendi a pregare presto e quali voci mantieni.',
    daysActive: (days: number): string =>
      `${days} ${count(days, 'giorno registrato', 'giorni registrati')}`,
    prayers: 'Preghiere',
    completed: 'Completate',
    times: (n: number): string => `${n} ${count(n, 'volta', 'volte')}`,
    early: (minutes: number): string => `di solito circa ${minutes} min dopo l’inizio della fascia`,
    late: (minutes: number): string => `di solito circa ${minutes} min prima che si chiuda`,
  },
  data: {
    title: 'I tuoi dati',
    explanation:
      'Tutto ciò che è qui resta su questo dispositivo. Niente ne esce, a meno che non lo invii tu stesso da questa schermata.',
    export: 'Esporta i miei dati',
    exportDetail: 'Testo leggibile che puoi conservare o portare su un altro dispositivo.',
    importing: 'Importa da un file',
    importDetail:
      'Unisce invece di sostituire. Importare due volte lo stesso file non cambia nulla.',
    diagnostics: 'Invia un rapporto diagnostico',
    diagnosticsDetail:
      'Per risolvere un problema. Contiene le tue impostazioni, il registro della tua pratica, le tue coordinate approssimative e gli errori recenti. Lo vedrai prima che venga inviato.',
    imported: (n: number): string =>
      `${count(n, 'Aggiunta', 'Aggiunte')} ${n} ${count(n, 'voce', 'voci')}.`,
    importFailed: 'Impossibile leggere quel file.',
    shareFailed: 'La condivisione non è disponibile su questo dispositivo.',
    delete: 'Elimina i miei dati',
    deleteDetail:
      'Tutto ciò che è su questo dispositivo: le impostazioni e il registro della tua pratica. L’app ricomincia da capo.',
    deleteConfirmTitle: 'Eliminare tutto?',
    deleteConfirmBody:
      'Le tue impostazioni e il registro della tua pratica vengono rimossi da questo dispositivo. Non ne esiste copia altrove, a meno che tu non l’abbia esportata.',
    deleteConfirm: 'Elimina',
    cancel: 'Annulla',
  },
  diagnostics: {
    title: 'Rapporto diagnostico',
    explanation:
      'Ecco cosa contiene il rapporto. Non viene inviato nulla finché non scegli di inviarlo, e sei tu a scegliere dove.',
    version: 'Versione dell’app',
    device: 'Dispositivo',
    coordinates: 'Coordinate approssimative',
    noCoordinates: 'Nessuna memorizzata',
    records: 'Registri della pratica',
    settings: 'Impostazioni memorizzate',
    failures: 'Errori registrati',
    failuresDetail: (n: number): string =>
      `${n} ${count(n, 'gestito', 'gestiti')} dall’app senza avvisarti`,
    reminders: 'Promemoria',
    remindersDetail: (permission: string, pending: number): string =>
      `${permission} · ${pending} in coda`,
    error: 'Errore recente',
    errorIncluded: 'Ne è incluso uno',
    showRaw: 'Mostra il rapporto completo',
    hideRaw: 'Nascondi il rapporto completo',
    send: 'Invialo',
    cancel: 'Non ora',
  },
  about: {
    title: 'Informazioni',
    version: 'Versione',
    content: 'Contenuti',
    contentUnreviewed: (n: number): string =>
      `${n} ${count(n, 'voce, redatta', 'voci, redatte')} e in attesa di revisione da parte di un sapiente indicato per nome.`,
    contentReviewedBy: (name: string, n: number): string =>
      `${n} ${count(n, 'voce, rivista', 'voci, riviste')} da ${name}.`,
    donate: 'Fai una donazione',
    donateBody:
      'Facoltativa, e non sblocca nulla. Ogni parte dell’app è gratuita e resta gratuita. Si apre nel browser.',
    privacyPolicy: 'Informativa sulla privacy',
    privacyTitle: 'Niente esce da questo telefono',
    privacyBody:
      'Ihsaanly non ha account, server né analisi. La tua posizione viene usata sul dispositivo per calcolare gli orari di preghiera ed è conservata solo qui. Il registro della tua pratica è conservato solo qui. Nulla viene inviato altrove, a meno che non lo esporti o lo condivida tu stesso. La donazione è l’unico collegamento che esce dall’app: apre il browser, e quella pagina non fa parte di Ihsaanly.',
    licences: 'Realizzata con',
    licencesBody:
      'Expo e React Native, la libreria adhan per gli orari di preghiera, le tabelle del calendario Umm al-Qura, i dati delle città da city-timezones e Natural Earth per la mappa. Ognuno è usato secondo la propria licenza open source, elencata nel repository del codice.',
  },
  memorise: {
    title: 'Imparalo',
    start: 'Esercitati',
    hide: 'Nascondine un’altra',
    known: 'Lo so',
    knownDetail: 'Resta nella Biblioteca. Smette di comparire nei promemoria.',
    notKnown: 'Lo sto ancora imparando',
    noAudio: 'Per questa non c’è ancora una recitazione.',
    play: 'Riproduci',
    stop: 'Ferma',
    loop: 'Ripeti',
  },
  language: {
    title: 'Lingua',
    restart:
      'L’arabo si legge da destra a sinistra. Passare all’arabo o tornare indietro riavvia l’app, oppure ti chiede di riaprirla.',
    incomplete:
      'L’inglese è l’originale. Ogni altra lingua è una bozza ancora in attesa di revisione da parte di un madrelingua qualificato.',
    reopenTitle: 'Riapri Ihsaanly',
    reopenBody:
      'Questa lingua si legge da destra a sinistra. Chiudi Ihsaanly e riaprilo per completare il cambio.',
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
    title: 'Aspetto',
    system: 'Sistema',
    light: 'Chiaro',
    dark: 'Scuro',
    note: 'I colori vengono comunque dal sistema, quindi le sue impostazioni di contrasto valgono in ogni caso.',
  },
  moonSighting: {
    title: 'Avvistamento della luna',
    explanation:
      'Le date in questa app sono calcolate. Le comunità si dividono tra chi segue il calcolo e chi l’avvistamento locale, e spesso i due differiscono di un giorno. Segui ciò che segue la tua comunità, e regola la data nelle impostazioni perché l’app concordi con essa.',
    disclaimer: 'Sono elencate perché tu possa trovare la tua. Questa app non ne sostiene nessuna.',
  },
  tracking: {
    title: 'Registrazione',
    active: 'Attiva',
    travelling: 'In viaggio',
    travellingDetail:
      'Viene proposto di accorciare le preghiere, le sunna regolari si mettono da parte e il digiuno viene proposto invece che atteso.',
    paused: 'Sospendi la registrazione delle preghiere',
    pausedDetail:
      'Le preghiere non vengono registrate e non si accumula nulla da recuperare. Resta sospesa finché non la riattivi.',
  },
  hijri: {
    title: 'Data dell’Egira',
    offset: 'Regola la data',
    approximate: 'Calcolata: verifica con l’autorità che segue la tua comunità.',
    explanation:
      'Un calendario calcolato e l’avvistamento locale della luna spesso differiscono di uno o due giorni. Sposta qui la data perché l’app concordi con la tua comunità. Le date dei giorni di digiuno sono sempre indicate come previste, mai come certe.',
    offsetLabel: (days: number): string =>
      days === 0
        ? 'Nessuna modifica'
        : `${days > 0 ? '+' : ''}${days} ${count(Math.abs(days), 'giorno', 'giorni')}`,
    format: (day: number, month: string, year: number): string => `${day} ${month} ${year}`,
  },
  hijriMonth: {
    1: 'Muharram',
    2: 'Safar',
    3: 'Rabi’ al-Awwal',
    4: 'Rabi’ al-Thani',
    5: 'Jumada al-Ula',
    6: 'Jumada al-Akhira',
    7: 'Rajab',
    8: 'Sha’ban',
    9: 'Ramadan',
    10: 'Shawwal',
    11: 'Dhu al-Qa’da',
    12: 'Dhu al-Hijja',
  },
  calculation: {
    title: 'Calcolo delle preghiere',
    method: 'Metodo',
    asr: 'Asr',
    highLatitude: 'Latitudini elevate',
    selected: 'Selezionato',
    explanation:
      'Gli orari di preghiera sono calcolati su questo dispositivo e non vengono mai mostrati come orari: decidono soltanto in quale parte della giornata ti trovi.',
    highLatitudeExplanation:
      'Oltre circa 48° nord, per una parte dell’anno Isha non si verifica. Qui si decide cosa usare al suo posto.',
  },
  asr: {
    shafi: 'Standard',
    hanafi: 'Hanafita',
  },
  highLatitude: {
    middleofthenight: 'Metà della notte',
    seventhofthenight: 'Settimo della notte',
    twilightangle: 'Angolo del crepuscolo',
  },
  method: {
    MuslimWorldLeague: 'Lega Musulmana Mondiale',
    Egyptian: 'Autorità Generale Egiziana',
    Karachi: 'Università di Scienze Islamiche, Karachi',
    UmmAlQura: 'Umm al-Qura, La Mecca',
    Dubai: 'Dubai',
    MoonsightingCommittee: 'Moonsighting Committee',
    NorthAmerica: 'ISNA, Nord America',
    Kuwait: 'Kuwait',
    Qatar: 'Qatar',
    Singapore: 'Singapore',
    Tehran: 'Teheran',
    Turkey: 'Turchia',
  },
  library: {
    title: 'Biblioteca',
    empty: 'Qui saranno elencati adhkar, du’a e pratiche della sunna.',
    search: 'Cerca per nome o situazione',
    noResults: 'Nessun risultato.',
    filterAll: 'Tutte',
    filterOnToday: 'In Oggi',
    filterKnown: 'Conosciute',
    onToday: 'In Oggi',
    known: 'Conosciuta',
    emptyOnToday: 'Non c’è ancora nulla in Oggi. Apri una voce qualsiasi e attivala.',
    emptyKnown:
      'Nessuna voce segnata come conosciuta. Esercitati su una voce e dillo quando l’hai imparata.',
    terms: 'Glossario',
    termsDetail: 'Sunna, rawatib, adhkar, qada e il resto, una frase ciascuno.',
  },
  category: {
    adhkar: 'Adhkar',
    dhikr: 'Dopo la preghiera',
    fasting: 'Digiuno',
    food: 'Mangiare',
    home: 'Casa',
    masjid: 'Moschea',
    prayer: 'Preghiera',
    sleep: 'Sonno e risveglio',
    travel: 'Viaggio',
  },
  item: {
    done: 'Fatto',
    doneToday: 'Fatto oggi',
    undo: 'Annulla',
    counterReset: 'Ricomincia',
    yourDay: 'La tua giornata',
    onToday: 'In Oggi',
    onTodayDetail: 'Compare quando arriva il suo momento',
    remind: 'Ricordamelo',
    remindWindow: 'Quando si apre la sua fascia',
    remindLookAhead: 'La sera prima',
    share: 'Condividi',
    shareText: 'Condividi come testo',
    shareImage: 'Condividi come immagine',
    sharedFrom: 'Condiviso da Ihsaanly',
    transliteration: 'Traslitterazione',
    translation: 'Traduzione',
    why: 'Perché',
    how: 'Come',
    unreviewed: 'In attesa di revisione',
    evidence: 'Fonti',
    note: 'I sapienti hanno opinioni diverse',
    repeat: (times: number): string => `Ripeti ${times} ${count(times, 'volta', 'volte')}`,
    parts: 'Cosa dire',
    partRepeat: (times: number): string => `${times} ${count(times, 'volta', 'volte')}`,
    gradedBy: (grader: string): string => `classificato da ${grader}`,
    quranReference: (surah: number, ayah: number): string => `Corano ${surah}:${ayah}`,
  },
  glossary: {
    title: 'Cosa significano le parole',
  },
  ruling: {
    fard: 'Obbligatorio',
    wajib: 'Obbligatorio',
    'sunnah-muakkadah': 'Sunna rafforzata',
    sunnah: 'Sunna',
    mustahabb: 'Raccomandato',
    mubah: 'Lecito',
  },
  grading: {
    sahih: 'Sahih',
    hasan: 'Hasan',
    "da'if": 'Da’if',
    disputed: 'Controverso',
  },
  more: {
    title: 'Altro',
    search: 'Cerca nelle impostazioni',
    prayer: 'Preghiera',
    app: 'App',
    practice: 'La tua pratica',
    empty: 'Qui troveranno posto cronologia, impostazioni e aiuto.',
  },
  onboarding: {
    welcomeTitle: 'Il momento, non l’orologio.',
    welcomeBody:
      'Ihsaanly ti dice quando è il momento degli adhkar della sera. Mai un orario. Mai un punteggio.',
    howTitle: 'Tu segni la preghiera. La sunna compare.',
    howBody:
      'Tocca Dhuhr quando l’hai pregata e il dhikr che la segue ti sta aspettando. Niente esce da questo telefono. Nessun account, nessun server.',
    language: 'Lingua',
    appearance: 'Aspetto',
    howSample: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
    locationStep: 'Dove ti trovi?',
    locationWhy:
      'Usata su questo dispositivo per calcolare le parti della giornata. Mai inviata altrove.',
    genderStep: 'La sospensione della registrazione',
    genderWhy:
      'In alcuni giorni la registrazione delle preghiere dovrebbe fermarsi, senza che si accumuli nulla da recuperare. Questo dice all’app se proportela.',
    brother: 'Fratello',
    brotherDetail: 'Nessuna sospensione',
    sister: 'Sorella',
    sisterDetail: 'Sospensione proposta',
    skip: 'Preferisco non dirlo',
    skipDetail: 'La sospensione viene proposta comunque.',
    genderPrivacy:
      'Conservato su questo dispositivo. Mai inviato altrove, e non usato per nient’altro.',
    remindersStep: 'Promemoria',
    remindersWhy: 'Due o tre al giorno, mai di notte. Puoi cambiare tutto più avanti in Altro.',
    windowsDetail: 'Quando si apre ogni fascia',
    lookAheadDetail: 'La sera prima',
    startStep: 'Un punto di partenza',
    startWhy:
      'Scegli con quanto cominciare. Aggiungi o togli qualsiasi cosa nella Biblioteca quando vuoi.',
    starting: 'Agli inizi',
    startingDetail: (n: number): string =>
      `${n} ${count(n, 'cosa', 'cose')} che puoi portare con te dal primo giorno: due fasce, un dhikr, due du’a. Per chi è nuovo a tutto questo.`,
    essentials: 'L’essenziale',
    essentialsDetail: (n: number): string =>
      `${n} ${count(n, 'voce', 'voci')}, una giornata ragionevole più che completa. Per chi prega già e vuole la sunna che le sta intorno.`,
    everything: 'Tutto',
    everythingDetail: (n: number): string =>
      `Tutte le ${n} voci. Per chi conosce i contenuti e vuole l’intero calendario.`,
    skipIntro: 'Salta',
    skipLocation: 'Salta per ora',
    reminderPolicy: (perDay: number, from: number, to: number): string =>
      `Al massimo ${perDay} al giorno, e niente tra le ${from}:00 e le ${to}:00.`,
    reminderCap: (perDay: number): string => `Al massimo ${perDay} al giorno.`,
    included: 'Incluse',
    andMore: (n: number): string => `e ${count(n, 'un’altra', `altre ${n}`)}`,
    back: 'Indietro',
    continue: 'Continua',
    allowReminders: 'Consenti i promemoria',
    notNow: 'Non ora',
    done: 'Inizia',
  },
  location: {
    title: 'Posizione',
    notSet: 'Non impostata',
    currentLocation: 'Posizione attuale',
    useDevice: 'Usa la mia posizione',
    useDeviceDetail: 'Niente esce da questo telefono.',
    locating: 'Ti sto localizzando…',
    orSearch: 'oppure cerca una città',
    follows: 'Le fasce di preghiera seguiranno questo luogo.',
    search: 'Cerca una città',
    noResults: 'Nessuna città corrisponde.',
    unavailable:
      'I servizi di localizzazione sono disattivati su questo dispositivo. Attivali, oppure cerca la tua città.',
    declined:
      'L’accesso alla posizione è stato negato. Cerca invece la tua città: tutto funziona lo stesso.',
    explanation:
      'Usata su questo dispositivo per calcolare le fasce di preghiera. Non viene mai inviata altrove.',
    attribution: 'Dati delle città da city-timezones (MIT).',
  },
  textField: {
    clear: 'Cancella',
  },
  error: {
    title: 'Qualcosa è andato storto',
    retry: 'Riprova',
  },
  notFound: {
    title: 'Non trovato',
    body: 'Questa schermata non esiste.',
  },
  widgets: {
    quickDuas: "Du'a rapide",
    duaOfTheDay: "Du'a del giorno",
    nothingNow: 'Niente da fare in questo momento',
    openApp: 'Apri Ihsaanly per aggiornare',
  },
}
