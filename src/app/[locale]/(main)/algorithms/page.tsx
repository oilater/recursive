import { useTranslations } from "next-intl";
import { getCardDataByCategory } from "@/algorithm";
import { initializeAlgorithms } from "@/algorithm/presets";
import { AlgorithmCard } from "@/algorithm/ui/AlgorithmCard";
import { Header } from "@/shared/ui";
import * as styles from "./algorithms.css";

initializeAlgorithms();

const SECTIONS = [
  { category: "sorting" as const, titleKey: "sorting" as const, subKey: "sortingSub" as const },
  { category: "recursion" as const, titleKey: "recursion" as const, subKey: "recursionSub" as const },
];

export default function AlgorithmsPage() {
  const t = useTranslations("home");

  return (
    <main className={styles.page}>
      <Header />
      <div className={styles.hero}>
        <h1 className={styles.title}>{t("algorithms")}</h1>
        <p className={styles.subtitle}>{t("algorithmsDesc")}</p>
      </div>

      {SECTIONS.map(({ category, titleKey, subKey }) => {
        const algorithms = getCardDataByCategory(category);
        if (algorithms.length === 0) return null;
        return (
          <section key={category} style={{ marginBottom: "32px" }}>
            <h2 className={styles.sectionTitle}>{t(titleKey)}</h2>
            <p className={styles.sectionDesc}>{t(subKey)}</p>
            <div className={styles.grid}>
              {algorithms.map((algo) => (
                <AlgorithmCard key={algo.id} algorithm={algo} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
