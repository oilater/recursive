"use client";

import { useTranslations } from "next-intl";
import * as styles from "./footer.css";

export function Footer() {
  const t = useTranslations("home");

  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <a href="https://github.com/oilater/recursive" target="_blank" rel="noopener noreferrer">GitHub</a>
        <span className={styles.dot}>·</span>
        <a href="https://github.com/oilater/recursive/issues" target="_blank" rel="noopener noreferrer">{t("issues")}</a>
        <span className={styles.dot}>·</span>
        <a href="https://www.linkedin.com/in/seonghyeonkim" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>
      <p className={styles.copy}>© 2026 Seonghyeon Kim. All rights reserved.</p>
    </footer>
  );
}
