---
title: "feat: 사용자 커스텀 코드 재귀 시각화"
type: feat
status: active
date: 2026-04-13
---

# feat: 사용자 커스텀 코드 재귀 시각화

## Overview

사용자가 직접 작성한 JavaScript 재귀 함수를 붙여넣으면, 해당 함수의 재귀 호출 흐름을 자동으로 추적하여 기존 시각화 파이프라인(트리 뷰, 코드 하이라이트, 스테퍼)에 연결하는 기능을 추가한다.

## Problem Frame

현재 사이트는 4개의 프리셋 알고리즘만 시각화할 수 있다. 코딩테스트 준비생이 자신만의 재귀 함수를 시각화해보고 싶을 때 방법이 없다. 사용자가 코드를 붙여넣고 실행하면 자동으로 호출 트리가 생성되는 "커스텀 모드"가 필요하다.

## Requirements Trace

- R1. 사용자가 JavaScript 재귀 함수 코드를 입력할 수 있다
- R2. 입력된 코드의 재귀 호출을 자동으로 추적하여 `Step[]` + `TreeNode` 생성
- R3. 생성된 데이터로 기존 시각화 파이프라인 (TreeView, CodePanel, StepperControls) 그대로 동작
- R4. 무한 루프/재귀 방지 — 실행 시간 제한, 호출 횟수 제한
- R5. 보안 — DOM 접근, 네트워크 요청 등 차단
- R6. 사용자 친화적 에러 메시지 (구문 오류, 무한 재귀, 타임아웃 등)

## Scope Boundaries

- JavaScript 함수만 지원 (Python, C++ 등 미지원)
- 단일 재귀 함수만 추적 (상호 재귀 미지원)
- 코드 자동완성/Lint 미지원 (에디터는 하이라이팅만)
- 서버 사이드 실행 없음 (전부 브라우저)

## Context & Research

### 기존 코드 패턴

기존 시각화 파이프라인의 통합 지점은 `StepGeneratorResult`:

```
StepGenerator(input) → { steps: Step[], tree: TreeNode }
```

이 계약만 맞추면 useAlgorithmPlayer → TreeView/CodePanel/StepperControls가 **수정 없이** 동작한다. 커스텀 코드 기능은 결국 "사용자 코드에서 StepGeneratorResult를 자동 생성하는 새로운 StepGenerator"를 만드는 것이다.

### 핵심 기술 결정: Proxy 기반 추적

| 방식 | 장점 | 단점 |
|------|------|------|
| **Proxy (apply trap)** | 구현 간단, 실제 값 캡처 | 라인 단위 추적 불가 |
| **AST 변환 (acorn)** | 라인 추적 가능, 루프 가드 삽입 | 파싱 복잡도, 추가 의존성 |

**결정: Proxy + AST 하이브리드**
- **Proxy**: 재귀 함수 호출/리턴 추적 (Step, TreeNode 생성의 핵심)
- **AST (acorn)**: (1) 함수 이름 추출, (2) 루프 가드 삽입, (3) 재귀 호출이 Proxy를 거치도록 함수 이름 재바인딩

### 실행 환경: Web Worker

```
메인 스레드                      Web Worker (격리)
────────────                    ──────────────────
코드 + 인자 전송 ──────→        위험 글로벌 삭제 (fetch, XMLHttpRequest 등)
                                AST 변환 (acorn: 루프 가드 삽입, 함수 재바인딩)
                                Proxy로 래핑
                                new Function()으로 실행
                                Step[] + TreeNode 수집
타임아웃 5초 후 terminate() ─→  (강제 종료)
               ←────────────── 결과 전송 (postMessage)
```

- Worker는 DOM/Storage/네트워크 접근 불가
- 추가로 `fetch`, `XMLHttpRequest`, `importScripts` 삭제
- 메인 스레드에서 5초 타임아웃으로 `worker.terminate()` (무한 루프 대응)
- 호출 횟수 5000회 제한 (무한 재귀 대응)

### 외부 의존성

| 패키지 | 용도 | 크기 (gzipped) |
|--------|------|----------------|
| `@uiw/react-codemirror` | 코드 에디터 | ~50-80KB |
| `@codemirror/lang-javascript` | JS 구문 하이라이팅 | ~15KB |
| `acorn` | JS 파서 (AST) | ~13KB |
| `astring` | AST → 코드 재생성 | ~4KB |

## Key Technical Decisions

- **코드 에디터**: `@uiw/react-codemirror` 선택. Monaco는 2MB+로 과도, react-simple-code-editor는 기능 부족. CodeMirror 6은 50-80KB로 적절하고 JS 언어 모드 내장.
- **실행 환경**: Web Worker (Blob URL). 메인 스레드 차단 없음, DOM 격리, `terminate()`로 강제 종료 가능.
- **추적 방식**: Proxy apply trap으로 함수 호출/리턴 가로채기. AST로 루프 가드 삽입 + 함수 이름 재바인딩.
- **코드 라인 하이라이팅**: 함수 호출/리턴 시점에 해당 함수 정의 라인만 하이라이트 (라인 단위 정밀 추적은 MVP 범위 밖).
- **Shiki 대신 CodeMirror**: 커스텀 코드 페이지에서는 Shiki 대신 CodeMirror 에디터가 코드 표시 + 하이라이팅 겸용. 실행 후에는 기존 CodePanel(Shiki)로 코드 표시하되, HTML은 서버가 아닌 클라이언트에서 생성.

## Open Questions

### Resolved During Planning

- **재귀 함수를 어떻게 식별하는가?**: AST로 코드를 파싱하여 `FunctionDeclaration` 노드를 찾고, 함수 본문에서 자기 이름을 호출하는 `CallExpression`이 있으면 재귀 함수로 판정. 여러 함수가 있으면 재귀 호출이 있는 첫 번째 함수를 선택.
- **인자 입력 방식**: 함수 시그니처에서 파라미터 이름을 추출하고, 사용자에게 JSON 형태로 초기 인자를 입력받음. 예: `fibonacci(n)` → `n: 5` 입력.
- **Step.codeLine 처리**: AST 파싱 시 `node.loc.start.line`을 사용. Proxy에서 call 시 함수 정의 라인, return 시 마지막 라인을 기록.

### Deferred to Implementation

- 사용자 코드에 `const`로 선언된 함수의 재바인딩 처리 세부 구현
- CodeMirror에서 특정 라인 하이라이트하는 정확한 API 사용법
- Worker 내부에서 acorn 로드 방식 (inline vs dynamic import)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
사용자 코드 입력 (CodeMirror)  +  인자 입력 (ArgumentForm)
          |                              |
          v                              v
     코드 문자열                    인자 객체
          |                              |
          +──────────────┬───────────────+
                         |
                         v
              ┌─────────────────────┐
              │    Web Worker        │
              │                     │
              │  1. 위험 글로벌 삭제  │
              │  2. acorn 파싱       │
              │     - 함수명 추출    │
              │     - 루프 가드 삽입  │
              │     - 함수 재바인딩   │
              │  3. astring 코드 생성 │
              │  4. Proxy 래핑       │
              │  5. new Function()   │
              │  6. Step[] 수집      │
              │  7. TreeNode 빌드    │
              └──────────┬──────────┘
                         |
                    postMessage
                         |
                         v
              { steps: Step[], tree: TreeNode }
                         |
                         v
              useAlgorithmPlayer(steps)
                  |         |          |           |
                  v         v          v           v
             CodePanel  TreeView  VariablePanel  StepperControls
             (기존)     (기존)    (기존)         (기존)
```

**Worker 내부 실행 흐름 상세:**

```
입력: { code: "function fib(n) { ... }", args: [5] }

1. acorn.parse(code) → AST
2. AST에서 재귀 함수 찾기:
   - FunctionDeclaration "fib" 발견
   - 본문에서 CallExpression "fib(...)" 발견 → 재귀 함수 확인
3. AST 변환:
   - 모든 for/while 루프에 __guard() 삽입
   - "fib" 호출을 "__traced_fib" 호출로 교체
4. astring.generate(ast) → 변환된 코드
5. Proxy 래핑:
   - __traced_fib = new Proxy(fib, { apply(target, thisArg, args) { ... } })
   - apply trap에서:
     a. nodeId 생성, TreeNode 생성, 부모에 연결
     b. Step { type: "call", args snapshot } 추가
     c. Reflect.apply(target, thisArg, args) 실행
     d. Step { type: "return", returnValue } 추가
     e. TreeNode.status = "completed"
6. __traced_fib(5) 실행
7. { steps, tree } 를 postMessage로 전송
```

## Implementation Units

- [ ] **Unit 1: Web Worker 실행 엔진**

**Goal:** 사용자 코드를 받아 안전하게 실행하고, Proxy로 재귀 호출을 추적하여 `StepGeneratorResult`를 반환하는 Worker

**Requirements:** R2, R4, R5

**Dependencies:** None

**Files:**
- Create: `src/lib/custom-code/worker-script.ts` (Worker 본체 — 글로벌 삭제, Proxy 래핑, 실행, Step/TreeNode 수집)
- Create: `src/lib/custom-code/executor.ts` (메인 스레드 — Worker 생성, 메시지 전송/수신, 타임아웃 관리)
- Create: `src/lib/custom-code/types.ts` (Worker 메시지 타입 정의)
- Test: `src/lib/custom-code/__tests__/executor.test.ts`

**Approach:**
- Worker는 Blob URL로 생성 (별도 파일 불필요)
- Worker 시작 시 `self.fetch`, `self.XMLHttpRequest`, `self.importScripts` 삭제
- `executor.ts`는 Promise 기반 API: `executeCode(code, args, options) → Promise<StepGeneratorResult>`
- 타임아웃 5초, 호출 횟수 제한 5000회
- Worker 내부에서 Proxy `apply` trap으로 매 호출/리턴마다 Step 스냅샷 생성
- 인자는 `structuredClone`으로 깊은 복사하여 불변 스냅샷 보장
- 콜스택 배열로 부모-자식 관계 추적 → TreeNode 자동 빌드

**Patterns to follow:**
- 기존 `StepGeneratorResult` 계약 (`src/types/algorithm.ts`)
- 기존 permutations.ts의 Step 생성 패턴 (id, type, codeLine, activeNodeId, activePath, variables, description)

**Test scenarios:**
- Happy path: `function fib(n) { if (n<=1) return n; return fib(n-1)+fib(n-2); }` + args `[5]` → steps 배열에 call/return 쌍이 올바르게 생성, tree 구조가 fib(5)의 호출 트리와 일치
- Happy path: `function factorial(n) { if (n<=1) return 1; return n*factorial(n-1); }` + args `[4]` → steps 4개의 call + 4개의 return, 선형 트리
- Edge case: 재귀가 없는 함수 → 1개 call + 1개 return, 단일 노드 트리
- Error path: 무한 재귀 `function f(n) { return f(n); }` → 5000회 호출 제한 에러
- Error path: 구문 오류 코드 → 파싱 에러 메시지 반환
- Error path: 5초 초과 실행 → 타임아웃 에러 메시지 반환
- Happy path: 각 step의 variables에 함수 인자가 deep copy로 저장
- Integration: 반환된 `{ steps, tree }`가 `useAlgorithmPlayer`에 직접 전달 가능한 형태

**Verification:**
- 테스트 통과
- fib(5) 결과의 step 수와 tree 구조가 수학적으로 정확

---

- [ ] **Unit 2: AST 기반 코드 분석 및 변환**

**Goal:** 사용자 코드를 파싱하여 재귀 함수를 식별하고, 루프 가드를 삽입하고, 재귀 호출이 Proxy를 거치도록 변환

**Requirements:** R2, R4

**Dependencies:** Unit 1

**Files:**
- Create: `src/lib/custom-code/analyzer.ts` (코드 파싱, 재귀 함수 탐지, 파라미터 추출)
- Create: `src/lib/custom-code/transformer.ts` (AST 변환 — 루프 가드 삽입, 함수 이름 재바인딩)
- Test: `src/lib/custom-code/__tests__/analyzer.test.ts`
- Test: `src/lib/custom-code/__tests__/transformer.test.ts`

**Approach:**
- `acorn.parse(code)` → ESTree AST
- `analyzer.ts`: AST를 순회하여 FunctionDeclaration/FunctionExpression 찾기. 함수 본문에서 같은 이름의 CallExpression이 있으면 재귀 함수로 판정. 파라미터 이름 목록 추출.
- `transformer.ts`: (1) for/while/do-while 본문에 `__guard()` 호출 삽입, (2) 재귀 함수의 이름을 `__traced_{name}`으로 교체 (호출부만, 정의부는 유지)
- `astring.generate(ast)` → 변환된 코드 문자열

**Test scenarios:**
- Happy path: `function fib(n) {...}` → 재귀 함수 "fib" 식별, 파라미터 `["n"]` 추출
- Happy path: `const fib = function(n) {...}` (함수 표현식) → 재귀 함수 식별
- Happy path: `const fib = (n) => {...}` (화살표 함수) → 재귀 함수 식별
- Happy path: 루프 포함 코드 → 변환 후 모든 루프에 `__guard()` 삽입 확인
- Happy path: `fib(n-1)` 호출이 `__traced_fib(n-1)`로 교체 확인
- Edge case: 재귀 함수가 없는 코드 → 에러: "재귀 함수를 찾을 수 없습니다"
- Edge case: 여러 함수가 있고 하나만 재귀 → 재귀 함수만 선택
- Error path: 구문 오류 코드 → acorn 파싱 에러를 사용자 친화적 메시지로 변환

**Verification:**
- 테스트 통과
- 변환된 코드가 유효한 JS로 실행 가능

---

- [ ] **Unit 3: 코드 에디터 컴포넌트**

**Goal:** CodeMirror 6 기반 코드 에디터 + 인자 입력 폼

**Requirements:** R1

**Dependencies:** None (UI만)

**Files:**
- Create: `src/components/code-editor/CodeEditor.tsx`
- Create: `src/components/code-editor/code-editor.css.ts`
- Create: `src/components/argument-form/ArgumentForm.tsx`
- Create: `src/components/argument-form/argument-form.css.ts`

**Approach:**
- CodeMirror는 `'use client'` + `dynamic import` (SSR 비활성)
- 기본 예제 코드를 placeholder로 제공 (fibonacci)
- "실행" 버튼 클릭 시 `onExecute(code, args)` 콜백 호출
- `ArgumentForm`: 함수 파라미터 이름에 따라 동적 input 필드 생성. JSON 타입 지원 (숫자, 배열, 문자열).
- 에디터 테마: 기존 사이트의 다크 테마와 일관된 스타일

**Test expectation: none** — UI 컴포넌트, dev 서버에서 시각적 확인

**Verification:**
- CodeMirror 에디터가 JS 구문 하이라이팅과 함께 렌더링
- 코드 입력 + 인자 입력 + 실행 버튼이 동작

---

- [ ] **Unit 4: 커스텀 시각화 페이지**

**Goal:** `/visualize/custom` 페이지 — 코드 에디터, 인자 입력, 실행, 결과 시각화를 통합

**Requirements:** R1, R2, R3, R6

**Dependencies:** Unit 1, 2, 3

**Files:**
- Create: `src/app/visualize/custom/page.tsx`
- Create: `src/app/visualize/custom/CustomVisualizerClient.tsx`
- Create: `src/app/visualize/custom/custom-page.css.ts`

**Approach:**
- 레이아웃: 기존 시각화 페이지와 유사하되, 좌측 상단에 CodePanel 대신 CodeEditor 배치
- **실행 전 상태**: 코드 에디터 + 인자 폼만 표시, 트리/스테퍼는 빈 상태 또는 안내 메시지
- **실행 중 상태**: 로딩 스피너 + "실행 중..." 표시
- **실행 완료**: 에디터는 읽기 전용으로 전환, 기존 TreeView + StepperControls + VariablePanel 표시
- **에러 상태**: 에러 메시지를 사용자 친화적으로 표시 (구문 오류, 타임아웃, 호출 초과)
- "다시 편집" 버튼으로 에디터 모드로 복귀
- 실행 후 CodePanel(Shiki)은 사용하지 않고, CodeMirror 에디터를 읽기 전용으로 표시 + 현재 라인 하이라이트

**Patterns to follow:**
- 기존 `VisualizerClient.tsx`의 상태 흐름 패턴
- 기존 `visualize-page.css.ts`의 레이아웃 패턴

**Test expectation: none** — 통합 페이지, 브라우저 E2E 확인

**Verification:**
- `/visualize/custom` 접속 시 코드 에디터 렌더링
- fib(5) 코드 입력 + 실행 → 트리 시각화, 스테퍼 동작
- 무한 재귀 코드 → 에러 메시지 표시
- 구문 오류 코드 → 에러 메시지 표시

---

- [ ] **Unit 5: 홈 페이지에 커스텀 모드 카드 추가**

**Goal:** 홈 페이지에 "내 코드 시각화" 카드 추가

**Requirements:** R1

**Dependencies:** Unit 4

**Files:**
- Modify: `src/app/page.tsx`

**Approach:**
- 기존 무료 알고리즘 섹션 위 또는 별도 섹션으로 "내 코드 시각화" 특별 카드 배치
- 카드 디자인: 다른 카드와 차별화 (아이콘, 색상, 강조 텍스트)
- 클릭 시 `/visualize/custom`으로 이동

**Test expectation: none** — UI 수정, 시각적 확인

**Verification:**
- 홈 페이지에 커스텀 모드 카드가 눈에 띄게 표시
- 클릭 시 `/visualize/custom`으로 정상 이동

## System-Wide Impact

- **Interaction graph:** 새로운 Worker 실행 경로가 추가되지만, 기존 프리셋 알고리즘 파이프라인에는 영향 없음. 커스텀 모드는 완전히 별도 페이지(`/visualize/custom`).
- **Error propagation:** Worker 에러 → `executor.ts`에서 catch → CustomVisualizerClient에서 UI 표시. Worker 크래시 시 `onerror` 핸들러로 포착.
- **State lifecycle risks:** Worker가 `terminate()`되면 메시지가 유실됨 → Promise reject로 처리. 코드 변경 시 이전 Worker가 아직 실행 중일 수 있음 → 새 실행 시 이전 Worker `terminate()` 필수.
- **API surface parity:** 없음. 기존 `AlgorithmConfig` 레지스트리에는 등록하지 않음 (커스텀 모드는 별도 흐름).
- **Unchanged invariants:** 기존 4개 프리셋 알고리즘 페이지, 홈 페이지의 기존 카드, 프리미엄 잠금 UI — 모두 변경 없음.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 사용자 코드가 Worker를 크래시시킴 | `worker.onerror` + 타임아웃으로 항상 에러 메시지 반환 |
| acorn이 최신 JS 문법을 파싱 못함 | `ecmaVersion: 2022`로 설정, optional chaining 등 지원. ESM `import`는 지원 불가하나 재귀 함수에는 불필요 |
| CodeMirror 번들 크기 (50-80KB) | dynamic import + code splitting으로 `/visualize/custom` 페이지에서만 로드 |
| 복잡한 클로저/고차 함수 코드 | "단일 재귀 함수"만 지원한다는 제약을 UI에 명시 |
| Worker 내부에서 acorn/astring 사용 | Worker 스크립트에 인라인으로 포함하거나 별도 번들로 로드 |

## Sources & References

- Related plan: `docs/plans/2026-04-12-001-feat-recursion-visualizer-mvp-plan.md`
- [acorn JS parser](https://github.com/acornjs/acorn) — ESTree AST, ~13KB
- [astring code generator](https://www.npmjs.com/package/astring) — AST → JS, ~4KB
- [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror) — React CodeMirror 6 래퍼
- [MDN: Proxy handler.apply()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/Proxy/apply)
- [MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
