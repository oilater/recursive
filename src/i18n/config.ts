export const locales = ["ko", "en", "ja", "zh"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "KO",
  en: "EN",
  ja: "JA",
  zh: "ZH",
};

export const LOCALE_PATH_REGEX = new RegExp(`^/(${locales.join("|")})(/|$)`);
