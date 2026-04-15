"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import * as styles from "./locale-toggle.css";

const LOCALES: { code: Locale; label: string }[] = [
  { code: "ko", label: "KO" },
  { code: "en", label: "EN" },
];

export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
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
    if (target !== locale) router.replace(pathname, { locale: target });
  };

  const current = LOCALES.find((l) => l.code === locale)!;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} className={styles.trigger}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
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
