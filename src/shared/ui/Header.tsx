"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { LocaleToggle } from "./LocaleToggle";
import { LogoIcon, MenuIcon, GlobeIcon } from "./icons";
import { Link } from "@/i18n/navigation";
import { type Locale, locales, LOCALE_LABELS } from "@/i18n/config";
import { switchLocalePath } from "@/shared/lib/locale-switch";
import * as styles from "./header.css";

interface HeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ left, center, right }: HeaderProps) {
  const t = useTranslations("home");
  const locale = useLocale() as Locale;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const switchLocale = (target: Locale) => {
    setMenuOpen(false);
    if (target === locale) return;
    const url = new URL(window.location.href);
    url.pathname = switchLocalePath(url.pathname, target);
    window.location.href = url.toString();
  };

  useEffect(
    function closeOnClickOutside() {
      if (!menuOpen) return;
      const handler = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    },
    [menuOpen],
  );

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <a href="/" className={styles.logoLink}>
          <LogoIcon size={28} />
          <span className={styles.logoText}>Recursive</span>
        </a>
        {left}
      </div>
      <div className={styles.center}>{center}</div>

      {/* Desktop */}
      <div className={styles.desktopRight}>
        {right}
        <nav className={styles.nav}>
          <Link href="/docs" className={styles.navLink}>
            {t("docs")}
          </Link>
          <Link href="/visualize/playground" className={styles.navLink}>
            {t("playground")}
          </Link>
          <Link href="/algorithms" className={styles.navLink}>
            {t("algorithms")}
          </Link>
          <a href="https://github.com/sponsors/oilater" target="_blank" rel="noopener noreferrer" className={styles.sponsorLink}>
            Sponsor
          </a>
        </nav>
        <LocaleToggle />
      </div>

      {/* Mobile */}
      <div className={styles.mobileRight} ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={styles.menuButton}
        >
          <MenuIcon />
        </button>
        {menuOpen && (
          <div className={styles.mobileMenu}>
            <Link
              href="/docs"
              className={styles.mobileMenuLink}
              onClick={() => setMenuOpen(false)}
            >
              {t("docs")}
            </Link>
            <Link
              href="/visualize/playground"
              className={styles.mobileMenuLink}
              onClick={() => setMenuOpen(false)}
            >
              {t("playground")}
            </Link>
            <Link
              href="/algorithms"
              className={styles.mobileMenuLink}
              onClick={() => setMenuOpen(false)}
            >
              {t("algorithms")}
            </Link>
            <a
              href="https://github.com/sponsors/oilater"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mobileMenuLink}
              onClick={() => setMenuOpen(false)}
            >
              Sponsor
            </a>
            <div className={styles.mobileMenuDivider} />
            <div className={styles.mobileLocaleRow}>
              <GlobeIcon size={16} />
              {locales.map((code) => (
                <button
                  key={code}
                  onClick={() => switchLocale(code)}
                  className={`${styles.mobileLocaleButton} ${locale === code ? styles.mobileLocaleActive : ""}`}
                >
                  {LOCALE_LABELS[code]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
