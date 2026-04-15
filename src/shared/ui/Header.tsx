"use client";

import { LocaleToggle } from "./LocaleToggle";
import * as styles from "./header.css";

interface HeaderProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ left, center, right }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>{left}</div>
      <div className={styles.center}>{center}</div>
      <div className={styles.right}>
        {right}
        <LocaleToggle />
      </div>
    </header>
  );
}
