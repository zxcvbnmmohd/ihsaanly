import type { Strings } from './en'

/**
 * French interface copy, addressed as "vous". A draft awaiting review by a
 * qualified speaker; the review is a release condition, not a nicety. Content
 * text (adhkar, duas, evidence) lives in content/translations/fr.json.
 */

/** French agreement: 0 and 1 take the singular, 2 and up the plural. */
function plural(n: number, one: string, many: string): string {
  return n <= 1 ? one : many
}

export const fr: Strings = {
  tabs: {
    today: 'Aujourd’hui',
    library: 'Bibliothèque',
    more: 'Plus',
  },
  today: {
    title: 'Aujourd’hui',
    nothingElse: 'Rien d’autre ne vous est demandé aujourd’hui.',
    empty: 'Rien ici pour l’instant.',
    needsLocationTitle: 'Où êtes-vous ?',
    needsLocation:
      'Les plages de prière, la date hégirienne et tout ce que la journée vous demande découlent d’une position approximative. Elle est calculée sur cet appareil et y reste, sauf si vous vous connectez pour synchroniser.',
    chooseCity: 'Choisir plutôt une ville',
    chooseCityDetail: 'Aucune autorisation nécessaire. Tout fonctionne quand même.',
    prayerHint: 'Touchez une prière lorsque vous l’avez priée',
    markDone: (name: string): string => `Marquer ${name} comme fait`,
    unmark: (name: string): string => `Retirer la marque de ${name}`,
    countItem: (name: string, count: number, target: number): string =>
      `Compter ${name}, ${count} sur ${target}`,
    partsItem: (name: string, done: number, total: number): string =>
      `Parties de ${name}, ${done} sur ${total} faites`,
    open: (name: string): string => `Ouvrir ${name}`,
    doneToday: (count: number): string => `Fait aujourd’hui (${count})`,
    markedDone: 'Marqué comme fait',
    undo: 'Annuler',
    undoItem: (name: string): string => `Annuler ${name}`,
    paused: 'Le suivi des prières est suspendu',
    pausedFasting: 'Le jeûne reprend après votre pause',
    checkInTitle: 'Prêt à reprendre le suivi des prières ?',
    resume: 'Reprendre',
    notYet: 'Pas encore',
  },
  tour: {
    prayer: 'Touchez un cercle pour marquer une prière',
    sunnah: 'Touchez le cercle à côté d’une sunna lorsque vous l’avez faite',
    card: 'Touchez la carte pour l’apprendre : les mots, le sens et la source',
    step: (step: number, total: number): string => `${step} sur ${total}`,
    skip: 'Passer',
    next: 'Suivant',
    done: 'Compris',
  },
  plan: {
    rightNow: 'En ce moment',
    tryOneMore: 'Essayez-en un de plus',
    add: 'Ajouter',
    notNow: 'Pas maintenant',
    alsoNow: 'Aussi en ce moment',
    upNext: 'Ensuite',
    before: 'Avant',
    after: 'Après',
    soon: 'Bientôt',
    inAboutAnHour: 'Dans une heure environ',
    inAboutHours: (hours: number): string => `Dans ${hours} heures environ`,
    context: 'Là où vous êtes',
    comingUp: 'Plus tard cette semaine',
    alsoToday: 'Aussi aujourd’hui',
    tomorrow: 'Demain',
    inDays: (days: number): string => `Dans ${days} jours`,
    prayers: 'Prières',
    optional: 'Facultatif',
    expected: 'Prévu',
    confirmLocally: 'À confirmer auprès de votre autorité locale',
    prayed: 'Priée',
    makeUp: 'À rattraper',
    outstanding: (count: number): string => `${count} à rattraper`,
  },
  prayer: {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
    jumuah: 'Joumou’a',
  },
  window: {
    fajr: 'Fajr',
    sunrise: 'Matin',
    dhuhr: 'Après Dhuhr',
    asr: 'Soir',
    maghrib: 'Après Maghrib',
    isha: 'Nuit',
    jumuah: 'Après la Joumou’a',
  },
  notifications: {
    title: 'Rappels',
    windows: 'Adhkar du matin et du soir',
    lookAhead: 'Jours de jeûne à venir',
    prayers: 'Rappels de prière',
    prayersDetail: 'Désactivé par défaut : votre application d’adhan s’en charge déjà.',
    quietHours: 'Heures calmes',
    quietHoursDetail: (from: number, to: number): string => `De ${from} h à ${to} h`,
    quietHoursOff: 'Désactivées',
    perDay: 'Limite quotidienne',
    permission: 'Autorisation',
    permissionGranted: 'Autorisés',
    permissionDenied: 'Désactivés dans les réglages du système',
    permissionUndetermined: 'Pas encore demandée',
    permissionUnavailable: 'Non disponible sur cet appareil',
    openSettings: 'Ouvrir les réglages du système',
    whichItems: 'Quels éléments',
    whichItemsDetail: 'Seuls les éléments liés à un moment précis apparaissent ici.',
    sendTest: 'Envoyer un rappel test',
    sendTestDetail: 'Arrive dans quelques secondes.',
    announcements: 'Annonces',
    announcementsDetail:
      'Des messages occasionnels d’Ihsaanly, comme le début du Ramadan. Vos rappels quotidiens n’en ont pas besoin.',
    testTitle: 'Un rappel test',
    testBody: 'Voici à quoi ressemble un rappel d’Ihsaanly.',
    pausedRemembrance: 'Un moment pour le dhikr',
    checkIn: 'Un petit mot d’Ihsaanly',
    action: {
      done: 'Fait',
      later: 'Plus tard',
    },
    body: {
      window: 'Maintenant, jusqu’à la fin de la plage.',
      windowUntil: (closes: string): string => `Ouvert jusqu’à ${closes}.`,
      tomorrow: 'Demain.',
      prayerWindow: 'L’heure est entrée. La plage reste ouverte jusqu’à la prière suivante.',
    },
  },
  event: {
    ascending: 'En montant',
    descending: 'En descendant',
    driving: 'En voiture',
    travel: 'En voyage',
    'leaving-home': 'En sortant de chez soi',
    'entering-home': 'En rentrant chez soi',
  },
  events: {
    title: 'Là où vous êtes',
    explanation:
      'La plupart de ces moments ne peuvent pas du tout être détectés par un téléphone : un ascenseur, une colline, un escalier. Leurs du’as sont à portée d’un geste dans la Bibliothèque et sur le widget.',
    detectHome: 'Me prévenir quand je quitte la maison',
    detectHomeDetail:
      'Approximatif. Le téléphone le remarque à une centaine de mètres de la porte et jusqu’à une minute plus tard : voyez-le comme un petit rappel plutôt que comme le moment exact.',
    setHome: 'Définir ma position actuelle comme domicile',
    homeUnset: 'Non défini',
    homeNeeded: 'Rien n’est encore surveillé : définissez votre domicile ci-dessous.',
    noPlaceYet: 'Indiquez d’abord où vous êtes',
    manual: 'Le signaler vous-même',
    manualDetail: 'Indiquez vous-même une situation qu’aucun capteur ne peut détecter.',
  },
  qada: {
    title: 'À rattraper',
    intro:
      'Les prières dues d’avant le début de votre suivi, et celles dues depuis. Un compte, jamais une liste. Le compte commence à la première prière que vous marquez.',
    owed: 'Dues d’avant',
    madeUp: 'Rattrapées maintenant',
    record: (count: number): string =>
      count === 1 ? 'En enregistrer une' : `En enregistrer ${count}`,
    outstanding: (count: number): string => `${count} ${plural(count, 'due', 'dues')}`,
    none: 'Rien à rattraper',
    summary: (count: number): string => `${count} ${plural(count, 'prière due', 'prières dues')}`,
    manage: 'Ajuster ce que vous devez',
    manageDetail: 'Indiquez ce que vous reportez et enregistrez vos rattrapages en une seule fois.',
  },
  fasting: {
    title: 'Jeûnes',
    intro:
      'Les jours de Ramadan que vous n’avez pas jeûnés, et ceux dus d’avant. Un compte, jamais une liste.',
    notFastingToday: 'Je ne jeûne pas aujourd’hui',
    notFastingTodayDetail: 'Ajoute un jeûne à rattraper plus tard.',
    recordedToday: 'Noté : pas de jeûne aujourd’hui',
    undo: 'Touchez pour annuler',
    summary: (count: number): string =>
      `${count} ${plural(count, 'jeûne à rattraper', 'jeûnes à rattraper')}`,
    outstanding: (count: number): string => `${count} ${plural(count, 'dû', 'dus')}`,
    none: 'Rien à rattraper',
    owed: 'Dus d’avant',
    recordMadeUp: 'Enregistrer un jeûne rattrapé',
  },
  history: {
    title: 'Historique',
    empty: 'Rien d’enregistré pour l’instant.',
    firstWeek:
      'Chaque jour où vous marquez une prière ou terminez un élément est conservé ici. Au bout d’une semaine, vous verrez quelles prières vous avez tendance à prier tôt et quels éléments vous gardez.',
    daysActive: (days: number): string =>
      `${days} ${plural(days, 'jour enregistré', 'jours enregistrés')}`,
    prayers: 'Prières',
    completed: 'Accomplis',
    times: (count: number): string => `${count} fois`,
    early: (minutes: number): string =>
      `en général environ ${minutes} min après le début de la plage`,
    late: (minutes: number): string => `en général environ ${minutes} min avant la fin de la plage`,
  },
  account: {
    title: 'Compte',
    notSignedIn: 'Non connecté',
    explanation:
      'Facultatif. Vos données restent sur cet appareil tant que vous ne vous connectez pas. Se connecter garde votre historique, votre progression et vos réglages, y compris votre position, synchronisés entre vos appareils.',
    continueWithApple: 'Continuer avec Apple',
    continueWithGoogle: 'Continuer avec Google',
    signInWithApple: 'Se connecter avec Apple',
    signInWithGoogle: 'Se connecter avec Google',
    agreement: 'En continuant, vous acceptez les {terms} et la {privacy}.',
    terms: 'Conditions d’utilisation',
    privacy: 'Politique de confidentialité',
    notice:
      'L’historique de votre pratique, vos réglages et votre position approximative sont stockés chez Google Firebase (États-Unis) pour être synchronisés, avec votre nom et votre adresse e-mail fournis par Apple ou Google. Vous devez avoir au moins 13 ans, ou l’âge exigé dans votre pays (jusqu’à 16 ans). Vous pouvez supprimer votre compte à tout moment.',
    signingIn: 'Connexion…',
    signInFailed: 'La connexion n’a pas abouti. Rien n’a changé sur cet appareil.',
    errors: {
      network: 'Connexion impossible. Vérifiez votre connexion et réessayez.',
      auth: 'La connexion n’a pas été acceptée. Réessayez.',
      sync: 'Vos données n’ont pas pu être synchronisées cette fois. Une nouvelle tentative aura lieu.',
      unknown: 'Un problème est survenu. Réessayez.',
      'remove-blocked': 'Votre compte est injoignable, donc rien n’a été supprimé.',
      'link-conflict':
        'Cette connexion appartient déjà à un autre compte Ihsaanly, elle n’a donc pas été associée. Pour l’utiliser ici, exportez ce que vous souhaitez conserver de l’autre compte, supprimez ce compte, puis associez-la de nouveau, ou contactez l’assistance.',
      'reauth-unavailable':
        'La suppression exige de vous reconnecter avec Apple, ce qui n’est pas disponible ici. Supprimez votre compte depuis l’app Ihsaanly ou companion.ihsaanly.app.',
    },
    signedInWith: { apple: 'Connecté avec Apple', google: 'Connecté avec Google' },
    lastSynced: (when: string): string => `Dernière synchronisation : ${when}`,
    neverSynced: 'Pas encore synchronisé',
    justNow: 'à l’instant',
    minutesAgo: (n: number): string => `il y a ${n} min`,
    hoursAgo: (n: number): string => `il y a ${n} h`,
    daysAgo: (n: number): string => `il y a ${n} j`,
    syncing: 'Synchronisation…',
    upToDate: 'À jour',
    syncFailed: 'La dernière synchronisation n’a pas abouti. Une nouvelle tentative aura lieu.',
    syncNow: 'Synchroniser maintenant',
    signOut: 'Se déconnecter',
    signOutDetail: 'Arrête la synchronisation de cet appareil. Votre compte garde sa copie.',
    signOutTitle: 'Se déconnecter ?',
    signOutBody:
      'Votre compte garde tout ce qui est déjà synchronisé. Choisissez ce qu’il advient de la copie sur cet appareil.',
    keepData: 'Garder les données sur cet appareil',
    removeData: 'Supprimer de cet appareil',
    deleteAccount: 'Supprimer le compte',
    deleteAccountDetail: 'Efface votre compte et tout ce qui y est synchronisé.',
    deleteTitle: 'Supprimer votre compte ?',
    deleteBody:
      'Votre compte et toutes les données qui y sont synchronisées sont définitivement supprimés du cloud. Cette action est irréversible.',
    deleteConfirm: 'Supprimer le compte',
    deleteChoiceTitle: 'Et les données sur cet appareil ?',
    deleteChoiceBody:
      'Gardez-les pour continuer à utiliser l’application sans compte, ou supprimez-les pour repartir de zéro.',
    mismatchTitle: 'Cet appareil contient les données d’un autre compte',
    mismatchBody:
      'Fusionnez-les dans le compte auquel vous êtes connecté, ou effacez cet appareil pour reprendre les données de ce compte.',
    merge: 'Fusionner dans ce compte',
    fresh: 'Repartir de zéro sur cet appareil',
    cancel: 'Annuler',
    linkTitle: 'Vous avez déjà un compte',
    linkBody: (existing: string, attempted: string): string =>
      `Cet e-mail est déjà associé à un compte Ihsaanly qui utilise ${existing}. Continuez avec ${existing} pour l’ouvrir : ${attempted} y sera associé, et les deux fonctionneront désormais.`,
    linkUnavailable:
      'Ce compte utilise Se connecter avec Apple, qui n’est pas proposé ici. Connectez-vous dans l’app Ihsaanly ou sur companion.ihsaanly.app, associez Google dans Compte → Méthodes de connexion, puis revenez.',
    methodsTitle: 'Méthodes de connexion',
    methodLinked: (provider: string): string => `${provider}, associé`,
    linkProvider: (provider: string): string => `Associer ${provider}`,
    methodsHint:
      'Si vous avez utilisé « Masquer mon adresse e-mail » avec Apple, associez Google ici pour que les deux ouvrent le même compte.',
    restore: {
      backToSetup: 'Retour à la configuration',
      intro:
        'Connectez-vous avec le compte que vous utilisez déjà. Vos réglages, votre position et votre historique reviennent avec la première synchronisation.',
      restoring: 'Restauration de vos données…',
      restored: 'Vos données sont de retour.',
      needsSetupTitle: 'Rien à restaurer pour l’instant',
      needsSetupBody:
        'Ce compte n’a pas encore été configuré. Poursuivez la configuration : vous restez connecté, et vos choix se synchronisent au fur et à mesure.',
      continueSetup: 'Poursuivre la configuration',
      remindersTitle: 'Vos rappels sont activés',
      remindersBody:
        'Votre compte a des rappels activés. Autorisez les notifications ici pour qu’ils arrivent aussi sur cet appareil.',
    },
  },
  data: {
    title: 'Vos données',
    explanation:
      'Tout ce qui se trouve ici reste sur cet appareil. Rien n’en sort, sauf si vous l’envoyez vous-même depuis cet écran, ou si vous vous connectez pour synchroniser depuis Compte.',
    export: 'Exporter mes données',
    exportDetail: 'Un texte lisible que vous pouvez garder, ou transférer sur un autre appareil.',
    importing: 'Importer depuis un fichier',
    importDetail:
      'Fusionne au lieu de remplacer. Importer deux fois le même fichier ne change rien.',
    diagnostics: 'Envoyer un rapport de diagnostic',
    diagnosticsDetail:
      'Pour résoudre un problème. Il contient vos réglages, l’historique de votre pratique, vos coordonnées approximatives et les erreurs récentes. Vous le verrez avant qu’il ne soit envoyé.',
    imported: (count: number): string =>
      `${count} ${plural(count, 'entrée ajoutée', 'entrées ajoutées')}.`,
    importFailed: 'Ce fichier n’a pas pu être lu.',
    shareFailed: 'Le partage n’est pas disponible sur cet appareil.',
    crashReports: 'Partager les rapports de plantage',
    crashReportsDetail:
      'Envoyer les rapports de plantage et les erreurs pour aider à corriger les problèmes. Ils contiennent le modèle de votre appareil et la version de l’app, jamais votre pratique ni votre compte.',
    delete: 'Supprimer mes données',
    deleteDetail:
      'Tout ce qui se trouve sur cet appareil : les réglages et l’historique de votre pratique. L’application repart de zéro.',
    deleteConfirmTitle: 'Tout supprimer ?',
    deleteConfirmBody:
      'Vos réglages et l’historique de votre pratique sont supprimés de cet appareil. Sauf si vous les avez exportés ou synchronisés avec un compte, il n’en existe aucune copie ailleurs.',
    deleteConfirmBodySignedIn:
      'Cela supprime vos réglages et l’historique de votre pratique de cet appareil uniquement. Votre compte garde sa copie synchronisée. Pour la supprimer aussi, allez dans Compte → Supprimer le compte.',
    deleteConfirm: 'Supprimer',
    cancel: 'Annuler',
  },
  diagnostics: {
    title: 'Rapport de diagnostic',
    explanation:
      'Voici ce que contient le rapport. Rien n’est envoyé tant que vous ne choisissez pas de l’envoyer, et c’est vous qui choisissez où.',
    version: 'Version de l’application',
    device: 'Appareil',
    coordinates: 'Coordonnées approximatives',
    noCoordinates: 'Aucune enregistrée',
    records: 'Historique de pratique',
    settings: 'Réglages enregistrés',
    failures: 'Échecs enregistrés',
    failuresDetail: (count: number): string =>
      `${count} ${plural(count, 'géré', 'gérés')} par l’application sans vous le signaler`,
    reminders: 'Rappels',
    remindersDetail: (permission: string, pending: number): string =>
      `${permission} · ${pending} en attente`,
    error: 'Erreur récente',
    errorIncluded: 'Une erreur est incluse',
    showRaw: 'Afficher le rapport complet',
    hideRaw: 'Masquer le rapport complet',
    send: 'L’envoyer',
    cancel: 'Pas maintenant',
    reportProblem: 'Signaler ce problème',
  },
  feedback: {
    title: 'Envoyer un retour',
    explanation:
      'Dites-nous ce qui n’a pas fonctionné, ou ce qui améliorerait Ihsaanly. Rien n’est envoyé tant que vous n’appuyez pas sur Envoyer.',
    signedOut:
      'Votre retour est envoyé avec votre compte, afin que nous puissions vous répondre et écarter les messages indésirables. Se connecter reste facultatif pour le reste de l’application.',
    signIn: 'Se connecter pour envoyer un retour',
    emailFallback: 'Vous préférez l’e-mail ? Écrivez à {email}.',
    kindLabel: 'De quoi s’agit-il ?',
    kinds: {
      bug: 'Signaler un problème',
      idea: 'Proposer une idée',
      other: 'Autre chose',
    },
    messageLabel: 'Votre message',
    messagePlaceholder: 'Que s’est-il passé, ou qu’est-ce qui aiderait ?',
    counter: (used: number, max: number): string => `${used} / ${max}`,
    contactLabel: 'E-mail de contact',
    contactHint: 'Facultatif. Seulement si vous souhaitez une réponse.',
    contactPlaceholder: 'name@example.com',
    fillAccountEmail: (email: string): string => `Utiliser ${email}`,
    includeDiagnostics: 'Joindre les informations de diagnostic',
    includeDiagnosticsDetail:
      'Facultatif. Version de l’application, appareil, position approximative et nombre de problèmes. Désactivé tant que vous ne l’activez pas.',
    showIncluded: 'Voir ce qui est inclus',
    hideIncluded: 'Masquer ce qui est inclus',
    privacy:
      'Envoyé à Moh’d Inc. avec votre compte afin que nous puissions vous répondre. Conservé jusqu’à 2 ans. {privacy}',
    privacyLink: 'Lire la politique de confidentialité',
    send: 'Envoyer',
    sending: 'Envoi…',
    queuedTitle: 'Enregistré pour plus tard',
    queued:
      'Vous êtes hors ligne. Votre retour est enregistré sur cet appareil et sera envoyé dès que vous serez de nouveau connecté.',
    sentTitle: 'Merci',
    sent: 'Votre retour a été envoyé.',
    done: 'Terminé',
    sendAnother: 'En envoyer un autre',
    errors: {
      'rate-limited': 'Vous venez d’envoyer un retour. Patientez une minute, puis réessayez.',
      network:
        'Connexion impossible. Votre message est toujours là. Vérifiez votre connexion et réessayez.',
      'signed-out': 'Enregistré sur cet appareil. Il sera envoyé une fois que vous serez connecté.',
      invalid: 'Vérifiez votre message et votre adresse e-mail de contact, puis renvoyez.',
      unknown: 'Une erreur s’est produite. Votre message est toujours là. Réessayez.',
    },
  },
  about: {
    title: 'À propos',
    version: 'Version',
    content: 'Contenu',
    contentUnreviewed: (count: number): string =>
      `${count} éléments, rédigés et en attente de relecture par un savant nommé.`,
    contentReviewedBy: (name: string, count: number): string =>
      `${count} éléments, relus par ${name}.`,
    donate: 'Faire un don',
    donateBody:
      'Facultatif, et cela ne débloque rien. Toute l’application est gratuite et le restera. S’ouvre dans votre navigateur.',
    privacyPolicy: 'Politique de confidentialité',
    termsOfUse: 'Conditions d’utilisation',
    privacyTitle: 'Vos données restent sur cet appareil',
    privacyBody:
      'Aucune mesure d’audience, aucune publicité. Votre position est utilisée sur cet appareil pour calculer les heures de prière, et l’historique de votre pratique ainsi que vos réglages sont conservés ici. L’application vérifie sur ihsaanly.app les mises à jour du contenu, sans rien envoyer vous concernant. Sinon, rien ne quitte cet appareil sans que vous le choisissiez : exporter ou partager, envoyer un retour, activer les rapports de plantage ou les annonces (app iOS et Android), ou vous connecter pour synchroniser. La connexion avec Apple ou Google est facultative : votre nom et votre adresse e-mail, l’historique de votre pratique, votre progression, vos réglages et votre position approximative (à environ 1 km près) sont alors stockés chez Google Firebase, aux États-Unis, pour être synchronisés entre vos appareils. Supprimez votre compte à tout moment depuis Compte. Sur Android, Faire un don ouvre votre navigateur, et cette page ne fait pas partie d’Ihsaanly.',
    licences: 'Réalisé avec',
    licencesBody:
      'Expo et React Native, la bibliothèque adhan pour les heures de prière, les tables du calendrier Umm al-Qura, les données de villes de city-timezones (fondées sur GeoNames), et Natural Earth pour la carte. Chacun est utilisé sous sa propre licence libre, indiquée dans le dépôt du code source.',
    geonames: 'Données de villes © GeoNames (CC BY 4.0)',
  },
  memorise: {
    title: 'L’apprendre',
    start: 'S’exercer',
    hide: 'En masquer un de plus',
    known: 'Je le connais',
    knownDetail: 'Il reste dans la Bibliothèque. Il n’apparaît plus dans les rappels.',
    notKnown: 'J’apprends encore',
    noAudio: 'Pas encore de récitation pour celui-ci.',
    play: 'Écouter',
    stop: 'Arrêter',
    loop: 'Répéter',
  },
  language: {
    title: 'Langue',
    restart:
      'L’arabe se lit de droite à gauche. Passer à l’arabe ou le quitter redémarre l’application, ou vous demande de la rouvrir.',
    incomplete:
      'L’anglais est la version originale. Toutes les autres langues sont des brouillons encore en attente de relecture par un locuteur qualifié.',
    reopenTitle: 'Rouvrez Ihsaanly',
    reopenBody:
      'Cette langue se lit de droite à gauche. Fermez Ihsaanly puis rouvrez-la pour terminer le changement.',
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
    title: 'Apparence',
    system: 'Système',
    light: 'Clair',
    dark: 'Sombre',
    note: 'Les couleurs viennent toujours du système : ses réglages de contraste s’appliquent dans tous les cas.',
  },
  moonSighting: {
    title: 'Observation de la lune',
    explanation:
      'Les dates de cette application sont calculées. Les communautés divergent : certaines suivent le calcul, d’autres l’observation locale, et les deux diffèrent souvent d’un jour. Suivez ce que suit votre propre communauté, et ajustez la date dans les réglages pour que l’application concorde avec elle.',
    disclaimer:
      'Elles sont listées pour que vous trouviez la vôtre. Cette application n’en cautionne aucune.',
  },
  tracking: {
    title: 'Suivi',
    active: 'Actif',
    travelling: 'En voyage',
    travellingDetail:
      'Le raccourcissement de la prière est proposé, les sunnas régulières sont mises de côté, et le jeûne est proposé plutôt que prévu.',
    paused: 'Suspendre le suivi des prières',
    pausedDetail:
      'Les prières ne sont pas enregistrées et rien ne s’accumule à rattraper. Le suivi reste suspendu jusqu’à ce que vous le réactiviez.',
    jumuah: 'La Joumou’a le vendredi',
    jumuahChoice: {
      auto: 'Automatique',
      attend: 'J’assiste à la Joumou’a',
      dhuhr: 'Je prie Dhuhr',
    },
    jumuahAutoDetail:
      'La Joumou’a le vendredi, sauf si vous êtes en voyage ou avez choisi « Sœur ».',
    checkIn: 'Me rappeler de faire le point',
    checkInAfter: (days: number): string => `Me le rappeler dans environ ${days} jours`,
    checkInOff: 'Aucun rappel. Réactivez le suivi quand vous voulez.',
    checkInDays: 'Jours',
  },
  hijri: {
    title: 'Date hégirienne',
    offset: 'Ajuster la date',
    approximate: 'Calculée : à confirmer auprès de l’autorité que suit votre communauté.',
    explanation:
      'Un calendrier calculé et l’observation locale de la lune diffèrent souvent d’un jour ou deux. Décalez la date ici pour que l’application concorde avec votre communauté. Les dates des jours de jeûne sont toujours présentées comme prévues, jamais comme certaines.',
    offsetLabel: (days: number): string =>
      days === 0
        ? 'Aucun changement'
        : `${days > 0 ? '+' : ''}${days} ${plural(Math.abs(days), 'jour', 'jours')}`,
    format: (day: number, month: string, year: number): string => `${day} ${month} ${year}`,
  },
  hijriMonth: {
    1: 'Mouharram',
    2: 'Safar',
    3: 'Rabi’ al-Awwal',
    4: 'Rabi’ ath-Thani',
    5: 'Joumada al-Oula',
    6: 'Joumada al-Akhira',
    7: 'Rajab',
    8: 'Cha’bane',
    9: 'Ramadan',
    10: 'Chawwal',
    11: 'Dhou al-Qi’da',
    12: 'Dhou al-Hijja',
  },
  calculation: {
    title: 'Calcul des prières',
    method: 'Méthode',
    asr: 'Asr',
    highLatitude: 'Haute latitude',
    selected: 'Sélectionné',
    explanation:
      'Les heures de prière sont calculées sur cet appareil et ne sont jamais affichées sous forme d’heures : elles servent seulement à savoir dans quelle partie de la journée vous êtes.',
    highLatitudeExplanation:
      'Au-delà d’environ 48° nord, Isha n’a pas lieu pendant une partie de l’année. Ce réglage décide de ce qui est utilisé à la place.',
  },
  asr: {
    shafi: 'Standard',
    hanafi: 'Hanafite',
  },
  highLatitude: {
    middleofthenight: 'Milieu de la nuit',
    seventhofthenight: 'Septième de la nuit',
    twilightangle: 'Angle du crépuscule',
  },
  method: {
    MuslimWorldLeague: 'Ligue islamique mondiale',
    Egyptian: 'Autorité générale égyptienne',
    Karachi: 'Université des sciences islamiques, Karachi',
    UmmAlQura: 'Umm al-Qura, La Mecque',
    Dubai: 'Dubaï',
    MoonsightingCommittee: 'Moonsighting Committee',
    NorthAmerica: 'ISNA, Amérique du Nord',
    Kuwait: 'Koweït',
    Qatar: 'Qatar',
    Singapore: 'Singapour',
    Tehran: 'Téhéran',
    Turkey: 'Turquie',
  },
  library: {
    title: 'Bibliothèque',
    empty: 'Les adhkar, les du’as et les sunnas apparaîtront ici.',
    search: 'Rechercher par nom ou par situation',
    searchLabel: 'Rechercher dans la bibliothèque',
    noResults: 'Aucun résultat.',
    filterAll: 'Tous',
    filterOnToday: 'Sur Aujourd’hui',
    filterKnown: 'Connus',
    onToday: 'Sur Aujourd’hui',
    known: 'Connu',
    emptyOnToday: 'Rien n’est encore sur Aujourd’hui. Ouvrez n’importe quel élément et activez-le.',
    emptyKnown:
      'Rien n’est encore marqué comme connu. Exercez-vous sur un élément et indiquez quand vous le connaissez.',
    terms: 'Glossaire',
    termsDetail: 'Sunna, rawatib, adhkar, qada et les autres, en une phrase chacun.',
  },
  category: {
    adhkar: 'Adhkar',
    dhikr: 'Après la prière',
    fasting: 'Jeûne',
    food: 'Repas',
    home: 'Maison',
    masjid: 'Mosquée',
    prayer: 'Prière',
    quran: 'Coran',
    charity: 'Aumône',
    sleep: 'Sommeil et réveil',
    travel: 'Voyage',
  },
  item: {
    done: 'Fait',
    doneToday: 'Fait aujourd’hui',
    undo: 'Annuler',
    counterReset: 'Recommencer',
    yourDay: 'Votre journée',
    onToday: 'Sur Aujourd’hui',
    onTodayDetail: 'Apparaît quand son moment arrive',
    remind: 'Me le rappeler',
    remindWindow: 'À l’ouverture de sa plage',
    remindLookAhead: 'La veille au soir',
    share: 'Partager',
    shareText: 'Partager en texte',
    shareImage: 'Partager en image',
    sharedFrom: 'Partagé depuis Ihsaanly',
    transliteration: 'Translittération',
    translation: 'Traduction',
    why: 'Pourquoi',
    how: 'Comment',
    unreviewed: 'En attente de relecture',
    evidence: 'Sources',
    note: 'Les savants divergent',
    repeat: (times: number): string => `Répéter ${times} fois`,
    parts: 'Ce qu’il faut dire',
    partRepeat: (times: number): string => `${times} fois`,
    gradedBy: (grader: string): string => `authentifié par ${grader}`,
    quranReference: (surah: number, ayah: number): string => `Coran ${surah}:${ayah}`,
  },
  glossary: {
    title: 'Ce que signifient les mots',
  },
  ruling: {
    fard: 'Obligatoire',
    wajib: 'Obligatoire',
    'sunnah-muakkadah': 'Sunna appuyée',
    sunnah: 'Sunna',
    mustahabb: 'Recommandé',
    mubah: 'Permis',
  },
  grading: {
    sahih: 'Sahih',
    hasan: 'Hasan',
    "da'if": 'Da’if',
    disputed: 'Discuté',
  },
  more: {
    title: 'Plus',
    search: 'Rechercher dans les réglages',
    searchLabel: 'Rechercher dans Plus',
    prayer: 'Prière',
    app: 'Application',
    practice: 'Votre pratique',
    empty: 'L’historique, les réglages et l’aide se trouveront ici.',
    help: 'Aide',
    showMeAround: 'Faites-moi visiter',
  },
  onboarding: {
    welcomeTitle: 'Le moment, pas l’horloge.',
    welcomeBody:
      'Ihsaanly vous dit quand les adhkar du soir sont ouverts. Jamais une heure. Jamais un score.',
    howTitle: 'Ihsaanly montre ce qui convient à l’instant. Touchez un cercle quand c’est fait.',
    language: 'Langue',
    appearance: 'Apparence',
    locationStep: 'Où êtes-vous ?',
    locationWhy:
      'Utilisée sur cet appareil pour déterminer les parties de la journée. Elle y reste, sauf si vous vous connectez pour synchroniser.',
    genderStep: 'La pause du suivi',
    genderWhy:
      'Certains jours, le suivi des prières doit s’arrêter, sans que rien ne s’accumule à rattraper. Ceci indique à l’application s’il faut le proposer.',
    brother: 'Frère',
    brotherDetail: 'Pas de pause',
    sister: 'Sœur',
    sisterDetail: 'Pause proposée',
    skip: 'Je préfère ne pas répondre',
    skipDetail: 'La pause est proposée quand même.',
    genderPrivacy:
      'Enregistré sur cet appareil, et synchronisé seulement si vous vous connectez. Utilisé pour rien d’autre.',
    remindersStep: 'Notifications',
    remindersWhy:
      'Choisissez ce qu’Ihsaanly peut vous envoyer. Vous pourrez changer l’un ou l’autre plus tard dans Plus.',
    dailyReminders: 'Rappels quotidiens',
    dailyRemindersDetail:
      'Adhkar du matin et du soir et jours de jeûne à venir, programmés sur cet appareil.',
    announcementsChoice: 'Annonces d’Ihsaanly',
    announcementsChoiceDetail:
      'Des nouvelles occasionnelles, comme le début du Ramadan, envoyées par nous. Désactivées tant que vous ne les activez pas.',
    startStep: 'Un point de départ',
    startWhy:
      'Choisissez une taille pour commencer. Ajoutez ou retirez ce que vous voulez dans la Bibliothèque, quand vous voulez.',
    starting: 'Premiers pas',
    startingDetail: (count: number): string =>
      `${count} choses que vous pouvez tenir dès le premier jour : deux plages, un dhikr, deux du’as. Pour qui découvre tout cela.`,
    essentials: 'L’essentiel',
    essentialsDetail: (count: number): string =>
      `${count} éléments, une journée raisonnable plutôt que complète. Pour qui prie déjà et veut la sunna qui l’entoure.`,
    everything: 'Tout',
    everythingDetail: (count: number): string =>
      `Les ${count} éléments. Pour qui connaît le contenu et veut le calendrier complet.`,
    skipIntro: 'Passer',
    skipLocation: 'Passer pour l’instant',
    reminderPolicy: (perDay: number, from: number, to: number): string =>
      `Au plus ${perDay} par jour, et rien entre ${from} h et ${to} h.`,
    reminderCap: (perDay: number): string => `Au plus ${perDay} par jour.`,
    included: 'Inclus',
    andMore: (count: number): string => `et ${count} de plus`,
    back: 'Retour',
    continue: 'Continuer',
    allowReminders: 'Autoriser les rappels',
    allowNotifications: 'Autoriser les notifications',
    notNow: 'Pas maintenant',
    done: 'Commencer',
    restore: 'Vous utilisez déjà Ihsaanly ? Connectez-vous pour restaurer vos données',
  },
  location: {
    title: 'Position',
    notSet: 'Non définie',
    currentLocation: 'Position actuelle',
    useDevice: 'Utiliser ma position',
    useDeviceDetail: 'Reste sur cet appareil, sauf si vous vous connectez pour synchroniser.',
    locating: 'Localisation en cours…',
    orSearch: 'ou recherchez une ville',
    follows: 'Les plages de prière suivront ce lieu.',
    search: 'Rechercher une ville',
    searchLabel: 'Rechercher des villes',
    noResults: 'Aucune ville ne correspond.',
    unavailable:
      'Les services de localisation sont désactivés sur cet appareil. Activez-les, ou recherchez plutôt votre ville.',
    declined:
      'L’accès à la position a été refusé. Recherchez plutôt votre ville : tout fonctionne quand même.',
    explanation:
      'Utilisée sur cet appareil pour déterminer les plages de prière. Elle y reste, sauf si vous vous connectez pour synchroniser.',
    attribution: 'Données de villes issues de city-timezones (MIT).',
  },
  textField: {
    clear: 'Effacer',
  },
  error: {
    title: 'Un problème est survenu',
    retry: 'Réessayer',
  },
  notFound: {
    title: 'Introuvable',
    body: 'Cet écran n’existe pas.',
  },
  widgets: {
    quickDuas: "Du'as rapides",
    duaOfTheDay: "Du'a du jour",
    nothingNow: "Rien ne vous est demandé pour l'instant",
    openApp: 'Ouvrez Ihsaanly pour mettre à jour',
  },
  web: {
    remindersUnavailable:
      "Les rappels nécessitent l'application. Un navigateur ne peut pas vous rappeler quand la page est fermée.",
    homeDetectionUnavailable: "Détecter l'arrivée à la maison nécessite l'application.",
    storageAtRisk:
      "Ce navigateur n'enregistre pas vos données de façon fiable. Exportez une sauvegarde depuis Données.",
    openInApp: "Ouvrir dans l'application",
    getApp: "Obtenir l'application",
    updateReady: 'Une nouvelle version est prête.',
    reload: 'Recharger',
    remindersThrough: (date: string): string =>
      `Rappels programmés jusqu’au ${date}. Ouvrez Ihsaanly d’ici là pour qu’ils continuent.`,
    dismiss: 'Ignorer',
  },
  panel: {
    close: 'Fermer',
    markAll: 'Tout marquer comme fait',
    progress: (count: number, target: number): string => `${count} sur ${target}`,
    tapToCount: 'Touchez pour compter',
  },
}
