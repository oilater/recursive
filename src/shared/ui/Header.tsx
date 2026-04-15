"use client";

import { useTranslations } from "next-intl";
import { LocaleToggle } from "./LocaleToggle";
import { GithubIcon, LogoIcon } from "./icons";
import { Link } from "@/i18n/navigation";
import * as styles from "./header.css";

interface HeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ left, center, right }: HeaderProps) {
  const t = useTranslations("home");

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <a href="/" className={styles.logoLink}>
          <LogoIcon size={28} />
          <span className={styles.logoText}>Recursive</span>
        </a>
        <nav className={styles.nav}>
          <Link href="/visualize/playground" className={styles.navLink}>
            {t("playground")}
          </Link>
          <Link href="/algorithms" className={styles.navLink}>
            {t("algorithms")}
          </Link>
        </nav>
        {left}
      </div>
      <div className={styles.center}>{center}</div>
      <div className={styles.right}>
        {right}
        <a
          href="https://github.com/oilater/recursive"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconLink}
        >
          <GithubIcon />
        </a>
        <LocaleToggle />
      </div>
    </header>
  );
}
