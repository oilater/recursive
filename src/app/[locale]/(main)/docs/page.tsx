import { getTranslations, getLocale } from "next-intl/server";
import { Header } from "@/shared/ui";
import { highlightCode } from "@/shared/lib/shiki";
import * as styles from "./docs.css";

const SITE = "https://recursive.oilater.com";

const BUBBLE_SORT_KO = `// 배열을 오름차순으로 정렬해서 리턴
//
// 풀이 전략
// 인접한 두 원소를 비교해서 큰 값을 뒤로 보낸다.
// 한 바퀴 돌 때마다 가장 큰 값이 맨 뒤에 확정된다.
// 시간복잡도: O(n^2)

function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      // 앞이 더 크면 교환
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}`;

const BUBBLE_SORT_EN = `// Sort the array in ascending order and return it
//
// Strategy
// Compare two adjacent elements and push the larger one back.
// After each pass, the largest value is fixed at the end.
// Time complexity: O(n^2)

function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      // Swap if the left is larger
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}`;

const PLAIN_JS = `const arr = [5, 3, 8, 1, 2];
let total = 0;
for (let i = 0; i < arr.length; i++) {
  total += arr[i];
}
console.log(total);`;

export default async function DocsPage() {
  const t = await getTranslations("docs");
  const locale = await getLocale();

  const bubbleSortCode = locale === "ko" ? BUBBLE_SORT_KO : BUBBLE_SORT_EN;
  const [bubbleHtml, plainJsHtml] = await Promise.all([
    highlightCode(bubbleSortCode, "javascript"),
    highlightCode(PLAIN_JS, "javascript"),
  ]);

  return (
    <main className={styles.page}>
      <Header />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>{t("heroTitle")}</h1>
        <p className={styles.heroSubtitle}>
          {t.rich("heroStar", {
            link: (chunks) => (
              <a href="https://github.com/oilater/recursive" target="_blank" rel="noopener noreferrer" className={styles.githubLink}>
                {chunks}
              </a>
            ),
          })}
          <br />
          {t.rich("heroSponsor", {
            link: (chunks) => (
              <a href="https://github.com/sponsors/oilater" target="_blank" rel="noopener noreferrer" className={styles.githubLink}>
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>

      {/* 1. 함수 붙여넣기 */}
      <section className={styles.section}>
        <h2 className={styles.stepTitle}><span className={styles.tipBadge}>Tip 1.</span> {t("tip1Title")}</h2>
        <p className={styles.stepDesc}>{t("tip1Desc")}</p>

        <div className={styles.example}>
          <h4 className={styles.blockTitle}>{t("tip1InputExample")}</h4>
          <div className={styles.codeBlock} dangerouslySetInnerHTML={{ __html: bubbleHtml }} />
          <h4 className={styles.blockTitle}>{t("tip1RunExample")}</h4>
          <p className={styles.blockHint}>{t("tip1Hint")}</p>
          <iframe
            src={`${SITE}/embed?preset=bubble-sort`}
            className={styles.embedFrame}
            title="Bubble Sort"
          />
        </div>

      </section>

      {/* 2. 일반 코드 */}
      <section className={styles.section}>
        <h2 className={styles.stepTitle}><span className={styles.tipBadge}>Tip 2.</span> {t("tip2Title")}</h2>
        <p className={styles.stepDesc}>{t("tip2Desc")}</p>

        <div className={styles.example}>
          <div className={styles.codeBlock} dangerouslySetInnerHTML={{ __html: plainJsHtml }} />
        </div>
      </section>

      {/* 3. 임베드 */}
      <section className={styles.section}>
        <h2 className={styles.stepTitle}><span className={styles.tipBadge}>Tip 3.</span> {t("tip3Title")}</h2>
        <p className={styles.stepDesc}>{t("tip3Desc")}</p>
        <pre className={styles.codeBlock}>
          {`<iframe src="${SITE}/embed?preset=bubble-sort"\n  width="100%" height="600"\n  style="border:none;border-radius:8px;" />`}
        </pre>
      </section>

      {/* 4. 지원 언어 */}
      <section className={styles.section}>
        <h2 className={styles.stepTitle}><span className={styles.tipBadge}>Tip 4.</span> {t("tip4Title")}</h2>
        <ul className={styles.list}>
          <li>{t("tip4Python")}</li>
          <li>{t("tip4Js")}</li>
        </ul>
      </section>

      {/* 5. 제한 사항 */}
      <section className={styles.section}>
        <h2 className={styles.stepTitle}><span className={styles.tipBadge}>Tip 5.</span> {t("limitsTitle")}</h2>
        <ul className={styles.list}>
          <li>{t("limit1")}</li>
          <li>{t("limit2")}</li>
          <li>{t("limit4")}</li>
          <li>{t("limit5")}</li>
          <li>{t("limit6")}</li>
          <li>{t("limit7")}</li>
        </ul>
      </section>

      {/* 6. 피드백 */}
      <section className={styles.section}>
        <h2 className={styles.stepTitle}><span className={styles.tipBadge}>Tip 6.</span> {t("tip6Title")}</h2>
        <p className={styles.stepDesc}>
          {t.rich("tip6Desc", {
            link: (chunks) => (
              <a href="https://github.com/oilater/recursive/issues" target="_blank" rel="noopener noreferrer" className={styles.githubLink}>
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>

      {/* 업데이트 로그 */}
      <div className={styles.changelogSection}>
        <h1 className={styles.heroTitle}>{t("changelogTitle")}</h1>
        <p className={styles.heroSubtitle}>
          {t.rich("changelogDesc", {
            link: (chunks) => (
              <a href="https://github.com/oilater/recursive/issues?q=is%3Aissue" target="_blank" rel="noopener noreferrer" className={styles.issueLink}>
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>

      <section className={styles.section}>
        <ul className={styles.list}>
          <li>{t("changelog6")}</li>
          <li>{t("changelog1")}</li>
          <li>{t("changelog2")}</li>
          <li>{t("changelog3")}</li>
          <li>{t("changelog4")}</li>
          <li>{t("changelog5")}</li>
        </ul>
      </section>
    </main>
  );
}
