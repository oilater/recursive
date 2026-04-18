---
title: "feat: stack frame-based variable tracking"
type: feat
status: active
date: 2026-04-18
deepened: 2026-04-18
reviewed: 2026-04-18
---

# feat: stack frame-based variable tracking

## Overview

평면 `Step.variables: Record<string, unknown>` 모델을 **콜스택 프레임 기반**으로 전환한다. 디버거 표준 모델처럼 각 함수의 지역 변수가 그 함수 frame에 묶여 표시되고, 함수가 리턴하면 frame이 사라진다. 동시에 비재귀 함수 본문도 추적 대상에 포함시켜, AddTen 같은 일반 함수 호출도 step-by-step으로 따라갈 수 있게 한다.

**Product decision (D6)**: 이는 **의도된 정체성 트라젝토리**다 — Recursive를 "step visualizer"에서 "교육용 mini debugger"로 한 단계 이동시킨다. 사용자가 명시적으로 디버거 멘탈모델("함수 끝나면 사라짐")을 요구함. 향후 closure/this/async는 이 트라젝토리의 자연스러운 확장 후보.

## Problem Frame

### 현재 동작의 한계

1. **변수가 평면 dict에 뭉침** — 누구의 변수인지 모른다. AddTen의 매개변수 `num`이 `__entry__`의 `a`와 같은 평면에 표시됨.
2. **함수 본문 trace는 재귀 함수 또는 `__entry__`만** — 일반 함수 안에서는 step이 만들어지지 않아 진입 시점 변수 캡처가 불가능.
3. **변수 캡처 범위 오류** — `src/engine/analyzer.ts:60-79`의 `extractLocalVarNames`가 내부 함수 매개변수까지 전부 한 `__captureVars`에 lumping → 외부 스코프에서 try시 ReferenceError → "-".
4. **함수 종료 후에도 변수 잔존** — `src/engine/build-worker-code.ts:144`의 `Object.assign({}, prevStep.variables)`가 진입 step에서 caller scope를 새 frame에 leak.

### 사용자가 본 증상 (2026-04-18 보고)

```typescript
function AddTen(num: number) { return num + 10; }
const a = AddTen(5);
console.log(a);
```

마지막 step에서 `a=15`, `num=null`. 두 가지 문제 (범위 오류 + 잔존 + 평면 모델)가 함께 드러난 케이스.

## Requirements Trace

- **R1**. 각 함수 호출은 자기만의 frame을 가지며, frame은 `{ funcName, variables }` 묶음.
- **R2**. `Step.variables`가 사라지고 `Step.frames: Frame[]`로 교체.
- **R3**. 함수 진입 시 새 frame이 push, 정상 리턴 시 pop. 예외/백트래킹도 pop.
- **R4**. 비재귀 함수 본문도 line-by-line trace 가능.
- **R5**. 변수 캡처는 그 함수의 자체 지역 변수 + 매개변수만 — caller scope leak 금지. **Closed-over (closure) 변수는 제외** (D8).
- **R6**. UI는 frame 스택을 위에서 아래로 시각화 (활성 frame 강조).
- **R7**. CallStack 컴포넌트는 그대로 — `activePath` 읽기 유지. VariablePanel은 `Step.frames`. ResultPanel은 마이그레이션 (D7).

### Success Criteria

- AddTen(5) 예제: AddTen 진입 step → frames=`[__entry__, AddTen]`이고 AddTen frame에 `num=5`. 리턴 step → frames=`[__entry__]`만 (AddTen 사라짐), `__entry__`에 `a=15`. **`num=null` 잔존 사라짐**.
- factorial(3), permutations([1,2,3], 2) 손 검증 — frame 깊이 정확
- 기존 66개 테스트 + 새 frame 테스트 통과
- `permutations([1..7], 7)` 같은 큰 입력에서 worker → main 페이로드 < 5MB (structural sharing 적용 후)
- ResultPanel의 preset 결과 표시 동작 유지 (회귀 검증)

## Scope Boundaries

- **In scope (이번 plan)**:
  - JS 엔진(analyzer/transformer/worker)의 frame 모델
  - `Step` 타입 변경
  - VariablePanel UI 갱신
  - **ResultPanel adaptation** — `step.variables.result` → `step.frames` 기반 (D7)
  - **Python adapter** — `pyodide-worker.ts`가 Python step을 single-frame Step으로 변환 (D7)
  - AST builders 확장 (단, tryFinally는 conditional — D1)
  - MAX_STEPS를 `constants.ts`로 이동 (D9)
  - 기존 테스트 fixture 갱신
- **Out of scope**:
  - Python 트레이서의 본격 frame 모델 (`tracer.py.ts`의 `sys.settrace` frame을 multi-frame Step으로 매핑) — 별도 plan
  - 클로저 캡처 변수 시각화 (D8: 일단 제외)
  - this 바인딩 표시
  - async/await frame 추적
  - 사용자 onboarding UI 변경 (P3 reviewer feedback — 별도 follow-up)

## Context & Research

### Relevant Code and Patterns

- `src/engine/build-worker-code.ts:115-173` — 기존 `__createProxy`가 callStack push/pop 처리 (재귀 함수만). 이 패턴 확장.
- `src/engine/build-worker-code.ts:140` — push site, 라인 164/169 — pop sites
- `src/engine/build-worker-code.ts:144` — caller scope leak 원인 (`Object.assign({}, prev.variables)`). frames 도입 시 **제거 + 매개변수 시드로 교체**
- `src/engine/build-worker-code.ts:83` — `MAX_STEPS = 10000` 하드코딩. `constants.ts`로 이동
- `src/engine/build-worker-code.ts:194-195` — `new Function(...)` 인자 리스트와 호출. ⚠️ 새 헬퍼 추가 시 두 곳 동시 갱신
- `src/engine/transformer.ts:42` — `walkAndTransform`. 모든 함수 본문 captureVars 삽입.
- `src/engine/transformer.ts:130-135` — `entersTracedBody` 조건 확장.
- `src/engine/transformer.ts:168-170` — `proxyReassignment` 패턴. 모든 함수 표현식까지 확장.
- `src/engine/ast-builders.ts:34` — `tryCatch`만 있음. `tryFinally`는 conditional (D1).
- `src/visualizer/variable-panel/VariablePanel.tsx:131-146` — frames stack 렌더로 변경
- **`src/visualizer/result-panel/ResultPanel.tsx:29-33`** — `step.variables.result` 읽음. 어댑터 함수로 frames에서 추출 (D7)
- `src/visualizer/call-stack/CallStack.tsx:15` — UI-only `StackFrame` 인터페이스 존재. 새 타입은 `Frame`으로 명명 (충돌 회피).
- **`src/engine/python/pyodide-worker.ts:86`** — Python steps의 `variables` 필드. single-frame Step으로 변환 어댑터 추가 (D7)

### Conventions to Follow

- Worker 헬퍼: `__pushFrame`, `__popFrame` (double underscore + camelCase)
- 상수: `src/engine/constants.ts`에 `PUSH_FRAME`, `POP_FRAME`, `MAX_STEPS` 추가
- 타입: `Frame` (StackFrame 절대 X)
- AST: `ast-builders.ts` 헬퍼 사용

## Key Technical Decisions

### D1. Hybrid: Proxy(토폴로지) + Transformer(내용) — Binding split

**결정**: `__createProxy`가 frame **lifecycle 단독** 관리 (push, pop, 예외 cleanup, args seeding). transformer는 함수마다 자체 `__captureVars` closure 삽입 — **`__pushFrame`/`__popFrame` 직접 삽입 안 함**.

→ 이로써 **`tryFinally` AST builder는 불필요** (Proxy가 finally 처리). Unit 2에서 conditional로.

**근거**:
- 호출 lifetime은 동적 → runtime이 안다. 정상/예외 pairing이 한 곳.
- 스코프는 lexical → transformer가 안다. 각 함수 closure가 자기 lexical scope만 자동 캡처.
- Hybrid binding 명확화 → "double-push" 위험 제거.

### D2. Step 모델 atomic replace + 컨슈머 마이그레이션 모두 포함

**결정**: `Step.variables` → `Step.frames: Frame[]` 한 번에 교체. **모든 알려진 컨슈머**를 같은 plan에서 마이그레이션:
- `VariablePanel`: frames 스택 렌더
- **`ResultPanel`**: `step.variables.result` → `step.frames`에서 result 추출 헬퍼 (D7)
- **`pyodide-worker.ts`**: Python step → single-frame Step 어댑터 (D7)

**근거**:
- "마지막 frame을 flatten" shim은 num=null 버그 그대로 재현 — self-defeat
- 이전 가설 (VariablePanel만 컨슈머) 거짓이었음 (document-review C1 발견). 모든 컨슈머 명시 마이그레이션 필수.

### D3. Test fixtures를 Phase 1과 함께

(이전 결정 유지)

### D4. Structural sharing — 활성 frame만 deep-clone

**결정**: `__traceLine`이 step.frames 스냅샷 저장 시 **활성 frame만 deep-clone**, 부모 frames는 reference 공유.

**Important caveat (C4 from review)**: "parent frames immutable" 가정은 **closure mutation 케이스에 깨질 수 있음**:

```javascript
function p() {
  let x = 0;
  c(() => { x++ });  // child가 closure로 parent 변수 mutate
}
```

→ **명시적 정책**: parent frame.variables는 **child 호출 시점 snapshot이며 live가 아니다**. 즉, child 안에서 parent의 closed-over 변수가 mutate되어도 step.frames의 parent snapshot에는 반영 안 됨. 사용자가 step backward로 보면 정확히 그 시점의 값을 봄. 이를 known limitation으로 문서화.

**테스트**: 위 시나리오를 Unit 4 test scenarios에 명시 — "closure mutation은 snapshot이 stale로 유지된다" pin.

### D5. `tracedFuncName` 분기 명시적 폐기

(이전 결정 유지) Phase 6에서 정리.

### D6. 정체성 트라젝토리 — "교육용 mini debugger"

**결정**: 이 변경은 의도된 product trajectory shift다. 사용자가 명시적으로 디버거 멘탈모델 요구. 향후 closure 시각화/this 바인딩/async 추적은 이 트라젝토리의 자연스러운 후보 — **현재 plan에는 미포함이지만 product decision으로 가능성 열어둠**.

**Trade-off 인지**:
- README의 "without setting breakpoints" 포지셔닝과 약간 충돌. 후속 카피 검토 필요 (별도 작업).
- 미래 사용자가 closure/this/async를 자연스럽게 기대 — 기대 부채.

### D7. 컨슈머별 마이그레이션 정책

**결정**:
- `VariablePanel`: full migration to `Step.frames`
- `ResultPanel`: `Step.variables.result` 의존을 헬퍼로 격리. `getResultFromFrames(step)`이 마지막 frame 또는 root frame에서 `result` 키 추출. ResultPanel에는 한 줄 변경.
- `pyodide-worker.ts`: Python step이 emit하는 평면 `variables`를 single-frame `[{ funcName: "<python>", variables }]`로 변환하는 어댑터 추가. Python tracer 자체는 손대지 않음 (별도 plan으로 frame 모델화).

### D8. Closure 변수 정책 — 제외

**결정**: `__captureVars`는 그 함수의 자체 매개변수 + var/let/const만 캡처. **closed-over 변수는 제외**.

**근거**:
- 포함하면: 동일 변수가 여러 frame에 중복 표시 → 모델 lying ("frame이 그 변수를 소유한다")
- 제외하면: 사용자가 inner에서 outer 변수 사용하는데 frame에 안 보이는 혼란
- 후자가 덜 나쁨 (혼란 < lying). 추후 "[outer scope]" indicator 같은 UX 보완 가능 (이번 plan 외).

### D9. MAX_STEPS를 `constants.ts`로 이동

**결정**: `build-worker-code.ts:83`의 하드코딩 제거 → `constants.ts`의 `MAX_STEPS = 10000`. D4 structural sharing의 페이로드 contract와 한 곳에서 관리.

### D10. TreeNode 정책 — 재귀 함수에 한정

**결정**: `__createProxy`를 모든 함수로 확장하더라도 **TreeNode 생성은 `recursiveFuncName` 함수에 한정**. 모든 함수가 TreeNode를 가지면 호출 트리 폭발 + R7 ("CallStack 그대로") 위반.

→ Frame은 모든 함수가 push, TreeNode는 재귀 함수만. CallStack UI는 영향 없음.

### D11. 익명 함수 funcName 정책

**결정**:
- FunctionDeclaration: `node.id.name`
- Named FunctionExpression: `node.id.name`
- Anonymous FunctionExpression / ArrowFunctionExpression:
  - 부모가 VariableDeclarator (`const f = () => ...`) → `decl.id.name`
  - 부모가 Property (`{ foo: () => ... }`) → `prop.key.name`
  - 그 외 → `<anonymous@${line}:${col}>`

→ transformer에서 `proxyReassignment` 호출 시 부모 컨텍스트 추적 필요. walkAndTransform에 parent 스택 추가.

### D12. Callback 함수 wrapping

**결정**: transformer는 **모든 FunctionDeclaration / FunctionExpression / ArrowFunctionExpression**을 expression site에서 `__createProxy`로 감쌈. 즉:
- `function f(){}` 다음 `f = __createProxy(f, "f")` (기존 패턴 — 모든 함수로 확장)
- `[1,2,3].map(function(x){...})` → `[1,2,3].map(__createProxy(function(x){...}, "<anonymous@...>"))`
- `const f = () => x` → `const f = __createProxy(() => x, "f")`

→ callback으로 전달되는 함수도 frame push/pop 보장.

## Open Questions

### Resolved During Planning

- Push/pop 메커니즘? → D1 (Hybrid binding split)
- 모델 한 번에 vs 점진? → D2 (Atomic + 모든 컨슈머 마이그레이션)
- Frame snapshot payload 폭증 mitigation? → D4 (Structural sharing + closure mutation caveat)
- 새 타입 명명? → `Frame`
- tracedFuncName 분기 운명? → D5 (Phase 6 폐기)
- Python 어떻게? → D7 (single-frame 어댑터, 본격 frame은 별도 plan)
- ResultPanel 어떻게? → D7 (`getResultFromFrames` 헬퍼)
- Closure 변수? → D8 (제외)
- MAX_STEPS 이동? → D9 (이번 plan)
- TreeNode 정책? → D10 (재귀만)
- 익명 함수 이름? → D11 (parent context 기반)
- Callback wrap? → D12 (모든 함수 표현식 wrap)

### Deferred to Implementation

- **Frame UI 디자인 디테일** — 카드 형태 / 들여쓰기 / 접고 펴기? Unit 5 구현 시.
- **Empty body recursion 진입 step 모양** — `function f(n){ return n }` 같이 traceLine 없이 즉시 리턴되는 케이스에서 Proxy가 args 시드한 frame이 한 snapshot만 되고 사라짐. UX 어색하면 Proxy가 entry-line synthetic step 한 개 emit (지금 라인 142-157과 유사하나 leak 없는 형태). Unit 4 prototype 시 결정.
- **AGENTS.md 학습 추가 시점** — Unit 6에 포함 vs 별도 follow-up. 이번 plan 마무리 후 결정 (M5/M7 reviewer feedback).
- **사용자 onboarding 영향 mitigation** — 첫 방문 노트 / 토글 / changelog 외 강한 mitigation 검토 (P3 reviewer feedback). 별도 follow-up.

## High-Level Technical Design

> *이 다이어그램은 의도된 접근의 모양을 보여주는 directional guidance입니다. implementation specification이 아닙니다.*

### Hybrid 메커니즘 시퀀스 (D1 binding split)

```
사용자 코드:
  function AddTen(num) { return num + 10; }
  const a = AddTen(5);

──── 변환 후 (개념적) ────
__entry__() {
  var __captureVars_entry = function() { try{__v.a=a}catch{__v.a="-"} return __v }
  function AddTen(num) {
    var __captureVars_AddTen = function() { try{__v.num=num}catch{__v.num="-"} return __v }
    __traceLine(line, __captureVars_AddTen())   // ← 자기 lexical scope만
    return num + 10
  }
  AddTen = __createProxy(AddTen, "AddTen")        // ← 모든 함수 wrap (D12)
  __traceLine(line, __captureVars_entry())
  const a = AddTen(5)                              // → Proxy.apply 발동
  __traceLine(line, __captureVars_entry())
}

──── Worker 런타임 callStack ────
초기:   callStack=[{funcName:"__entry__", variables:{}}]   (D10: __entry__ bottom 합성)
시점 1: AddTen(5) → Proxy.apply → push({funcName:"AddTen", variables:{num:5}}) ← args seed
        callStack=[__entry__, AddTen{num:5}]
시점 2: AddTen 본문 __traceLine → captureVars_AddTen() → 활성 frame.variables 갱신 (D5)
        callStack=[__entry__, AddTen{num:5}]
        step.frames = [parent ref, deep-clone({funcName:"AddTen", variables:{num:5}})]   ← D4 structural sharing
시점 3: AddTen 리턴 → Proxy.finally → pop()
        callStack=[__entry__{a:15}]
```

핵심 관찰:
- `__entry__`는 callStack init 시 합성 frame으로 추가 (transformer는 push 안 함)
- captureVars는 함수 자기 lexical scope만 try-access → leak 자동 해결
- Proxy가 args를 frame.variables에 seed → empty body에서도 frame 비지 않음
- Active frame만 deep-clone, parent는 reference 공유 (D4)
- Closure mutation case는 known limitation (snapshot stale, 의도)

## Implementation Units

### - [ ] **Unit 1: Frame 타입 + Step 모델 교체 + 모든 컨슈머 마이그레이션 + fixture 갱신**

**Goal**: `Step.variables` 제거, `Step.frames: Frame[]` 도입. VariablePanel/ResultPanel/pyodide-worker 동시 마이그레이션. fixture 갱신.

**Requirements**: R2 + R7 (모든 컨슈머)

**Dependencies**: 없음

**Files**:
- Modify: `src/algorithm/types.ts` — `Frame` 타입 추가, `Step.variables` → `Step.frames`
- Modify: `src/algorithm/index.ts` — `Frame` re-export
- Modify: `src/visualizer/result-panel/ResultPanel.tsx` — `step.variables.result` → `getResultFromFrames(step)` (헬퍼)
- Create: `src/visualizer/result-panel/get-result-from-frames.ts` (또는 utils 위치)
- Modify: `src/engine/python/pyodide-worker.ts` — `variables: s.variables || {}` → `frames: [{ funcName: "<python>", variables: s.variables || {} }]`
- Modify: `src/engine/__tests__/transformer.test.ts` — `makeAnalysis` factory + 단언문
- Modify: `src/engine/__tests__/integration.test.ts` — fixture 갱신
- Modify: 모든 테스트 fixture 검색 후 일괄 갱신

**Approach**:
- `interface Frame { funcName: string; variables: Record<string, unknown> }`
- `Step.variables` 완전 제거 (D2)
- `getResultFromFrames(step): unknown` — 마지막 frame부터 root까지 `result` 키 검색

**Patterns to follow**:
- 기존 `Step`/`TreeNode` interface
- `algorithm/index.ts` re-export 형식

**Test scenarios**:
- Edge case: ResultPanel preset 결과 표시 — `step.frames`에서 result 추출하는 테스트 (현재 ResultPanel 테스트가 없으므로 최소 통합 손 검증 + 가능하면 단위 테스트 신설)
- Integration: Python step이 single-frame Step으로 변환되어 VariablePanel 정상 표시 (손 검증)
- 기존 fixture 모두 새 모델로 통과

**Verification**:
- `pnpm exec tsc --noEmit` 통과
- `pnpm test` 통과
- ResultPanel 손 검증 (preset 알고리즘 시각화 후 result 표시 확인)
- Python 코드 시각화 시 VariablePanel에 변수 표시 정상 (single-frame fallback)

---

### - [ ] **Unit 2: 상수 정의 + (conditional) AST builders 확장**

**Goal**: 새 헬퍼/상수 정의. `tryFinally` 빌더는 D1 binding 결정으로 **유보** — Unit 3-4 prototype에서 정말 필요한지 판단.

**Requirements**: R3 (간접)

**Dependencies**: Unit 1

**Files**:
- Modify: `src/engine/constants.ts` — `PUSH_FRAME = "__pushFrame"`, `POP_FRAME = "__popFrame"`, `MAX_STEPS = 10000` 추가 (D9)
- Modify: `src/engine/build-worker-code.ts:83` — 하드코딩 `MAX_STEPS` 제거, payload에서 받기
- Modify: `src/engine/executor.ts` — postMessage payload에 `maxSteps` 추가
- Conditional: `src/engine/ast-builders.ts` — `tryFinally(tryBody, finalizerBody)` (Unit 4 진행 시 정말 필요하다고 판정될 때만)

**Approach**:
- 상수 추가는 즉시
- `tryFinally`는 D1 binding (Proxy가 finally 단독)으로 인해 일단 **추가 안 함**. Unit 3 진행 중 transformer가 push/pop을 직접 삽입해야 한다는 케이스가 발견되면 그때 추가.

**Test scenarios**:
- Test expectation: none — 상수 정의만. 동작 변화는 Unit 4에서 검증.

**Verification**:
- `pnpm exec tsc --noEmit` 통과
- worker 코드가 `MAX_STEPS`를 payload에서 정상 수신 (Unit 4 통합 테스트로 간접 검증)

---

### - [ ] **Unit 3: Transformer — 모든 함수에 자체 captureVars + Proxy wrap 확장**

**Goal**: 모든 FunctionDeclaration/FunctionExpression/ArrowFunctionExpression 본문에 자체 `__captureVars` closure 삽입. 모든 함수 표현식을 `__createProxy`로 wrap (D12). `__pushFrame`/`__popFrame`은 직접 삽입 **안 함** (D1).

**Requirements**: R4, R5, D8 (closure 제외), D11 (funcName), D12 (callback wrap)

**Dependencies**: Unit 1

**Files**:
- Modify: `src/engine/transformer.ts` — `walkAndTransform` 확장. parent stack 추적 (D11)
- Modify: `src/engine/__tests__/transformer.test.ts` — 새 케이스

**Approach**:
- `entersTracedBody` 조건을 모든 함수 body로 확장. `__entry__`는 명시적 제외 (Proxy도 wrap 안 함)
- 함수마다 본문 시작에 `var __captureVars = function() { ... }` 삽입 — **그 함수 lexical scope만** (D8: closed-over 제외)
- 모든 함수 표현식을 `__createProxy(funcExpr, "<funcName>")`로 wrap (D12)
- `proxyReassignment` 패턴 확장 — 모든 함수 선언/표현식에 적용
- funcName 결정: D11 정책. parent stack 필요
- ArrowFunctionExpression의 expression body (`() => x + 1`) → `() => { ... return x + 1 }`로 wrap. 라인 번호는 원본 expression의 `loc.start.line` 사용

**Patterns to follow**:
- `transformer.ts:42` walkAndTransform
- `transformer.ts:150` captureVarsInit
- `transformer.ts:168` proxyReassignment

**Test scenarios**:
- Happy path: 두 함수 각각 자체 `__captureVars` closure 가짐 (변수명 lumping 없음)
- Happy path: callback (`[1,2,3].map(function(x){...})`) 함수도 `__createProxy`로 wrap됨
- Happy path: ArrowFunctionExpression 함수 wrap됨
- Edge case: `__entry__` 본문에는 `__pushFrame` / Proxy wrap **둘 다 없음**
- Edge case: ArrowFunctionExpression expression body → block body 변환, 라인 번호 보존
- Edge case: 익명 함수 `const f = () => ...` → funcName "f" 결정 (D11 parent context)
- Edge case: 익명 함수 부모 컨텍스트 없음 → `<anonymous@line:col>` fallback
- Edge case: closed-over 변수는 captureVars에 안 들어감 — `function outer(){ let t=0; return function inner(x){ t+=x } }` 시 inner의 captureVars에 `t` 없음

**Verification**:
- 변환된 코드 syntactically valid (acorn 재파싱)
- 각 함수의 captureVars가 자기 변수만 try-access
- 모든 함수 표현식이 `__createProxy` 호출 안에 있음

---

### - [ ] **Unit 4: Worker — `__createProxy` 모든 함수 적용 + frame push/pop + structural sharing + bottom frame**

**Goal**: `__createProxy`가 모든 함수의 frame lifecycle 관리 (push, args seed, pop, 예외 cleanup). callStack init 시 `__entry__` bottom frame 합성. step.frames 스냅샷에 structural sharing 적용. TreeNode는 재귀 함수만 (D10).

**Requirements**: R1, R3, R5, R6, D4, D10

**Dependencies**: Unit 1, Unit 3

**Files**:
- Modify: `src/engine/build-worker-code.ts`
  - 라인 116 `if (!hasRecursion) return originalFunc` 제거
  - 라인 128 `recursiveFuncName` 글로벌 의존 → funcName 매개변수
  - 라인 142-157 **synthetic entry-step 제거** + 그 자리에 frame.variables 매개변수 시드 (Object.assign caller leak 제거)
  - callStack 항목: `{ nodeId?, node?, funcName, variables }` (TreeNode는 D10 정책으로 재귀 함수만)
  - `__pushFrame(funcName, args, paramNames)` / `__popFrame()` 함수 추가
  - `__traceLine`이 활성 frame.variables 갱신, step.frames 스냅샷 (structural sharing)
  - 라인 194 `new Function(...)` 인자 리스트에 `__pushFrame, __popFrame` 추가, 라인 195 호출 동시 갱신 ⚠️
  - callStack init: `[{ funcName: "__entry__", variables: {} }]` 합성

**Approach**:
- Proxy.apply: `__pushFrame(funcName, args, paramNames)` → `Reflect.apply` → finally `__popFrame()`
- args seed: `paramNames.forEach((p, i) => frame.variables[p] = deepClone(args[i]))`
- 예외 시 frame.status 'backtracked' (TreeNode 있을 때만)
- step.frames 스냅샷:
  ```
  newFrames = callStack.slice(0, -1)                      // 부모는 reference
  newFrames.push({ ...top, variables: deepClone(top.variables) })   // 활성만 clone
  ```
- TreeNode는 D10에 따라 재귀 함수만 생성 (기존 로직 유지). frame은 모든 함수가 push.

**Patterns to follow**:
- 기존 `__createProxy` (라인 115-173)
- `__traceLine` (라인 85-113)
- `deepClone` (라인 41-47)

**Test scenarios**:
- Happy path: 한 번 호출 함수 → frame push → 본문 trace → pop. step.frames 정확히 변화
- Happy path: 중첩 호출 → frames 깊이 +1, 리턴 시 -1
- Happy path: callback 함수 (Array.map의 inner) → frame push/pop
- Happy path: 재귀 함수 5단계 → frames 5개 push, 모두 pop
- Edge case: empty body 함수 `function f(){}` → push immediately pop, frame.variables는 args seed만
- Error path: 함수 내 throw → 모든 활성 frame pop, step.frames 잔존 없음
- Integration: `permutations([1,2,3], 2)` 백트래킹 → frames 정확히 push/pop, 잔존 없음
- Integration: closure mutation case (`function p(){let x=0; c(()=>{x++})}`) → parent frame snapshot이 stale (D4 caveat) — 명시적 pin
- Integration: `__entry__` bottom frame은 callStack[0]에 항상 존재
- Integration: TreeNode는 재귀 함수만 매달림 (D10) — CallStack UI 회귀 없음
- Performance smoke: 10000 step 케이스에서 worker→main 페이로드 < 5MB 검증 (structural sharing 작동)

**Verification**:
- 새 worker 코드가 `new Function(...)` 평가 시 ReferenceError 없음
- 중첩/재귀/예외 시나리오에서 callStack과 step.frames 길이 일치
- TreeNode는 재귀만, frame은 모든 함수 (CallStack UI 영향 없음 검증)
- `pnpm test integration` 통과
- 사용자 보고 시나리오 (`AddTen(5)`) 손 검증 — frame 진입/리턴, num 표시/사라짐 확인

---

### - [ ] **Unit 5: VariablePanel — frames 스택 렌더 + diff 매칭 변경**

**Goal**: `currentStep.frames`를 위에서 아래로 렌더 (활성 frame 강조). diff 매칭은 `funcName + depth` 기준.

**Requirements**: R6

**Dependencies**: Unit 1, Unit 4

**Files**:
- Modify: `src/visualizer/variable-panel/VariablePanel.tsx`
- Modify: `src/visualizer/variable-panel/variable-panel.css.ts` — frame 카드/구분선

**Approach**:
- 라인 131-146 평면 dict 렌더 → frames.map((frame, depth) => render)
- 활성 frame은 `frames[frames.length - 1]` — 강조 (테두리/색상)
- 비활성 frame은 dim
- diff 매칭: `prevStep.frames[depth]`의 같은 funcName 확인 후 변수 비교. 새 frame이면 모든 변수 신규
- `HIDDEN_KEYS = ["depth"]` 제거 (Unit 6에서)
- React key: `${depth}:${frame.funcName}:${varName}`

**Patterns to follow**:
- `src/visualizer/call-stack/CallStack.tsx:62-75` — frame 렌더 / 활성 강조 패턴
- 기존 `didChange`, `cellChanged`, `cell2dChanged` 재사용

**Test scenarios**:
- Test expectation: none — 프론트 단위 테스트는 프로젝트 관행상 없음. 손 검증으로:
  - AddTen(5) — AddTen 진입 시 두 번째 frame 카드, 리턴 시 사라짐
  - factorial(3) — 3-depth frame 진입/리턴
  - permutations — 백트래킹 시 frame 사라짐 visual confirm
  - 변경된 변수만 노란 outline 유지 (기존 강조 동작)

**Verification**:
- 손 테스트로 프레임 visual 동작 확인
- 변경 강조 회귀 없음

---

### - [ ] **Unit 6: 정리 — 죽은 코드 제거 + AGENTS.md 학습 (deferred)**

**Goal**: D5 (`tracedFuncName`, `insideTracedFunc`) 제거. `HIDDEN_KEYS = ["depth"]` 잔존 검색 후 제거. AGENTS.md 학습은 별도 follow-up으로 분리.

**Requirements**: 비-기능, 부채 정리

**Dependencies**: Unit 1-5 모두

**Files**:
- Modify: `src/engine/analyzer.ts` — `tracedFuncName` 분기 제거
- Modify: `src/engine/transformer.ts` — `insideTracedFunc` boolean 제거
- Modify: `src/visualizer/variable-panel/VariablePanel.tsx` — `HIDDEN_KEYS` 제거
- Search: `src/algorithm/presets/`, `src/engine/executor.ts` — `step.variables` 잔존 참조

**Approach**:
- 모든 함수가 추적되므로 `tracedFuncName` 분기는 항상 true → 단순화
- AGENTS.md 학습 추가는 **이번 plan에서 제외** (M5/M7 reviewer feedback). 별도 follow-up.

**Test scenarios**:
- Test expectation: none — 죽은 코드 제거. 기존 테스트 유지 통과

**Verification**:
- `pnpm exec tsc --noEmit` 통과
- `pnpm test` 모든 통과
- `git grep "tracedFuncName"`, `git grep "insideTracedFunc"`, `git grep "step.variables"` 결과 0

## System-Wide Impact

- **Interaction graph**:
  - Step 모델 변경의 직접 영향:
    - `useAlgorithmPlayer` (player) → `currentStep` 그대로 전달, 모델 무관
    - `VariablePanel` — 새 frames 모델
    - **`ResultPanel`** — `getResultFromFrames` 헬퍼로 격리 (D7)
    - `CallStack` — `activePath`만 읽음, 영향 없음 (D10 보장)
    - `CodePanel`, `StepperControls` — codeLine/description 등, 영향 없음
  - 워커 측 직접 영향:
    - `pyodide-worker.ts` — single-frame 어댑터 (D7)
    - `tracer.py.ts` — 손대지 않음 (Python tracer 자체는 평면 emit, adapter가 변환)
- **Error propagation**:
  - Worker 안 throw → Proxy의 finally에서 `__popFrame()` 보장 → callStack 정합성 유지
  - 메인 스레드는 worker `error` 메시지로만 받음 — 변경 없음
- **State lifecycle risks**:
  - Frame push/pop pairing — D1 binding (Proxy가 finally 단독)으로 보장
  - 백트래킹 (throw로 가지 끊기) — 기존 `node.status='backtracked'` 패턴 유지하되 frame도 같이 pop
  - **Closure mutation** (D4 caveat): parent frame snapshot이 stale로 유지됨. 의도된 동작이며 known limitation
- **API surface parity**:
  - `RunClient`, `EmbedClient`, `CustomVisualizerClient` — `executeCode` 호출 후 `result.steps`를 `useAlgorithmPlayer`에 넘김. Step 모델 자동 적용
  - PostHog 이벤트 — step.variables 참조 안 함 (변경 없음)
- **Integration coverage**:
  - AddTen / factorial / permutations / closure mutation / callback (Array.map) / empty body 시나리오 — Unit 4 test scenarios로 커버
  - Python 시각화 회귀 — Unit 1 손 검증
  - ResultPanel preset 결과 표시 회귀 — Unit 1 손 검증
- **Unchanged invariants**:
  - `TreeNode` 모델 (호출 트리) — 그대로 (D10 보장)
  - `Step.activeNodeId`, `Step.activePath`, `Step.codeLine`, `Step.description` 등 — 그대로
  - `finalReturnValue`, `consoleLogs` — 그대로
  - `useAlgorithmPlayer` 인터페이스 — 그대로
  - CallStack UI 렌더 — 그대로

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| D1 책임 분담 미준수로 transformer와 Proxy가 중복 push/pop | D1 binding을 Plan에 명문화. transformer는 captureVars만 / Proxy는 push/pop만. Unit 3과 Unit 4를 같은 PR/세션에 함께 결정. |
| Frame snapshot payload 5-10x 폭증 | D4 (structural sharing). Unit 4 smoke test로 검증 |
| Closure mutation snapshot stale | D4 caveat에 명시. 사용자에게 의도된 동작이라 표시 (UI에 indicator 가능 — 별도 follow-up) |
| Callback (Array.map 등) wrap 누락 | D12로 명문화. Unit 3 test scenario로 검증 |
| Python 컨슈머 깨짐 | D7로 single-frame 어댑터. Unit 1 손 검증 |
| ResultPanel 깨짐 | D7로 `getResultFromFrames` 헬퍼. Unit 1 손 검증 |
| MAX_STEPS 하드코딩 위치 변경으로 worker 받기 누락 | Unit 2에서 payload 통해 전달. Unit 4 smoke test로 간접 검증 |
| `__createProxy` 모든 함수 적용 시 TreeNode 폭발 | D10으로 TreeNode는 재귀만 명문화 |
| 익명 함수 funcName 정책 미정으로 frame 표시 깨짐 | D11로 명문화 (parent context 기반) |
| `build-worker-code.ts:194-195` 동기화 누락 | Unit 4 체크리스트에 ⚠️ 명시. ReferenceError로 즉시 실패 → 발견 쉬움 |
| 정체성 drift / 사용자 멘탈모델 변화 | D6로 명시적 product decision. 사용자 onboarding 영향은 별도 follow-up (P3) |
| 학습 효과 검증 부재 (P5 reviewer) | Success Criteria에 손 검증 단계 포함. 사용자가 직접 검증 (도구 운영자 == 사용자) |

## Documentation / Operational Notes

- **사용자 영향**: 이번 변경의 가장 큰 변화는 "함수가 끝나면 그 변수가 사라진다" — 디버거 멘탈모델. 기존 사용자가 "어 왜 num이 사라졌지?" 물을 수 있음
  - **Mitigation 옵션** (별도 follow-up):
    - README/홈에 짧은 안내 ("variables now follow function scope")
    - VariablePanel에 첫 방문 안내 toast
    - "expand all frames" 토글로 평면 dict view 옵션 (high effort)
  - 이번 plan에는 **changelog 한 줄만** 권장 (README 또는 별도 docs)
- **`docs/architecture-walkthrough.md`** Step 모델 섹션 갱신 — 별도 follow-up commit
- **AGENTS.md 학습 추가** — 별도 follow-up (M5/M7)

## Sources & References

- **Origin context**: 2026-04-18 HomeEditor 리팩토링 브레인스토밍 → AddTen num=null 시나리오 → 사용자 frame 모델 직접 제안
- **Document review (2026-04-18)**: 5 reviewer agents (coherence, feasibility, product-lens, scope-guardian, adversarial) 발견사항 통합. Critical findings (C1-C4) + High findings (H1-H4) 모두 plan 반영
- Related plans:
  - `docs/plans/2026-04-14-001-refactor-pipeline-unification-plan.md` (모델 단일화 정신)
  - `docs/plans/2026-04-16-002-feat-python-support-plan.md` (Python 통합 — 향후 Python frame 모델 plan의 선행)
- Related code:
  - `src/engine/build-worker-code.ts`
  - `src/engine/transformer.ts`
  - `src/visualizer/variable-panel/VariablePanel.tsx`
  - `src/visualizer/result-panel/ResultPanel.tsx`
  - `src/engine/python/pyodide-worker.ts`
  - `src/visualizer/call-stack/CallStack.tsx`
- Related conventions: `AGENTS.md` §0 (책임 분리), §3 (안티패턴 카탈로그)
