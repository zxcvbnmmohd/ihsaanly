// Copy that exists only in the demo, with no home in the app's own string
// tables: the tab list's accessibility label and the coach bubbles. Kept to
// the same shape and caveat as the core string tables — English is the source; every other line below is a draft, written in one
// pass and not yet reviewed by a qualified speaker.

import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'

export interface DemoCopy {
  tabsLabel: string
  /** Coach step "mark": points at the prayer chip whose window is current (or the fallback). */
  coachMarkPrayer: (prayer: string) => string
  /** Coach step "open", with an item card to point at: its circle. */
  coachTapCircle: string
  /** Coach step "open", falling back to the Library tab when no item card is showing. */
  coachOpenLibrary: string
}

const DEMO_COPY: Record<SupportedLanguage, DemoCopy> = {
  en: {
    tabsLabel: 'Tabs',
    coachMarkPrayer: (prayer: string): string => `Tap to mark ${prayer} as prayed`,
    coachTapCircle: "Tap the circle when you've done it",
    coachOpenLibrary: 'Browse the library',
  },
  ar: {
    tabsLabel: 'علامات التبويب',
    coachMarkPrayer: (prayer: string): string => `اضغط لتسجيل ${prayer} كمُصلّاة`,
    coachTapCircle: 'اضغط على الدائرة بعد أن تؤديها',
    coachOpenLibrary: 'تصفح المكتبة',
  },
  fr: {
    tabsLabel: 'Onglets',
    coachMarkPrayer: (prayer: string): string => `Touchez pour marquer ${prayer} comme priée`,
    coachTapCircle: "Touchez le cercle quand vous l'avez fait",
    coachOpenLibrary: 'Parcourir la bibliothèque',
  },
  hi: {
    tabsLabel: 'टैब',
    coachMarkPrayer: (prayer: string): string => `${prayer} को पढ़ी हुई अंकित करने के लिए थपथपाएं`,
    coachTapCircle: 'करने के बाद गोले को थपथपाएं',
    coachOpenLibrary: 'लाइब्रेरी ब्राउज़ करें',
  },
  it: {
    tabsLabel: 'Schede',
    coachMarkPrayer: (prayer: string): string => `Tocca per segnare ${prayer} come pregata`,
    coachTapCircle: "Tocca il cerchio quando l'hai fatto",
    coachOpenLibrary: 'Sfoglia la biblioteca',
  },
  ja: {
    tabsLabel: 'タブ',
    coachMarkPrayer: (prayer: string): string => `${prayer}を礼拝済みにするにはタップ`,
    coachTapCircle: '終えたら丸をタップ',
    coachOpenLibrary: 'ライブラリを見る',
  },
  so: {
    tabsLabel: 'Tabbada',
    coachMarkPrayer: (prayer: string): string =>
      `Riix si aad ${prayer} u calaamadiso in la tukaday`,
    coachTapCircle: 'Marka aad dhammayso, riix goobada',
    coachOpenLibrary: 'Baadh maktabadda',
  },
  ur: {
    tabsLabel: 'ٹیبز',
    coachMarkPrayer: (prayer: string): string =>
      `${prayer} کو پڑھی ہوئی نشان زد کرنے کے لیے تھپتھپائیں`,
    coachTapCircle: 'کر لینے کے بعد دائرے کو تھپتھپائیں',
    coachOpenLibrary: 'کتب خانہ دیکھیں',
  },
  yue: {
    tabsLabel: '分頁',
    coachMarkPrayer: (prayer: string): string => `輕觸將${prayer}標記為已禮`,
    coachTapCircle: '做完就輕觸個圈',
    coachOpenLibrary: '瀏覽資料庫',
  },
  zh: {
    tabsLabel: '标签页',
    coachMarkPrayer: (prayer: string): string => `点击将${prayer}标记为已礼`,
    coachTapCircle: '完成后点击圆圈',
    coachOpenLibrary: '浏览资料库',
  },
}

export function demoCopyFor(language: SupportedLanguage): DemoCopy {
  return DEMO_COPY[language]
}
