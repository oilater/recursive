"use client";

import { LocaleToggle } from "./LocaleToggle";
import { GithubIcon, LogoIcon } from "./icons";
import * as styles from "./header.css";

interface HeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ left, center, right }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <a href="/" className={styles.logoLink}>
          <LogoIcon />
          <span className={styles.logoText}>Recursive</span>
        </a>
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
