"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { type Locale, locales, defaultLocale, LOCALE_LABELS } from "@/i18n/config";
import { switchLocalePath } from "@/shared/lib/locale-switch";
import { GlobeIcon } from "./icons";
import * as styles from "./locale-toggle.css";

const LOCALES: { code: Locale; label: string }[] = locales.map((code) => ({
  code,
  label: LOCALE_LABELS[code],
}));

export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(
    function closeOnClickOutside() {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    },
    [open],
  );

  const switchTo = (target: Locale) => {
    setOpen(false);
    if (target === locale) return;
    const url = new URL(window.location.href);
    url.pathname = switchLocalePath(url.pathname, target);
    window.location.href = url.toString();
  };

  const current =
    LOCALES.find((l) => l.code === locale) ??
    LOCALES.find((l) => l.code === defaultLocale)!;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} className={styles.trigger}>
        <GlobeIcon />
        {current.label}
      </button>

      {open && (
        <div className={styles.dropdown}>
          {LOCALES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => switchTo(code)}
              className={`${styles.option} ${code === locale ? styles.optionActive : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
