import { type Locale, LOCALE_PATH_REGEX } from "@/i18n/config";

export function switchLocalePath(currentPath: string, target: Locale): string {
  if (LOCALE_PATH_REGEX.test(currentPath)) {
    return currentPath.replace(LOCALE_PATH_REGEX, `/${target}$2`);
  }
  return `/${target}${currentPath}`;
}
