"use client";

import Link from "next/link";
import type { AlgorithmCardData } from "./types";
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
  return (
    <Link href={`/visualize/${algorithm.id}`} className={styles.card}>
      <div className={styles.name}>{algorithm.name}</div>
      <div className={styles.description}>{algorithm.description}</div>
      <div className={styles.footer}>
        <Badge variant={algorithm.difficulty}>{difficultyLabels[algorithm.difficulty]}</Badge>
      </div>
    </Link>
  );
}
