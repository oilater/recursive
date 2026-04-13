"use client";

import * as styles from "./shared-ui.css";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return <div className={styles.emptyState}>{message}</div>;
}
