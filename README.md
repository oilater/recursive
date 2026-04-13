# Recursive

알고리즘의 실행 흐름을 시각화하고, 한 줄씩 따라가며 학습하는 도구입니다.

## 주요 기능

### 프리셋 알고리즘

순열, 조합, 부분집합의 재귀 호출 트리를 시각화합니다. 각 스텝마다 코드 라인 하이라이트, 콜스택, 변수 상태, 결과 누적을 실시간으로 확인할 수 있습니다.

### 플레이그라운드

직접 작성한 JS/TS 코드를 붙여넣으면 실행 흐름을 자동으로 추적합니다.

- **재귀 코드**: 호출 트리 + 라인별 추적
- **비재귀 코드**: 라인별 추적 + 변수 스냅샷
- **함수 없는 코드**: 자동으로 래핑하여 추적
- **TypeScript**: sucrase로 타입 자동 제거 후 실행

## 구현 방식

### 코드 추적 파이프라인

```
사용자 코드 입력
    ↓
[1] sucrase로 TypeScript 타입 제거
    ↓
[2] acorn으로 AST 파싱 → 함수 탐지, 재귀 여부 판단, 로컬 변수 추출
    ↓
[3] AST 변환 (astring으로 코드 재생성)
    - 매 statement 앞에 __traceLine(라인번호, {변수들}) 삽입
    - 재귀 함수 선언 직후 Proxy 래핑 삽입
    - 루프에 __guard() 삽입 (무한 루프 방지)
    ↓
[4] Web Worker에서 격리 실행
    - __traceLine → 라인별 Step 생성 + 변수 스냅샷
    - Proxy apply trap → 재귀 호출 트리(TreeNode) 자동 빌드
    - console.log 캡처
    ↓
[5] { steps: Step[], tree: TreeNode } 반환
    ↓
[6] 시각화 컴포넌트에 연결
    - CodePanel: Shiki로 코드 하이라이팅 + 현재 라인 하이라이트
    - TreeView: d3-hierarchy로 트리 레이아웃 + SVG 렌더링
    - VariablePanel: 변수 상태 + 변경 하이라이트
    - StepperControls: Play/Pause/Step/Speed
    - ResultPanel: 결과 누적 표시
    - CallStack: 콜스택 시각화
```

### 프리셋 알고리즘

각 알고리즘은 `StepGenerator` 함수로 구현되어 있습니다. `parseLineMarkers`로 코드 문자열에서 `// @line:key` 마커를 파싱하여 라인 번호를 자동 매핑합니다. `step-factory`의 curried 함수(`createNodeFactory`, `createStepPushers`)로 보일러플레이트를 최소화합니다.

### 보안

- Web Worker에서 격리 실행 (DOM 접근 불가)
- `fetch`, `XMLHttpRequest`, `importScripts` 삭제
- 5초 타임아웃, 5000회 호출 제한, 10만회 루프 제한

## 기술 스택

- **Next.js 16** (App Router) + **TypeScript**
- **Vanilla-Extract** (zero-runtime CSS-in-TS)
- **d3-hierarchy** (트리 레이아웃 계산)
- **Shiki** (코드 하이라이팅)
- **acorn** + **astring** (AST 파싱/생성)
- **sucrase** (TS 타입 제거)
- **CodeMirror 6** (코드 에디터)
- **es-toolkit** (유틸리티)

## 프로젝트 구조 (FSD)

```
src/
├── app/                          # Pages
├── entities/
│   ├── algorithm/                # 알고리즘 도메인 (타입, 레지스트리, step-factory)
│   └── custom-code/              # 코드 분석/변환 (analyzer, transformer, executor)
├── features/
│   ├── preset-algorithms/        # 프리셋 알고리즘 구현
│   ├── custom-code/              # 코드 에디터 UI
│   ├── player/                   # 재생 훅
│   └── visualizer/               # 시각화 컴포넌트
└── shared/
    ├── lib/                      # 유틸리티
    ├── ui/                       # 공용 UI (Badge, PanelHeader, ResizeHandle)
    └── styles/                   # 테마, 글로벌 스타일
```

## 개발

```bash
pnpm install
pnpm dev          # 개발 서버
pnpm build        # 프로덕션 빌드
pnpm fix          # oxlint + prettier
pnpm analyze      # 번들 분석
```

## 기여

버그 제보나 기능 건의는 [GitHub Issues](https://github.com/oilater/recursive/issues)에 남겨주세요.
