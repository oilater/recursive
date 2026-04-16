import { useTranslations } from "next-intl";
import { Header } from "@/shared/ui";
import { HomeEditor } from "./HomeEditor";
import * as styles from "./home.css";

export default function Home() {
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
      </div>

      <HomeEditor />
    </main>
  );
}
