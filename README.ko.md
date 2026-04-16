# Recursive

[English](./README.md) | 한국어

<img width="2400" height="1260" alt="og" src="https://github.com/user-attachments/assets/074c2b71-d776-4811-a012-d439209717fd" />

코드를 붙여넣으면 실행 흐름을 단계별로 보여줍니다. 라인 하이라이팅, 변수 추적, 재귀 호출 트리까지 시각화합니다.

[![사용해보기](https://img.shields.io/badge/%EC%82%AC%EC%9A%A9%ED%95%B4%EB%B3%B4%EA%B8%B0-recursive.oilater.com-38bdf8?style=for-the-badge&logo=vercel&logoColor=white)](https://recursive.oilater.com)

## 지원 언어

- Python
- JavaScript / TypeScript

## 기능

- 코드를 붙여 넣으면 입력 값 Input이 자동으로 생겨요
- 코드에 재귀 함수가 포함되어 있다면, 트리 구조로 시각화해줘요
- breakpoint를 찍지 않고도 편하게 디버깅할 수 있어요
- 현재 실행 라인에 하이라이트가 되고, 수동/자동 재생이 가능해요
- 함수 하나만 넣어도 실행되고, 그냥 일반 코드도 가능해요

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
