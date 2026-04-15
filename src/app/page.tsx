import Link from "next/link";
import { initializeAlgorithms } from "@/algorithm";
import { getCardDataByCategory, AlgorithmCard } from "@/algorithm";
import * as styles from "./home.css";

initializeAlgorithms();

const SECTIONS = [
  { category: "sorting" as const, title: "정렬", sub: "Sorting" },
  { category: "recursion" as const, title: "재귀 · 백트래킹", sub: "Recursion & Backtracking" },
];

export default function Home() {
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

      {SECTIONS.map(({ category, title, sub }) => {
        const algorithms = getCardDataByCategory(category);
        if (algorithms.length === 0) return null;
        return (
          <section key={category} style={{ marginBottom: "32px" }}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>{sub}</p>
            <div className={styles.grid}>
              {algorithms.map((algo) => (
                <AlgorithmCard key={algo.id} algorithm={algo} />
              ))}
            </div>
          </section>
        );
      })}

      <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px" }}>더 많은 알고리즘이 곧 업데이트될 예정이에요 ✨</p>

      <footer
        style={{
          textAlign: "center",
          paddingTop: "48px",
          paddingBottom: "24px",
          borderTop: "1px solid #1e293b",
          marginTop: "32px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "12px", fontSize: "13px" }}>
          <a href="https://github.com/oilater/recursive" target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>GitHub</a>
          <span style={{ color: "#334155" }}>·</span>
          <a href="https://github.com/oilater/recursive/issues" target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>이슈 & 건의</a>
        </div>
        <p style={{ fontSize: "12px", color: "#475569" }}>© 2026 Seonghyeon Kim. All rights reserved.</p>
      </footer>
    </main>
  );
}
