# Recursive

[English](./README.md) | 한국어

**코드의 실행 흐름을, 한 줄씩 따라가세요.**

Recursive는 브라우저에서 동작하는 알고리즘 시각화 도구입니다. JavaScript / TypeScript 코드를 붙여넣으면 실행 흐름을 단계별로 보여주고, 재귀 함수는 호출 트리까지 시각화합니다.

[사용해보기 →](https://recursive-visualizer.vercel.app)

## 기능

### 플레이그라운드
JS/TS 코드를 붙여넣고 실행하면 함수와 매개변수를 자동으로 인식합니다.

- **라인별 추적** — 실행되는 코드 라인이 하나씩 하이라이트됩니다
- **변수 스냅샷** — 매 단계마다 변수 상태가 표시되고, 변경된 값은 강조됩니다
- **콘솔 캡처** — `console.log` 출력이 스텝별로 나타납니다
- **TypeScript 지원** — 타입은 자동으로 제거됩니다 (sucrase)

### 재귀 함수 지원
코드에 재귀가 포함되어 있으면 **호출 트리**를 실시간으로 빌드합니다.

- **호출 트리 시각화** — d3-hierarchy 기반 SVG 트리, 노드 크기 동적 조정
- **콜스택 패널** — 현재 재귀 깊이와 스택 프레임 확인
- **중첩 재귀 지원** — 예: `function solve() { function dfs() { ... dfs() ... } }`

### 프리셋 알고리즘
기본 인자가 포함된 알고리즘 프리셋이 제공됩니다.

- **순열 (Permutations)** — nPr, 백트래킹
- **조합 (Combinations)** — nCr, DFS
- **부분집합 (Subsets)** — 모든 부분집합 생성

모든 프리셋은 커스텀 코드와 동일한 파이프라인으로 실행됩니다.

## 작동 원리

```
사용자 코드 입력
  ↓
[1] TypeScript 타입 제거 (sucrase)
  ↓
[2] AST 파싱 (acorn) → 함수 탐지, 재귀 여부, 로컬 변수 추출
  ↓
[3] AST 변환 (astring)
    - 매 statement 앞에 __traceLine(라인, __captureVars()) 삽입
    - 재귀 함수 선언 후 __createProxy(func) 삽입
    - 루프에 __guard() 삽입 (무한 루프 방지)
  ↓
[4] Web Worker에서 실행 (샌드박스)
    - __traceLine → 라인 번호 + 변수 스냅샷으로 Step 생성
    - Proxy apply trap → TreeNode 호출 트리 빌드
    - console.log → 스텝별 캡처
  ↓
[5] { steps: Step[], tree: TreeNode } 반환
  ↓
[6] 시각화
    - CodePanel: Shiki 구문 하이라이팅 + 현재 라인 강조
    - TreeView: d3-hierarchy 레이아웃 + SVG 렌더링
    - VariablePanel: 변수 상태 + 변경 감지
    - StepperControls: 재생/정지/스텝/속도
    - CallStack: 현재 재귀 깊이
    - ResultPanel: 수집된 결과 + 콘솔 출력
```

### 단일 파이프라인
프리셋과 커스텀 코드는 동일한 실행 파이프라인(`executeCustomCode`)을 사용합니다. 프리셋은 `{ code, defaultArgs }` 데이터일 뿐입니다.

### 안전성
- Web Worker 격리 (DOM 접근 불가)
- `fetch`, `XMLHttpRequest`, `importScripts` 제거
- 5초 타임아웃, 5000회 호출 제한, 10만회 루프 제한

## 기술 스택

- **Next.js 16** (App Router) + **TypeScript**
- **Vanilla-Extract** — zero-runtime CSS-in-TS
- **d3-hierarchy** — 트리 레이아웃 계산
- **Shiki** — 코드 하이라이팅
- **acorn** + **astring** — AST 파싱 및 코드 생성
- **sucrase** — TypeScript 타입 제거
- **CodeMirror 6** — 코드 에디터
- **es-toolkit** — 유틸리티 함수
- **Vitest** — 테스트

## 프로젝트 구조

도메인 중심의 평탄한 구조입니다.

```
src/
├── app/              # 페이지 (Next.js 라우팅)
├── engine/           # 코드 추적 엔진 (분석, 변환, 실행, Worker)
├── algorithm/        # 프리셋 정의, 타입, 레지스트리, 카드 UI
├── visualizer/       # 시각화 컴포넌트 (TreeView, CodePanel, Stepper 등)
├── editor/           # 코드 입력 (CodeMirror 에디터, 인자 폼)
├── player/           # 재생 훅 (useAlgorithmPlayer)
└── shared/           # 스타일, UI 프리미티브, 유틸리티
```

## 개발

```bash
pnpm install
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm test         # vitest
pnpm fix          # oxlint + oxfmt
pnpm analyze      # 번들 분석
```

## 기여

버그 제보 및 기능 건의 → [GitHub Issues](https://github.com/oilater/recursive/issues)
