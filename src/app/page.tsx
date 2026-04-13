import Link from "next/link";
import { initializeAlgorithms } from "@/features/preset-algorithms";
import { getAllCardData, AlgorithmCard } from "@/entities/algorithm";
import * as styles from "./home.css";

initializeAlgorithms();

export default function Home() {
  const algorithms = getAllCardData();

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Recursive</h1>
        <p className={styles.subtitle}>
          알고리즘 코드를 붙여넣기만 하면 실행 흐름을 볼 수 있어요.
          <br />
          재귀라면 호출 트리까지 한눈에 확인할 수 있어요.
        </p>
      </div>

      <Link href="/visualize/custom" className={styles.customCard}>
        <div className={styles.customCardIcon}>{"</>"}</div>
        <div className={styles.customCardTitle}>여기에 코드를 적어보세요</div>
        <div className={styles.customCardDesc}>
          JS / TS를 지원하고, 함수와 매개변수를 자동으로 인식해요.
        </div>
      </Link>

      <section>
        <h2 className={styles.sectionTitle}>알고리즘</h2>
        <div className={styles.grid}>
          {algorithms.map((algo) => (
            <AlgorithmCard key={algo.id} algorithm={algo} />
          ))}
        </div>
      </section>
      <footer style={{ textAlign: "center", paddingTop: "32px", paddingBottom: "16px" }}>
        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.6 }}>
          버그 제보나 기능 건의는{" "}
          <a
            href="https://github.com/oilater/recursive/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#4ade80" }}
          >
            GitHub Issues
          </a>
          에 남겨주세요
        </p>
      </footer>
    </main>
  );
}
