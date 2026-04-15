import { useTranslations } from "next-intl";
import { initializeAlgorithms } from "@/algorithm";
import { getCardDataByCategory, AlgorithmCard } from "@/algorithm";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/shared/ui";
import * as styles from "./home.css";

initializeAlgorithms();

const SECTIONS = [
  { category: "sorting" as const, titleKey: "sorting" as const, subKey: "sortingSub" as const },
  { category: "recursion" as const, titleKey: "recursion" as const, subKey: "recursionSub" as const },
];

export default function Home() {
  const t = useTranslations("home");

  return (
    <main className={styles.page}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
        <LocaleToggle />
      </div>

      <div className={styles.hero}>
        <h1 className={styles.title}>Recursive</h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </div>

      <section style={{ marginBottom: "32px" }}>
        <h2 className={styles.sectionTitle}>{t("playground")}</h2>
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>
          {t("playgroundDesc")}
        </p>
        <Link href="/visualize/custom" className={styles.customCard}>
          <div className={styles.customCardIcon}>{"</>"}</div>
          <div className={styles.customCardTitle}>{t("customCardTitle")}</div>
          <div className={styles.customCardDesc}>{t("customCardDesc")}</div>
        </Link>
      </section>

      {SECTIONS.map(({ category, titleKey, subKey }) => {
        const algorithms = getCardDataByCategory(category);
        if (algorithms.length === 0) return null;
        return (
          <section key={category} style={{ marginBottom: "32px" }}>
            <h2 className={styles.sectionTitle}>{t(titleKey)}</h2>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "16px" }}>{t(subKey)}</p>
            <div className={styles.grid}>
              {algorithms.map((algo) => (
                <AlgorithmCard key={algo.id} algorithm={algo} />
              ))}
            </div>
          </section>
        );
      })}

      <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px" }}>{t("comingSoon")}</p>

      <footer
        style={{
          textAlign: "center",
          paddingTop: "48px",
          paddingBottom: "24px",
          borderTop: "1px solid #1e293b",
          marginTop: "32px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "12px", fontSize: "13px" }}>
          <a href="https://github.com/oilater/recursive" target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>GitHub</a>
          <span style={{ color: "#334155" }}>·</span>
          <a href="https://github.com/oilater/recursive/issues" target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>{t("issues")}</a>
        </div>
        <p style={{ fontSize: "12px", color: "#475569" }}>© 2026 Seonghyeon Kim. All rights reserved.</p>
      </footer>
    </main>
  );
}
