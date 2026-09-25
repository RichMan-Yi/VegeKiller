import { en, type MessageKey, type Messages } from './en';
import { zh } from './zh';
import { ko } from './ko';

/**
 * 介面文字一律從這裡取，不要在場景裡直接寫字串。
 * 新增文字：先在 en.ts 加 key，zh.ts / ko.ts 沒補齊 tsc 會報錯。
 */
export type Lang = 'en' | 'zh' | 'ko';

export const LANGS: Lang[] = ['en', 'zh', 'ko'];

/** 語言選單上顯示的名稱，一律用該語言自己的寫法 */
export const LANG_LABELS: Record<Lang, string> = { en: 'English', zh: '中文', ko: '한국어' };

const DICTS: Record<Lang, Messages> = { en, zh, ko };
const HTML_LANG: Record<Lang, string> = { en: 'en', zh: 'zh-Hant', ko: 'ko' };
const STORAGE_KEY = 'vegekiller.lang';
const DEFAULT_LANG: Lang = 'zh';

let current: Lang = loadLang();
applyHtmlLang();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  current = lang;
  applyHtmlLang();
  // 無痕視窗或封鎖網站資料時 localStorage 會丟例外，只是記不住選擇，不影響遊戲
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* 忽略 */
  }
}

/** 取目前語言的文字，{name} 會被 params.name 取代 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text = DICTS[current][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** 強化的名稱與說明，key 依 upgrades.ts 的 id 組成 */
export function upgradeText(id: string): { name: string; desc: string } {
  return {
    name: t(`upgrade.${id}.name` as MessageKey),
    desc: t(`upgrade.${id}.desc` as MessageKey),
  };
}

function loadLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as string[]).includes(saved)) return saved as Lang;
  } catch {
    /* 忽略 */
  }
  return DEFAULT_LANG;
}

function applyHtmlLang() {
  document.documentElement.lang = HTML_LANG[current];
}
