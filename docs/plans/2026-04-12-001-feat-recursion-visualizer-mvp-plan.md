---
title: "feat: Recursion Algorithm Visualizer MVP"
type: feat
status: active
date: 2026-04-12
origin: docs/brainstorms/recursion-visualizer-requirements.md
deepened: 2026-04-12
---

# feat: Recursion Algorithm Visualizer MVP

## Overview

코딩테스트 준비생을 위한 재귀 알고리즘 시각화 학습 사이트 MVP를 구축한다. 순열, 조합, 부분집합, N-Queen의 재귀 호출 트리를 단계별로 시각화하고, 코드 하이라이트와 동기화된 인터랙티브 스테퍼를 제공한다.

## Problem Frame

코딩테스트 준비생들이 재귀의 호출 흐름(분기, 백트래킹)을 코드만으로 이해하기 어렵다. 트리 시각화 + 코드 연동 + 단계별 스테핑으로 직관적 학습을 지원한다. (see origin: `docs/brainstorms/recursion-visualizer-requirements.md`)

## Requirements Trace

- R1. 순열/조합/부분집합/N-Queen의 재귀 호출 트리를 단계별 시각화
- R2. 코드 하이라이트와 시각화 동기화
- R3. 스테퍼로 앞뒤 이동 (Play/Pause/Forward/Backward/속도 조절)
- R4. 사용자 입력값 변경 시 시각화 즉시 반영
- R5. 변수 상태 실시간 표시 (알고리즘별 상이)
- R6. 유료 섹션 잠금 UI 표시 (결제 미구현, UI만)

## Scope Boundaries

- 사용자 인증/로그인 없음
- 결제 시스템 미구현 — **Premium 잠금 UI는 순수 시각 표시 전용** (모든 사용자에게 동일하게 잠금 표시, 해제 메커니즘 없음)
- 사용자 코드 에디터 없음 (읽기 전용 코드)
- 데스크톱 우선, 모바일 최적화 없음
- 스도쿠 제외 (트리 크기 문제)
- 다국어 미지원 (한국어 전용)

### 알고리즘별 입력 크기 제한

| 알고리즘 | 최대 입력 | 최대 리프 노드 수 |
|---------|----------|-----------------|
| 순열 | 6개 요소 | 720 |
| 조합 | n ≤ 8, r ≤ n | 70 (C(8,4)) |
| 부분집합 | 8개 요소 | 256 |
| N-Queen | N = 4~8 | 92 (N=8) |

### 알고리즘별 기본 입력값

| 알고리즘 | 기본 입력 |
|---------|----------|
| 순열 | `[1, 2, 3]` |
| 조합 | `n=4, r=2` |
| 부분집합 | `[1, 2, 3]` |
| N-Queen | `n=4` |

## Context & Research

### Relevant Patterns and Libraries

- **d3-hierarchy** (~3.5KB gzipped): Reingold-Tilford 트리 레이아웃 계산 전용. DOM 의존성 없음. `tree().nodeSize([dx, dy])`로 일관된 노드 간격 유지.
- **Shiki** (~15KB core): Next.js Server Component에서 빌드 타임 코드 하이라이팅. `data-line` attribute transformer로 라인별 제어, 런타임에서는 CSS 클래스 토글만.
- **Vanilla-Extract**: 정적 스타일은 `.css.ts`, 동적 값(SVG 노드 위치, 하이라이트)은 `assignInlineVars` 또는 inline style 사용.
- **React SVG**: d3-hierarchy로 좌표 계산 후 React `<svg>` 엘리먼트로 직접 렌더링. react-d3-tree 등 래핑 라이브러리 사용하지 않음 (커스터마이징 제약).

### External References

- [VisuAlgo](https://visualgo.net) - 코드 라인 트레이싱 프레임워크 참고
- [d3-hierarchy tree API](https://d3js.org/d3-hierarchy/tree)
- [Shiki Decorations API](https://shiki.style/guide/decorations)
- [Vanilla-Extract dynamic package](https://vanilla-extract.style/documentation/packages/dynamic/)

## Key Technical Decisions

- **SVG (React 직접 렌더링) vs Canvas**: SVG 선택. React 선언적 렌더링과 자연스럽게 통합되고, 노드별 개별 스타일링/이벤트 처리가 용이. Step Backward가 O(1) (상태 인덱스 변경만으로 리렌더).
- **d3-hierarchy vs 직접 레이아웃 구현**: d3-hierarchy 사용. Reingold-Tilford 알고리즘이 이미 O(n) 최적화되어 있고, 커스텀 구현 대비 신뢰성 높음.
- **전체 스텝 사전 계산 vs 지연 계산**: 사전 계산. 입력 크기 제한(순열 6, 조합/부분집합 8, N-Queen 8)으로 메모리 안전하고, Step Backward가 단순 인덱스 접근.
- **Shiki 런타임 하이라이팅 vs CSS 토글**: CSS 토글 방식. Shiki 토큰화는 한 번만 실행, 이후 `data-line` 기반 CSS 클래스 토글로 성능 확보.
- **트리 레이아웃 모드**: `tree.nodeSize([80, 100])`으로 일관된 간격. 트리 크기에 따라 viewBox가 자동 확장되고 컨테이너 스크롤로 대응.

## Open Questions

### Resolved During Planning

- **대형 트리 처리**: 활성 브랜치 강조 + 비활성 브랜치 투명도 감소(opacity 0.2)로 가독성 확보. 입력 크기 제한으로 노드 수 관리 가능.
- **N-Queen 시각화**: 트리 노드 안에 미니 보드를 표시하지 않고, 별도 보드 패널을 추가하여 현재 보드 상태를 보여줌.

### Deferred to Implementation

- SVG viewBox 자동 패닝의 **패딩/줌 레벨** 세부 파라미터는 실제 트리 크기를 보고 조정 (패닝 자체는 필수 구현)
- 애니메이션 트랜지션 duration 값은 실제 사용감 테스트 후 결정
- 페이지 초기 로드 시 기본 입력값으로 자동 생성된 steps가 비어있을 가능성 없음 (기본값이 항상 유효)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─────────────────────────────────────────────────────────┐
│  Algorithm Registry                                      │
│  { id, name, description, code, stepGenerator, config }  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  StepGenerator (pure function per algorithm)             │
│  (input) → { steps: Step[], tree: TreeNode }             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  useAlgorithmPlayer (React hook)                         │
│  manages: currentIndex, isPlaying, speed                 │
│  exposes: currentStep, controls                          │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┬──────────────┐
       ▼               ▼               ▼              ▼
  CodePanel       TreeView      VariablePanel   StepperControls
  (Shiki HTML +   (d3-hierarchy  (step.variables  (play/pause/
   line CSS)       + React SVG)   렌더링)         step/speed)
```

**데이터 흐름**: 사용자 입력 → StepGenerator 실행 → steps[] + tree 생성 → useAlgorithmPlayer가 currentIndex 관리 → 모든 패널이 `steps[currentIndex]`를 구독하여 동기 렌더링.

**알고리즘 추가 패턴**: `StepGenerator` 함수 하나 + 알고리즘 레지스트리에 등록만으로 새 알고리즘 시각화 가능.

## Implementation Units

- [ ] **Unit 1: 프로젝트 스캐폴딩**

**Goal:** Next.js + TypeScript + Vanilla-Extract 프로젝트 초기 설정

**Requirements:** 모든 요구사항의 기반

**Dependencies:** None

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/styles/theme.css.ts`
- Create: `src/styles/global.css.ts`

**Approach:**
- `create-next-app`으로 초기화 후 Vanilla-Extract 플러그인 설정
- 디자인 토큰 정의: 색상(primary, bg, text, highlight, muted, success, error), 간격, 폰트 크기, 라운딩
- App Router 기반, `src/` 디렉토리 사용
- 의존성: `@vanilla-extract/css`, `@vanilla-extract/dynamic`, `@vanilla-extract/recipes`, `@vanilla-extract/next-plugin`, `d3-hierarchy`, `shiki`

**Test expectation: none** -- 프로젝트 설정 및 스캐폴딩, 동작 확인은 dev server 기동으로 검증

**Verification:**
- `npm run dev`로 로컬 서버 정상 기동
- Vanilla-Extract 스타일이 적용된 기본 페이지 렌더링

---

- [ ] **Unit 2: 실행 엔진 - 타입 정의 및 코어**

**Goal:** Step, TreeNode, AlgorithmConfig 등 핵심 타입과 알고리즘 레지스트리 구조 정의

**Requirements:** R1, R2, R3, R5

**Dependencies:** Unit 1

**Files:**
- Create: `src/types/algorithm.ts`
- Create: `src/lib/algorithms/registry.ts`
- Test: `src/lib/algorithms/__tests__/registry.test.ts`

**Approach:**
- `Step` 인터페이스: `{ id, type: 'call' | 'return', codeLine, activeNodeId, activePath: string[], variables, description }`
- `TreeNode` 인터페이스: `{ id, label, args, children, status: 'idle' | 'active' | 'completed' | 'backtracked' }`. `'backtracked'`는 N-Queen처럼 가지치기가 발생하는 알고리즘에서 해가 없어 복귀한 노드에 적용. 순열/조합/부분집합은 모든 경로를 탐색하므로 `'completed'`만 사용.
- `AlgorithmConfig`: `{ id, name, description, difficulty, code, inputConfig, stepGenerator, isPremium }`
- 알고리즘 레지스트리: `AlgorithmConfig[]`를 export, `getAlgorithm(id)` 헬퍼

**Patterns to follow:**
- TypeScript discriminated union으로 Step type 구분
- 알고리즘별 variables는 제네릭이 아닌 `Record<string, unknown>`으로 단순화

**Test scenarios:**
- Happy path: `getAlgorithm('permutations')` 호출 시 해당 config 반환
- Edge case: `getAlgorithm('nonexistent')` 호출 시 undefined 반환
- Happy path: 레지스트리에 모든 MVP 알고리즘(4개) 등록 확인

**Verification:**
- 타입이 컴파일 에러 없이 정의됨
- 레지스트리에서 알고리즘 조회 동작

---

- [ ] **Unit 3: Step Generator - 순열**

**Goal:** 순열 알고리즘의 StepGenerator 구현 (첫 번째 알고리즘, 패턴 확립)

**Requirements:** R1, R2, R5

**Dependencies:** Unit 2

**Files:**
- Create: `src/lib/algorithms/permutations.ts`
- Test: `src/lib/algorithms/__tests__/permutations.test.ts`

**Approach:**
- 입력: `number[]` (최대 6개)
- 재귀 실행하며 각 호출/리턴마다 Step 스냅샷 생성
- 동시에 TreeNode 구조도 빌드
- variables에 포함: `current` (현재 선택 배열), `remaining` (남은 요소), `depth` (재귀 깊이)
- 코드 라인 번호는 표시할 pseudocode의 라인과 매핑

**Patterns to follow:**
- Step.variables는 매 스텝마다 deep copy (불변 스냅샷)
- TreeNode.id는 스텝 순서 기반 유니크 ID

**Test scenarios:**
- Happy path: `[1,2,3]` 입력 → 6개 리프(완성된 순열), steps 배열에 call/return 쌍이 올바르게 생성
- Happy path: `[1]` 입력 → 1개 순열, 최소 스텝 수 확인
- Edge case: `[1,2]` 입력 → 2개 순열, 트리 구조가 depth 2로 정확
- Happy path: 각 step의 `codeLine`이 유효한 라인 번호 범위 내
- Happy path: 각 step의 `activePath`가 root에서 현재 노드까지의 경로
- Integration: steps의 마지막 step은 root 노드의 return이어야 함

**Verification:**
- 테스트 통과
- `[1,2,3]` 입력 시 생성된 steps를 콘솔 출력하여 call/return 순서가 재귀 흐름과 일치하는지 확인 가능

---

- [ ] **Unit 4: Step Generator - 조합, 부분집합, N-Queen**

**Goal:** 나머지 3개 알고리즘의 StepGenerator 구현

**Requirements:** R1, R2, R5

**Dependencies:** Unit 3 (패턴 확립 후)

**Files:**
- Create: `src/lib/algorithms/combinations.ts`
- Create: `src/lib/algorithms/subsets.ts`
- Create: `src/lib/algorithms/n-queen.ts`
- Test: `src/lib/algorithms/__tests__/combinations.test.ts`
- Test: `src/lib/algorithms/__tests__/subsets.test.ts`
- Test: `src/lib/algorithms/__tests__/n-queen.test.ts`

**Approach:**
- **조합**: 입력 `(n, r)`, variables에 `current`, `startIndex`, `depth`
- **부분집합**: 입력 `number[]`, variables에 `current`, `index`, `depth`
- **N-Queen**: 입력 `n` (4~8), variables에 `board` (2D 배열), `row`, `col`, `queensPlaced`. 별도 보드 시각화용 데이터 포함
- 모두 Unit 3의 순열과 동일한 Step/TreeNode 패턴 따름

**Test scenarios:**
- Happy path (조합): `C(4,2)` → 6개 조합 리프 노드
- Happy path (부분집합): `[1,2,3]` → 8개 부분집합(2^3) 리프 노드
- Happy path (N-Queen): `n=4` → 2개 해 발견
- Edge case (N-Queen): `n=4` → 백트래킹 step이 존재 (퀸 충돌 시 return)
- Happy path: 각 알고리즘의 steps 첫 step이 `type: 'call'`, 마지막 step이 `type: 'return'`

**Verification:**
- 모든 테스트 통과
- 각 알고리즘의 결과 수가 수학적으로 정확

---

- [ ] **Unit 5: useAlgorithmPlayer 훅**

**Goal:** 스테퍼 상태 관리 훅 (play/pause, step forward/backward, 속도 조절)

**Requirements:** R3

**Dependencies:** Unit 2 (Step 타입)

**Files:**
- Create: `src/hooks/useAlgorithmPlayer.ts`
- Test: `src/hooks/__tests__/useAlgorithmPlayer.test.ts`

**Approach:**
- 상태: `currentIndex`, `isPlaying`, `speed` (0.5x ~ 4x)
- `stepForward`: `min(currentIndex + 1, steps.length - 1)`
- `stepBackward`: `max(currentIndex - 1, 0)`
- `jumpTo(index)`: 슬라이더나 트리 노드 클릭 시 특정 스텝으로 이동
- `isPlaying`일 때 `setInterval`로 자동 진행, 마지막 스텝 도달 시 자동 정지
- `reset`: 입력 변경 시 `currentIndex = 0`, `isPlaying = false`로 초기화

**Test scenarios:**
- Happy path: stepForward 호출 시 currentIndex 1 증가
- Happy path: stepBackward 호출 시 currentIndex 1 감소
- Edge case: 첫 스텝에서 stepBackward → currentIndex 0 유지
- Edge case: 마지막 스텝에서 stepForward → currentIndex 변화 없음
- Happy path: isPlaying true 시 자동 진행, 마지막 스텝 도달 시 isPlaying false
- Happy path: jumpTo(5) 호출 시 currentIndex가 5로 이동
- Happy path: reset 호출 시 currentIndex 0, isPlaying false

**Verification:**
- 테스트 통과

---

- [ ] **Unit 6: 트리 시각화 컴포넌트 (SVG)**

**Goal:** d3-hierarchy로 레이아웃 계산 + React SVG로 재귀 호출 트리 렌더링

**Requirements:** R1

**Dependencies:** Unit 2 (TreeNode 타입)

**Files:**
- Create: `src/lib/tree-layout.ts`
- Create: `src/components/tree-view/TreeView.tsx`
- Create: `src/components/tree-view/TreeNode.tsx`
- Create: `src/components/tree-view/TreeEdge.tsx`
- Create: `src/components/tree-view/tree-view.css.ts`
- Test: `src/lib/__tests__/tree-layout.test.ts`

**Approach:**
- `computeTreeLayout(rootNode)`: d3-hierarchy의 `tree().nodeSize([80, 100])`으로 좌표 계산
- `TreeView`: SVG 컨테이너. `viewBox` 동적 계산 (전체 트리 bounds). **활성 노드 자동 패닝 필수** — 순열 6개(720 리프, ~57,600px 폭) 트리에서 활성 노드를 수동 스크롤로 찾는 것은 불가능. `viewBox`를 활성 노드 중심으로 이동시키고, CSS transition으로 부드럽게 전환.
- `TreeNode`: `<g>` 안에 `<circle>` + `<text>`. 상태별 색상: idle(회색), active(노란색), completed(초록), backtracked(빨강 계열)
- `TreeEdge`: 노드 간 연결선. 활성 경로는 굵고 밝게, 비활성은 반투명
- 활성 브랜치 강조: `activePath` Set에 포함된 노드/엣지는 opacity 1, 나머지는 0.2
- vanilla-extract로 기본 스타일, 동적 값(opacity, fill color)은 inline style

**Patterns to follow:**
- `useMemo`로 layout 계산 캐싱 (tree 데이터가 변경될 때만 재계산)
- SVG `preserveAspectRatio="xMidYMin meet"`

**Test scenarios:**
- Happy path: 3개 노드 트리 → computeTreeLayout이 겹치지 않는 좌표 반환
- Happy path: 단일 노드 → 좌표 (0, 0) 반환
- Edge case: 깊이 6인 편향 트리 → y좌표가 depth * nodeSize[1]로 정확히 증가
- Happy path: 이진 트리 → 좌우 자식의 x좌표가 부모 기준 대칭

**Verification:**
- layout 테스트 통과
- 브라우저에서 트리가 시각적으로 올바르게 렌더링

---

- [ ] **Unit 7: 코드 패널 (Shiki 하이라이팅)**

**Goal:** 알고리즘 pseudocode를 Shiki로 하이라이팅하고, 현재 스텝의 라인을 CSS로 강조

**Requirements:** R2

**Dependencies:** Unit 1

**Files:**
- Create: `src/components/code-panel/CodePanel.tsx`
- Create: `src/components/code-panel/code-panel.css.ts`
- Create: `src/lib/shiki.ts`

**Approach:**
- `src/lib/shiki.ts`: 서버 사이드에서 Shiki highlighter 싱글턴 생성. **직접 작성하는 커스텀 transformer**로 각 line `<span>`에 `data-line="N"` attribute 추가 (Shiki 빌트인이 아님, `transformers.line` 훅 사용하여 구현).
- 알고리즘별 pseudocode는 `AlgorithmConfig.code` 문자열에 저장
- Server Component에서 Shiki로 HTML 생성 → Client Component로 전달
- Client Component: `useEffect`로 `data-line` 기반 `.highlighted-line` 클래스 토글
- 하이라이트 스타일: 배경색 변경 + 좌측 border accent

**Test expectation: none** -- 시각적 컴포넌트, dev 서버에서 육안 확인

**Verification:**
- pseudocode가 구문 하이라이팅되어 표시
- currentStep.codeLine 변경 시 해당 라인 배경색 변경 확인

---

- [ ] **Unit 8: 스테퍼 컨트롤 UI**

**Goal:** Play/Pause/Forward/Backward 버튼, 속도 슬라이더, 진행 표시 바

**Requirements:** R3

**Dependencies:** Unit 5 (useAlgorithmPlayer)

**Files:**
- Create: `src/components/stepper/StepperControls.tsx`
- Create: `src/components/stepper/stepper.css.ts`

**Approach:**
- 버튼 그룹: |◀◀| ◀ | ▶/⏸ | ▶ |▶▶|  (처음으로, 뒤로, 재생/정지, 앞으로, 끝으로)
- 진행 바: `currentIndex / totalSteps` 비율로 너비, 클릭/드래그로 jumpTo
- 속도 슬라이더: 0.5x, 1x, 2x, 4x 선택
- 단계 표시: "Step 12 / 48"
- vanilla-extract recipes로 버튼 variant (active/disabled 상태)

**Test expectation: none** -- 순수 UI 컴포넌트, 스테퍼 로직은 Unit 5에서 테스트 완료

**Verification:**
- 모든 컨트롤이 시각적으로 렌더링되고 클릭 반응

---

- [ ] **Unit 9: 변수 상태 패널 + 입력 폼**

**Goal:** 현재 스텝의 변수 상태 표시 + 사용자 입력 폼

**Requirements:** R4, R5

**Dependencies:** Unit 2

**Files:**
- Create: `src/components/variable-panel/VariablePanel.tsx`
- Create: `src/components/variable-panel/variable-panel.css.ts`
- Create: `src/components/input-form/InputForm.tsx`
- Create: `src/components/input-form/input-form.css.ts`

**Approach:**
- **VariablePanel**: `currentStep.variables`를 키-값 테이블로 표시. 배열은 시각적 블록으로 렌더링 (각 요소가 칸). 변경된 값은 하이라이트.
- **InputForm**: 알고리즘별 동적 폼 (`inputConfig` 기반)
  - 순열/부분집합: 배열 입력 (쉼표 구분) + 크기 검증
  - 조합: n, r 숫자 입력
  - N-Queen: N 슬라이더 (4~8)
- 입력 변경 시 StepGenerator 재실행 → steps/tree 갱신 → player reset
- 입력 크기 제한 검증 (requirements에 명시된 max값)

**Test scenarios:**
- Happy path: 순열에 `[1,2,3]` 입력 → 유효, steps 생성
- Edge case: 순열에 `[1,2,3,4,5,6,7]` 입력 → 최대 6개 초과 에러 메시지
- Edge case: 빈 입력 → 에러 메시지
- Edge case: 중복 값 `[1,1,2]` → 에러 메시지
- Happy path: N-Queen에 n=4 입력 → 유효

**Verification:**
- 입력 폼이 검증 규칙대로 동작
- 유효 입력 시 시각화 갱신

---

- [ ] **Unit 10: 시각화 페이지 조립**

**Goal:** `/visualize/[algorithm]` 페이지에서 모든 컴포넌트 통합

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** Unit 3~9 모두

**Files:**
- Create: `src/app/visualize/[algorithm]/page.tsx`
- Create: `src/app/visualize/[algorithm]/visualize-page.css.ts`

**Approach:**
- URL params에서 algorithm ID 추출 → 레지스트리에서 config 조회
- 존재하지 않는 알고리즘 → notFound()
- Premium 알고리즘 접근 시 → 잠금 안내 페이지
- 레이아웃: 2단 분할
  - 좌측: CodePanel (상단) + VariablePanel (하단)
  - 우측: TreeView (메인) + 알고리즘 설명 텍스트
  - 하단: InputForm + StepperControls
- Shiki HTML은 Server Component에서 생성, 나머지는 Client Component
- 상태 흐름: `InputForm → useMemo(stepGenerator) → useAlgorithmPlayer → 각 패널`

**Test expectation: none** -- 통합 페이지, 전체 흐름은 브라우저에서 E2E 확인

**Verification:**
- `/visualize/permutations` 접속 시 모든 패널이 올바르게 렌더링
- 스테퍼 조작 시 코드 하이라이트 + 트리 노드 + 변수 패널이 동기화
- 입력 변경 시 전체 시각화 갱신

---

- [ ] **Unit 11: 홈 페이지 + 잠금 UI**

**Goal:** 알고리즘 카드 목록 홈 페이지, Premium 잠금 카드 포함

**Requirements:** R6

**Dependencies:** Unit 2 (레지스트리)

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/algorithm-card/AlgorithmCard.tsx`
- Create: `src/components/algorithm-card/algorithm-card.css.ts`

**Approach:**
- 레지스트리에서 모든 알고리즘 목록 렌더링
- 카드 정보: 알고리즘명, 한줄 설명, 난이도 태그
- `isPremium` 카드: 잠금 아이콘 오버레이 + "Premium" 배지 + 클릭 시 "준비 중입니다" 토스트/모달
- 무료 카드: 클릭 시 `/visualize/[algorithm]`으로 이동
- vanilla-extract recipes로 카드 variant (free/locked)
- 반응형 그리드 레이아웃 (데스크톱 기준 3~4열)

**Test expectation: none** -- UI 컴포넌트, 시각적 확인

**Verification:**
- 홈에 4개 무료 + N개 유료(잠금) 카드 표시
- 무료 카드 클릭 → 시각화 페이지 이동
- 잠금 카드 클릭 → "준비 중입니다" 안내

---

- [ ] **Unit 12: N-Queen 보드 시각화**

**Goal:** N-Queen 알고리즘 전용 체스보드 시각화 패널

**Requirements:** R1, R5

**Dependencies:** Unit 4 (N-Queen step generator), Unit 10

**Files:**
- Create: `src/components/board-view/BoardView.tsx`
- Create: `src/components/board-view/board-view.css.ts`

**Approach:**
- N x N 그리드를 SVG 또는 div grid로 렌더링
- 현재 step의 `variables.board`에서 퀸 위치, 현재 탐색 중인 셀, 충돌 영역 표시
- 퀸: 체스 유니코드 문자(♛) 또는 아이콘
- 충돌 행/열/대각선: 빨간 반투명 오버레이
- 현재 탐색 셀: 노란색 하이라이트
- `/visualize/n-queen` 페이지에서 TreeView 옆에 보드 패널 추가 렌더링

**Test expectation: none** -- 시각적 컴포넌트

**Verification:**
- N-Queen 시각화 시 보드에 퀸 배치가 step과 동기화
- 충돌 영역이 시각적으로 표시

## System-Wide Impact

- **Interaction graph:** InputForm → StepGenerator → useAlgorithmPlayer → CodePanel, TreeView, VariablePanel, StepperControls. 단방향 데이터 흐름, 콜백 없음.
- **Error propagation:** 입력 검증 실패는 InputForm에서 즉시 표시. StepGenerator 내부 에러는 발생하지 않아야 함(입력이 검증됨).
- **State lifecycle risks:** 입력 변경 시 이전 steps 배열이 garbage collected 되어야 함. player의 currentIndex가 새 steps 길이를 초과하지 않도록 reset 필수.
- **API surface parity:** 없음 (API 없음, 전부 클라이언트 사이드)
- **Integration coverage:** StepGenerator → TreeView 연동 (step의 activeNodeId가 실제 tree에 존재하는지), CodePanel 라인 하이라이트 동기화

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 순열 6개(720 리프) 트리가 시각적으로 과밀 | 활성 브랜치 강조 + 비활성 투명화, viewBox 자동 조정 |
| Shiki 번들 크기가 클라이언트에 영향 | Server Component에서만 사용, 클라이언트에는 HTML 문자열만 전달 |
| Vanilla-Extract 동적 스타일 제약 | SVG 위치/색상은 inline style 허용, 구조 스타일만 VE 사용 |
| d3-hierarchy 타입 정의 복잡 | `@types/d3-hierarchy` 설치, 필요시 자체 타입 래핑 |

## Sources & References

- **Origin document:** [docs/brainstorms/recursion-visualizer-requirements.md](docs/brainstorms/recursion-visualizer-requirements.md)
- External docs: [Next.js App Router](https://nextjs.org/docs/app), [Vanilla-Extract](https://vanilla-extract.style), [d3-hierarchy](https://d3js.org/d3-hierarchy), [Shiki](https://shiki.style)
