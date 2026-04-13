import Link from "next/link";
import { initializeAlgorithms } from "@/features/preset-algorithms";
import { getFreeCardData, getPremiumCardData, AlgorithmCard } from "@/entities/algorithm";
import * as styles from "./home.css";

initializeAlgorithms();

export default function Home() {
  const freeAlgorithms = getFreeCardData();
  const premiumAlgorithms = getPremiumCardData();

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>재귀 시각화</h1>
        <p className={styles.subtitle}>
          재귀 알고리즘의 호출 흐름을 트리로 시각화하고, 단계별로 따라가며 학습하세요. 코딩테스트 필수 알고리즘을
          직관적으로 이해할 수 있습니다.
        </p>
      </div>

      <Link href="/visualize/custom" className={styles.customCard}>
        <div className={styles.customCardIcon}>{"</>"}</div>
        <div className={styles.customCardTitle}>내 코드 시각화</div>
        <div className={styles.customCardDesc}>
          직접 작성한 재귀 함수를 붙여넣고 호출 트리를 시각화해보세요. JavaScript 재귀 함수를 자동으로 분석합니다.
        </div>
      </Link>

      <section>
        <h2 className={styles.sectionTitle}>기본 재귀 & 백트래킹</h2>
        <p className={styles.sectionSub}>순열, 조합, 부분집합, N-Queen까지 — 재귀의 핵심을 시각적으로 학습하세요.</p>
        <div className={styles.grid}>
          {freeAlgorithms.map((algo) => (
            <AlgorithmCard key={algo.id} algorithm={algo} />
          ))}
        </div>
      </section>

      {premiumAlgorithms.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>고급 알고리즘 (준비중)</h2>
          <p className={styles.sectionSub}>분할정복, 스도쿠, DP 등 고급 알고리즘이 곧 추가됩니다.</p>
          <div className={styles.grid}>
            {premiumAlgorithms.map((algo) => (
              <AlgorithmCard key={algo.id} algorithm={algo} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
