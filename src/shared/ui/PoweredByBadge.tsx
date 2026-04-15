import { LogoIcon } from "./icons";
import * as styles from "./powered-by-badge.css";

export function PoweredByBadge() {
  return (
    <a
      href="https://recursive-ochre.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.badge}
    >
      <LogoIcon size={14} />
      <span>Powered by Recursive</span>
    </a>
  );
}
