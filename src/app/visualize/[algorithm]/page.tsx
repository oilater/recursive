import { notFound } from "next/navigation";
import { initializeAlgorithms } from "@/features/preset-algorithms";
import { getMeta } from "@/entities/algorithm";
import { highlightCode } from "@/shared/lib/shiki";
import { VisualizerClient } from "./VisualizerClient";
import Link from "next/link";
import * as styles from "./visualize-page.css";

initializeAlgorithms();

interface PageProps {
  params: Promise<{ algorithm: string }>;
}

export default async function VisualizePage({ params }: PageProps) {
  const { algorithm: algorithmId } = await params;
  const meta = getMeta(algorithmId);

  if (!meta) {
    notFound();
  }

  if (meta.isPremium) {
    return (
      <div className={styles.lockedContainer}>
        <div className={styles.lockedIcon}>🔒</div>
        <h1 className={styles.lockedTitle}>{meta.name}</h1>
        <p className={styles.lockedMessage}>이 알고리즘은 현재 준비 중입니다. 곧 만나보실 수 있습니다!</p>
        <Link href="/" className={styles.homeButton}>
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const codeHtml = await highlightCode(meta.code);

  return <VisualizerClient algorithmId={algorithmId} codeHtml={codeHtml} />;
}
