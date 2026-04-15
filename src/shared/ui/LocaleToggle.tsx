"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export function LocaleToggle() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (target: Locale) => {
    router.replace(pathname, { locale: target });
  };

  return (
    <div style={{ display: "flex", gap: "2px", fontSize: "12px", fontWeight: 500 }}>
      <button
        onClick={() => switchTo("ko")}
        style={{
          padding: "3px 8px",
          borderRadius: "4px 0 0 4px",
          border: "1px solid #334155",
          backgroundColor: locale === "ko" ? "#334155" : "transparent",
          color: locale === "ko" ? "#e2e8f0" : "#64748b",
          cursor: "pointer",
        }}
      >
        KO
      </button>
      <button
        onClick={() => switchTo("en")}
        style={{
          padding: "3px 8px",
          borderRadius: "0 4px 4px 0",
          border: "1px solid #334155",
          borderLeft: "none",
          backgroundColor: locale === "en" ? "#334155" : "transparent",
          color: locale === "en" ? "#e2e8f0" : "#64748b",
          cursor: "pointer",
        }}
      >
        EN
      </button>
    </div>
  );
}
