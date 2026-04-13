"use client";

import * as styles from "./shared-ui.css";

interface PanelHeaderProps {
  title: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PanelHeader({ title, action }: PanelHeaderProps) {
  return (
    <div className={styles.panelHeader}>
      <span className={styles.panelHeaderTitle}>{title}</span>
      {action && (
        <button className={styles.panelHeaderAction} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
