"use client";

import Link from "next/link";
import type { AlgorithmCardData } from "../model/types";
import { Badge } from "@/shared/ui";
import * as styles from "./algorithm-card.css";

const difficultyLabels: Record<string, string> = {
  easy: "쉬움",
  medium: "보통",
  hard: "어려움",
};

interface AlgorithmCardProps {
  algorithm: AlgorithmCardData;
}

export function AlgorithmCard({ algorithm }: AlgorithmCardProps) {
  const label = difficultyLabels[algorithm.difficulty];

  if (algorithm.isPremium) {
    return (
      <div className={styles.lockedCard} onClick={() => alert("준비 중입니다! 곧 만나보실 수 있습니다.")}>
        <span className={styles.premiumBadge}>Premium</span>
        <div className={styles.name}>{algorithm.name}</div>
        <div className={styles.description}>{algorithm.description}</div>
        <div className={styles.footer}>
          <Badge variant={algorithm.difficulty}>{label}</Badge>
        </div>
        <div className={styles.lockOverlay}>🔒</div>
      </div>
    );
  }

  return (
    <Link href={`/visualize/${algorithm.id}`} className={styles.card}>
      <div className={styles.name}>{algorithm.name}</div>
      <div className={styles.description}>{algorithm.description}</div>
      <div className={styles.footer}>
        <Badge variant={algorithm.difficulty}>{label}</Badge>
      </div>
    </Link>
  );
}
