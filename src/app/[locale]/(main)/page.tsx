import { use } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Header } from "@/shared/ui";
import { Link } from "@/i18n/navigation";
import { HomeEditorLoader } from "./HomeEditorLoader";
import * as styles from "./home.css";

export default function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();

  return (
    <main className={styles.page}>
      <Header />
      <div className={styles.hero}>
        <h1 className={styles.title}>
          Watch your code run,<br />
          <span className={styles.titleWhite}>step by step.</span>
        </h1>
        <p className={styles.subtitle}>{t("home.subtitle")}</p>
        <Link href="/docs" className={styles.docsLink}>
          {t("home.docsGuide")}
        </Link>
      </div>

      <HomeEditorLoader />
    </main>
  );
}
