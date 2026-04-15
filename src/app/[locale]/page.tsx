import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/shared/ui";
import * as styles from "./home.css";

export default function Home() {
  const t = useTranslations("home");

  return (
    <main className={styles.page}>
      <Header />
      <div className={styles.hero}>
        <h1 className={styles.title}>
          Visualize your code,<br />
          <span className={styles.titleWhite}>line by line</span>
        </h1>
        <p className={styles.subtitle}>{t("subtitle")}</p>
      </div>

      <div className={styles.cardGrid}>
        <Link href="/visualize/playground" className={styles.homeCard}>
          <div className={styles.homeCardIcon}>{"</>"}</div>
          <div className={styles.homeCardTitle}>{t("playground")}</div>
          <div className={styles.homeCardDesc}>{t("playgroundDesc")}</div>
        </Link>

        <Link href="/algorithms" className={styles.homeCard}>
          <div className={styles.homeCardIcon}>▷</div>
          <div className={styles.homeCardTitle}>{t("algorithms")}</div>
          <div className={styles.homeCardDesc}>{t("algorithmsDesc")}</div>
        </Link>
      </div>

    </main>
  );
}
