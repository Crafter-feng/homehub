import { ref } from 'vue';
import zhCN from './zh-CN';
import en from './en';

export type Locale = 'zh-CN' | 'en';

const messages: Record<Locale, any> = {
  'zh-CN': zhCN,
  'en': en,
};

const currentLocale = ref<Locale>(
  (localStorage.getItem('locale') as Locale) || 'zh-CN'
);

export function useI18n() {
  const locale = currentLocale;

  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = messages[locale.value];

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') return key;

    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        value
      );
    }

    return value;
  };

  const setLocale = (newLocale: Locale) => {
    locale.value = newLocale;
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
  };

  const localeOptions = [
    { label: '简体中文', value: 'zh-CN' },
    { label: 'English', value: 'en' },
  ];

  return {
    locale,
    t,
    setLocale,
    localeOptions,
  };
}
