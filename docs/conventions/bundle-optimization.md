# 번들 최적화 — 측정 → 개선 → 재측정

## 핵심 원칙

**감으로 최적화하지 않는다.** 항상 **측정 → 가설 → 개선 → 재측정** 사이클을 돌린다. 측정 없이 손대면 노력 대비 효과를 모르고, 잘못된 곳을 고칠 가능성도 크다.

---

## 측정 도구

이 프로젝트는 `@next/bundle-analyzer`가 이미 설정돼 있다. 한 줄로 실행:

```bash
ANALYZE=true pnpm build
# 또는
pnpm analyze
```

빌드 끝나면 자동으로 브라우저에 시각화가 뜬다 (`.next/analyze/client.html`). 각 청크에 어떤 모듈이 얼마만큼 들어있는지 한눈에 보임.

빠른 수치 비교용 커맨드:

```bash
# 전체 정적 자산 크기
du -sh .next/static .next/static/chunks

# 상위 청크 15개
find .next/static/chunks -name "*.js" -exec ls -l {} \; | sort -k5 -n -r | head -15 | awk '{print $5, $9}'
```

청크에 뭐가 들었는지 빠르게 추정:

```bash
strings .next/static/chunks/<청크파일>.js | grep -oE '@?[a-z][a-z0-9-]*/[a-z][a-z0-9-]*' | sort -u | head -10
```

---

## 1차 사이클 기록 (2026-04-18)

### Baseline 측정

```
static/      15 MB
chunks/      12 MB
top chunks:  780 KB, 622 KB, 550 KB, 402 KB, 262 KB
```

### 가설 1: Barrel re-export로 인한 side-effect 누수

`package.json`에 `"sideEffects"` 필드가 없으면 Webpack은 모든 모듈에 side-effect 있다고 가정. 보수적으로 보존하느라 tree-shaking 무력화.

**조치**: `package.json`에 sideEffects 명시.

```json
{
  "sideEffects": [
    "*.css",
    "*.css.ts",
    "src/algorithm/presets/**",
    "src/i18n/**"
  ]
}
```

CSS 등록(vanilla-extract)과 preset 등록(`registerAlgorithm()` top-level call)은 진짜 side-effect라 보존, 그 외는 자유롭게 tree-shake.

**효과**: 거의 없음 (12MB → 12MB). 우리 코드는 이미 깔끔했고 큰 손실은 없었음. 하지만 hygiene 차원에서 유지.

### 가설 2: Shiki가 모든 언어 grammar를 번들링

`bba11add` 청크(764KB) 안에 emacs/org-mode 같은 정체불명 문자열이 있었음. Shiki가 우리는 JS/Python만 쓰는데 모든 언어를 끌어오는 정황.

확인:

```ts
// before
import { createHighlighter } from "shiki";

createHighlighter({
  themes: ["github-dark"],
  langs: ["javascript", "python"],  // 런타임 옵션이지만 빌드 단계에서는 모두 포함
});
```

`from "shiki"`는 모든 bundled lang/theme를 정적으로 그래프에 끌어옴. 런타임에 두 개만 쓴다고 알려도 빌드 시점엔 다 묶인다.

**조치**: Shiki modular imports로 전환.

```ts
// after
import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

createHighlighterCore({
  themes: [import("shiki/themes/github-dark.mjs")],
  langs: [
    import("shiki/langs/javascript.mjs"),
    import("shiki/langs/python.mjs"),
  ],
  engine: createOnigurumaEngine(import("shiki/wasm")),
});
```

각 lang/theme를 dynamic import로 선언 → 명시한 것만 번들에 포함. Oniguruma WASM 엔진도 lazy chunk로 분리.

**효과**: 폭발적.

### Re-measurement

| 지표 | Before | After | 변화 |
|---|---|---|---|
| `static/` 전체 | 15 MB | 6.4 MB | **-57%** |
| `chunks/` 전체 | 12 MB | 3.1 MB | **-74%** |
| 최대 청크 | 780 KB | 622 KB | -20% |
| 550 KB / 402 KB 청크 | 있음 | 사라짐 | — |

780KB짜리 "all shiki langs" 청크와 550KB짜리 동반 청크가 통째로 사라짐.

### 남은 큰 청크 분석

- `cbc37962` (608KB) — Oniguruma WASM + glue. **lazy-load라 첫 페이지 로드엔 안 들어감.** 정당.
- `5978` (292KB) — `@codemirror/state`. 에디터 본체 정당 비용.
- `7878` (220KB) — Acorn/Sucrase 파서. JS engine 작업에 필요.
- `8334` (220KB) — Next.js framework + dev errors.

**다음 사이클 후보:**
1. CodeMirror lazy-load — 에디터 없는 라우트(`/algorithms`, `/embed`)에서 제외
2. CodeEditor를 `next/dynamic`으로 split → 초기 로드에서 빠짐

---

## 일반화: 어떤 라이브러리가 번들에 큰 부담을 주는가

### 시그널 (의심해볼 패턴)

- **단일 청크가 500KB+** → 한 vendor 라이브러리가 통째로 들어왔을 가능성
- **언어/테마/플러그인을 런타임에 선택하는 라이브러리** (Shiki, Highlight.js, Prettier, Babel parsers) → 보통 빌드 시점에 모든 옵션을 정적으로 포함
- **Polyfill / WASM glue** → 큰 baseline 비용 (Oniguruma, Pyodide, jsPDF 등)
- **DateTime / i18n 라이브러리** → 모든 locale 데이터 (moment, full-icu)

### 대응 패턴

1. **Modular subpath import** — 라이브러리가 `lib/core` + `lib/foo` + `lib/bar`로 나뉘어 있으면 그것을 사용
2. **Dynamic import** — 라우트별 lazy load (`next/dynamic`, `import()`)
3. **번들에서 제외** — Pyodide처럼 거대한 런타임은 worker로 격리 (이미 우리 프로젝트에서 함)
4. **Tree-shake 친화적 대체 라이브러리** — `lodash` → `lodash-es` / `es-toolkit`

---

## 절차 — 새 라이브러리 도입할 때

1. 도입 직전 baseline 측정 (`pnpm analyze` + 청크 크기 기록)
2. 추가 후 재측정
3. **상위 청크에 새 라이브러리 이름이 보이면 modular subpath / dynamic import 검토**
4. 200KB+ 추가 비용은 PR 설명에 명시 — 누가 봐도 알 수 있게

---

## 자동화 — PR 단위 회귀 방지

`.github/workflows/ci.yml`의 `bundle-size` 잡이 매 PR마다 다음을 자동 실행:

1. PR 브랜치 빌드 → 크기 스냅샷
2. base 브랜치(main) 빌드 → 크기 스냅샷
3. 두 결과 비교 → PR에 코멘트 자동 게시 (기존 코멘트 있으면 갱신)

코멘트 예시:

```
| Metric      | Base   | PR     | Δ                       |
| ----------- | ------ | ------ | ----------------------- |
| Total static| 6.40 MB| 6.55 MB| ⚠️ +153 KB (+2.4%)      |
| JavaScript  | 3.10 MB| 3.20 MB| ⚠️ +102 KB (+3.3%)      |
| CSS         | 120 KB | 121 KB | ✅ +1 KB (+0.8%)        |
```

아이콘 의미:
- ✅ 변화 없음 또는 감소
- ⚠️ 50KB 미만 증가
- 🚨 50KB 이상 증가 — PR 설명에 사유 필요

**왜 50KB 임계?** 사람이 코드 한 줄 추가로 만들 수 있는 최대 합리적 크기. 그 이상이면 라이브러리 추가, polyfill, asset 포함 등 의식적 결정이 들어간 것이므로 명시적 정당화 요구.

---

## 참고

- [Next.js bundle analyzer docs](https://nextjs.org/docs/pages/guides/package-bundling)
- [Webpack `sideEffects` 가이드](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free)
- [Shiki bundling guide](https://shiki.style/guide/bundles) — modular imports 공식 가이드
- 우리 프로젝트의 1차 사이클 결과: `refactor/barrel-export-cleanup` PR
