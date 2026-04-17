"use client";

import { useTranslations } from "next-intl";
import type { AlgorithmCardData } from "../types";
import { Badge } from "@/shared/ui";
import { Link } from "@/i18n/navigation";
import * as styles from "./algorithm-card.css";

interface AlgorithmCardProps {
  algorithm: AlgorithmCardData;
}

export function AlgorithmCard({ algorithm }: AlgorithmCardProps) {
  const t = useTranslations();
  return (
    <Link href={`/visualize/${algorithm.id}`} className={styles.card}>
      <div className={styles.name}>{t(`algorithm.${algorithm.id}.name`)}</div>
      <div className={styles.description}>{t(`algorithm.${algorithm.id}.description`)}</div>
      <div className={styles.footer}>
        <Badge variant={algorithm.difficulty}>{t(`difficulty.${algorithm.difficulty}`)}</Badge>
      </div>
    </Link>
  );
}
