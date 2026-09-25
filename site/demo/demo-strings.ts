// Copy that exists only in the demo, with no home in the app's own string
// tables: the More tab's placeholder line, and the tab list's accessibility
// label. Kept to the same shape and the same caveat as src/strings/*.ts —
// English is the source; every other line below is a draft, written in one
// pass and not yet reviewed by a qualified speaker.

import type { SupportedLanguage } from '@/i18n/locale'

export interface DemoCopy {
  moreBody: string
  tabsLabel: string
  /** Coach step "mark": points at the prayer chip whose window is current (or the fallback). */
  coachMarkPrayer: (prayer: string) => string
  /** Coach step "open", with an item card to point at. */
  coachOpenItem: string
  /** Coach step "open", falling back to the Library tab when no item card is showing. */
  coachOpenLibrary: string
}

export const DEMO_COPY: Record<SupportedLanguage, DemoCopy> = {
  en: {
    moreBody: 'Settings, widgets and more are in the app.',
    tabsLabel: 'Tabs',
    coachMarkPrayer: (prayer: string): string => `Tap to mark ${prayer} as prayed`,
    coachOpenItem: 'Tap to see where it comes from',
    coachOpenLibrary: 'Browse the library',
  },
  ar: {
    moreBody: 'الإعدادات والودجات والمزيد في التطبيق.',
    tabsLabel: 'علامات التبويب',
    coachMarkPrayer: (prayer: string): string => `اضغط لتسجيل ${prayer} كمُصلّاة`,
    coachOpenItem: 'اضغط لمعرفة مصدره',
    coachOpenLibrary: 'تصفح المكتبة',
  },
  fr: {
    moreBody: 'Les réglages, les widgets et plus encore se trouvent dans l’application.',
    tabsLabel: 'Onglets',
    coachMarkPrayer: (prayer: string): string => `Touchez pour marquer ${prayer} comme priée`,
    coachOpenItem: "Touchez pour voir d'où cela vient",
    coachOpenLibrary: 'Parcourir la bibliothèque',
  },
  hi: {
    moreBody: 'सेटिंग्स, विजेट्स और बाक़ी सब ऐप में हैं।',
    tabsLabel: 'टैब',
    coachMarkPrayer: (prayer: string): string => `${prayer} को पढ़ी हुई अंकित करने के लिए थपथपाएं`,
    coachOpenItem: 'यह कहाँ से आया है यह देखने के लिए थपथपाएं',
    coachOpenLibrary: 'लाइब्रेरी ब्राउज़ करें',
  },
  it: {
    moreBody: 'Impostazioni, widget e altro si trovano nell’app.',
    tabsLabel: 'Schede',
    coachMarkPrayer: (prayer: string): string => `Tocca per segnare ${prayer} come pregata`,
    coachOpenItem: 'Tocca per vedere da dove viene',
    coachOpenLibrary: 'Sfoglia la biblioteca',
  },
  ja: {
    moreBody: '設定やウィジェットなどはアプリ内にあります。',
    tabsLabel: 'タブ',
    coachMarkPrayer: (prayer: string): string => `${prayer}を礼拝済みにするにはタップ`,
    coachOpenItem: '出典を見るにはタップ',
    coachOpenLibrary: 'ライブラリを見る',
  },
  so: {
    moreBody: 'Dejinta, widgets-ka iyo wax kale waxay ku jiraan abka.',
    tabsLabel: 'Tabbada',
    coachMarkPrayer: (prayer: string): string =>
      `Riix si aad ${prayer} u calaamadiso in la tukaday`,
    coachOpenItem: 'Riix si aad u aragto halka ay ka timid',
    coachOpenLibrary: 'Baadh maktabadda',
  },
  ur: {
    moreBody: 'ترتیبات، ویجٹس اور مزید ایپ میں موجود ہیں۔',
    tabsLabel: 'ٹیبز',
    coachMarkPrayer: (prayer: string): string =>
      `${prayer} کو پڑھی ہوئی نشان زد کرنے کے لیے تھپتھپائیں`,
    coachOpenItem: 'یہ کہاں سے آیا دیکھنے کے لیے تھپتھپائیں',
    coachOpenLibrary: 'کتب خانہ دیکھیں',
  },
  yue: {
    moreBody: '設定、小工具同其他嘢都喺 App 入面。',
    tabsLabel: '分頁',
    coachMarkPrayer: (prayer: string): string => `輕觸將${prayer}標記為已禮`,
    coachOpenItem: '輕觸睇吓出處',
    coachOpenLibrary: '瀏覽資料庫',
  },
  zh: {
    moreBody: '设置、小组件和更多内容都在应用中。',
    tabsLabel: '标签页',
    coachMarkPrayer: (prayer: string): string => `点击将${prayer}标记为已礼`,
    coachOpenItem: '点击查看出处',
    coachOpenLibrary: '浏览资料库',
  },
}

export function demoCopyFor(language: SupportedLanguage): DemoCopy {
  return DEMO_COPY[language]
}
