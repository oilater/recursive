# Recursive

[English](./README.md) | 한국어

**코드의 실행 흐름을, 한 줄씩 따라가세요.**

JavaScript / TypeScript 코드를 붙여넣으면 실행 흐름을 단계별로 보여줍니다. 재귀 함수는 호출 트리까지 시각화합니다.

[![사용해보기](https://img.shields.io/badge/%EC%82%AC%EC%9A%A9%ED%95%B4%EB%B3%B4%EA%B8%B0-recursive--ochre.vercel.app-38bdf8?style=for-the-badge&logo=vercel&logoColor=white)](https://recursive-ochre.vercel.app)

## 기능

- **라인별 실행 추적** — 실행 중인 코드 라인이 하이라이트됩니다
- **변수 추적** — 매 단계마다 변수 상태를 확인하고, 변경된 값은 강조됩니다
- **호출 트리** — 재귀 함수의 호출 구조를 트리로 시각화합니다
- **콘솔 출력** — `console.log` 결과가 스텝별로 나타납니다
- **TypeScript 지원** — 타입은 자동으로 제거됩니다
- **설정 없이 바로 사용** — 코드 붙여넣고, 인자 입력하고, 실행

## 사용 방법

1. [플레이그라운드](https://recursive-ochre.vercel.app/visualize/custom)에 접속합니다
2. 코드를 붙여넣습니다 (함수 또는 일반 코드 모두 가능)
3. 함수에 인자가 필요하면 입력합니다
4. **▶ 실행**을 클릭합니다
5. 컨트롤로 한 단계씩 이동하거나 재생합니다

홈 페이지에서 정렬, 재귀/백트래킹 등 카테고리별 프리셋 알고리즘도 사용할 수 있습니다.

## 알고리즘 추가하기

1. `src/algorithm/presets/codes/`에 `.js` 파일을 추가합니다
2. 해당 카테고리 파일(`recursion.ts`, `sorting.ts`)에 메타데이터를 등록합니다:

```ts
{
  id: "selection-sort",
  name: "선택 정렬 (Selection Sort)",
  description: "가장 작은 원소를 찾아 앞으로 보냅니다",
  difficulty: "easy",
  category: "sorting",
  defaultArgs: [[5, 3, 8, 1, 2]],
  code: loadCode("selection-sort.js"),
}
```

## 프로젝트 구조

```
src/
├── algorithm/        # 프리셋 알고리즘 정의 및 레지스트리
│   └── presets/
│       └── codes/    # 알고리즘 소스 파일 (.js)
├── engine/           # AST 분석, 변환, Worker 실행
├── editor/           # CodeMirror 에디터, ArgumentForm
├── player/           # 스텝 재생 (useAlgorithmPlayer)
├── visualizer/       # TreeView, CodePanel, CallStack, VariablePanel
├── shared/           # 테마, 유틸, 공통 UI
└── app/              # Next.js 라우트
```

## 기술 스택

Next.js · TypeScript · Vanilla-Extract · acorn · Shiki · d3-hierarchy · CodeMirror · Web Workers

## 개발

```bash
pnpm install
pnpm dev
pnpm test
pnpm fix          # oxlint + oxfmt
```

## 기여

버그 제보 및 기능 건의 → [GitHub Issues](https://github.com/oilater/recursive/issues)

## 라이선스

MIT
