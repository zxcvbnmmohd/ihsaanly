// Copy that exists only in the demo, with no home in the app's own string
// tables: the More tab's placeholder line, and the tab list's accessibility
// label. Kept to the same shape and the same caveat as src/strings/*.ts —
// English is the source; every other line below is a draft, written in one
// pass and not yet reviewed by a qualified speaker.

import type { SupportedLanguage } from '@/i18n/locale'

export interface DemoCopy {
  moreBody: string
  tabsLabel: string
}

export const DEMO_COPY: Record<SupportedLanguage, DemoCopy> = {
  en: {
    moreBody: 'Settings, widgets and more are in the app.',
    tabsLabel: 'Tabs',
  },
  ar: {
    moreBody: 'الإعدادات والودجات والمزيد في التطبيق.',
    tabsLabel: 'علامات التبويب',
  },
  fr: {
    moreBody: 'Les réglages, les widgets et plus encore se trouvent dans l’application.',
    tabsLabel: 'Onglets',
  },
  hi: {
    moreBody: 'सेटिंग्स, विजेट्स और बाक़ी सब ऐप में हैं।',
    tabsLabel: 'टैब',
  },
  it: {
    moreBody: 'Impostazioni, widget e altro si trovano nell’app.',
    tabsLabel: 'Schede',
  },
  ja: {
    moreBody: '設定やウィジェットなどはアプリ内にあります。',
    tabsLabel: 'タブ',
  },
  so: {
    moreBody: 'Dejinta, widgets-ka iyo wax kale waxay ku jiraan abka.',
    tabsLabel: 'Tabbada',
  },
  ur: {
    moreBody: 'ترتیبات، ویجٹس اور مزید ایپ میں موجود ہیں۔',
    tabsLabel: 'ٹیبز',
  },
  yue: {
    moreBody: '設定、小工具同其他嘢都喺 App 入面。',
    tabsLabel: '分頁',
  },
  zh: {
    moreBody: '设置、小组件和更多内容都在应用中。',
    tabsLabel: '标签页',
  },
}

export function demoCopyFor(language: SupportedLanguage): DemoCopy {
  return DEMO_COPY[language]
}
