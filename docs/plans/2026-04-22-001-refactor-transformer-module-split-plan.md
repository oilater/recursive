---
title: "refactor: Split transformer.ts into role-separated modules"
type: refactor
status: completed
date: 2026-04-22
---

# refactor: Split transformer.ts into role-separated modules

## Overview

`src/engine/transformer.ts`는 443줄 / 28 함수가 한 평평한 네임스페이스에 섞여 있다. AST 순회, 변수 스코프 질의, AST 노드 방출, 리턴문 래핑, 상위 오케스트레이션 — 이 다섯 가지 역할이 한 파일 안에 엉켜 있다. 이 플랜은 **역할별로 모듈을 분리**해서 각 모듈이 하나의 책임과 좁은 public surface만 갖도록 재배치한다.

**동작 변경 없음.** 외부 소비자는 `transformCode` 한 개(`executor.ts`, `transformer.test.ts`, `integration.test.ts`) 뿐이고, 이 export는 시그니처와 출력이 완전히 동일하게 보존된다. 회귀 감지는 기존 테스트(`transformer.test.ts` 30개 + `integration.test.ts` 406줄)가 담당한다.

이 플랜은 최근에 끝낸 `ast-queries` 추출(PR #17, #18, #19)과 동일한 스타일을 따른다 — 순수 헬퍼 추출, 공개 API 보존, 각 유닛마다 테스트로 회귀 감지.

## Problem Frame

`transformer.ts`는 시간이 지나면서 기능별로 작게 쪼갠 함수 28개를 쌓아왔다. 각 함수는 작고 잘 명명됐지만 **모두 한 파일에 있다**. 결과:

- 파일을 열면 레벨이 섞인 6가지 역할이 한 눈에 안 들어온다 (walk 프리미티브 → 스코프 질의 → 노드 빌더 → 래핑 정책 → 오케스트레이션).
- 내부 헬퍼가 export 없이도 "implicit 공개 surface"처럼 동작 — 새로 함수 추가할 때 어디에 두어야 자연스러운지 판단 기준이 없음.
- 리뷰 시 "이 함수는 어느 레이어에서 호출되나"를 역추적해야 한다.
- 이미 같은 engine 폴더에 `ast-queries.ts` / `ast-builders.ts`가 전용 역할 파일로 존재 → 정책 일관성이 깨짐.

메모리에 기록된 사용자의 코드 철학: **"역할과 책임을 분리하라. 이름은 책임을 말해야 한다."** — 이 플랜은 그 원칙을 `transformer.ts`에 적용한다.

## Requirements Trace

- **R1.** `transformCode(strippedCode, analysis): string`의 시그니처와 출력 문자열이 바이트 단위로 동일하게 유지된다 (회귀 감지: `transformer.test.ts` + `integration.test.ts` 100% 통과).
- **R2.** 외부에서 import하는 심볼은 `transformCode` 하나만 유지된다 — 내부 헬퍼는 export하지 않는다. (grep으로 검증한 현 상태: `executor.ts:4`, `transformer.test.ts:2`, `integration.test.ts:3`이 유일한 소비자.)
- **R3.** 각 새 모듈은 **하나의 역할**만 담는다 — AST 순회, 스코프 질의, 노드 방출, 리턴 래핑 중 하나.
- **R4.** 각 유닛은 독립적으로 머지 가능 — 유닛 종료 시점마다 `tsc --noEmit` + 기존 테스트가 모두 통과한다.
- **R5.** 기존 전역 모듈(`ast-queries.ts`, `ast-builders.ts`, `constants.ts`)과의 역할 경계 유지 — 전역 공용 헬퍼는 이 플랜에서 확장하지 않는다 (premature generalization 회피).
- **R6.** 모듈 간 의존 그래프는 DAG를 유지 — 순환 import 발생 금지.

## Scope Boundaries

**In scope:**
- `src/engine/transformer.ts` 28 함수를 역할별 모듈로 재배치
- 해당 파일의 타입/상수(`ParentInfo`, `SKIP_KEYS`, `LOOP_TYPES`)를 각자 자연스러운 모듈로 함께 이동
- 새 파일들의 테스트는 "기존 통합 테스트가 커버"로 처리 — 신규 유닛 테스트 추가는 불요 (behavior-preserving refactor)

**Out of scope:**
- `transformCode`의 동작 변경, 새 기능, 성능 최적화
- `worker.ts`, `analyzer.ts`, `executor.ts` 내부 수정 — 이들이 `transformer.ts`에서 뭘 import하는지는 바뀌지 않는다 (경로만, 심볼은 `transformCode` 그대로)
- `ast-queries.ts` / `ast-builders.ts` / `constants.ts` 확장 — 이 플랜은 transformer 내부 정리만 함
- `AstNode = any` 타입 escape hatch 정리 — 별도 pass
- 유닛 테스트 신규 추가 — 기존 통합 테스트가 충분히 촘촘함

## Context & Research

### Relevant Code and Patterns

- **`src/engine/transformer.ts`**: 이번 리팩토링 대상. 443줄, 28 함수.
- **`src/engine/ast-queries.ts`**: 같은 엔진 폴더의 기존 역할 모듈. 매우 얇음(20줄): `FUNCTION_NODE_TYPES`, `extractParamNames`, `AnyFunction` 타입. 이 플랜은 여기 **확장하지 않는다** — transformer 전용 helper를 전역으로 끌어올리는 건 premature generalization.
- **`src/engine/ast-builders.ts`**: AST 노드 빌더(`id`, `literal`, `call`, ...). transformer가 이미 import해서 사용 중. 이번에 새로 만들 `emission` 모듈이 이 위에 얹혀 의미(`markSynthetic`, `traceLineCall` 같은 transformer 전용 builder)를 추가한다.
- **`src/engine/constants.ts`**: 공용 심볼 이름(`ENTRY_FUNC_NAME`, `TRACE_LINE`, `CREATE_PROXY`, `GUARD`). 전역 공유 — 그대로 사용.
- **`src/engine/executor.ts:4`**: `transformCode` 소비자.
- **`src/engine/__tests__/transformer.test.ts`**: 단위 테스트 30개. 출력 문자열에 특정 substring이 포함되는지 검증.
- **`src/engine/__tests__/integration.test.ts`**: 통합 테스트 406줄. `__guard`/`__createProxy`/`__traceLine`을 stub으로 바꿔 변환된 코드의 실제 실행 결과(steps/tree)를 검증 — 시맨틱 회귀 감지력이 매우 높음.

### Similar Past Refactor (Pattern Reference)

- **PR #19** (`refactor(engine): extract shared AST helpers to ast-queries module`): 같은 저자, 같은 리팩토링 스타일. 테스트 무변화, 순수 이동, 단일 공용 파일 추출. 이번 플랜은 그 연장선으로 transformer **내부**에서 같은 패턴 적용.
- **PR #17, #18**: acorn-walk로 custom walker 교체, double-parse 제거 — transformer 주변 정비의 흐름.
- **`docs/plans/2026-04-19-001-refactor-worker-module-plan.md`**: 최근 완료된 worker 분리 플랜. 역할별 파일 분리 + 유닛 단위 체크리스트 + 테스트 기반 검증의 스타일 참고.

### Institutional Learnings

- **`docs/solutions/best-practices/ast-transformer-and-worker-frame-model-2026-04-18.md`** (worker-module 플랜에서 참조됨). 관련 원칙:
  - "Transformer 쪽은 emission contract만 책임진다 — `__createProxy(originalFunc, funcName, paramNames, ownVarNames, captureClosureFn)`의 5개 인자 순서가 계약." → 이 플랜은 이 계약을 건드리지 않는다.
  - `__synthetic` 마커는 transformer가 달고 worker가 조회 — 이번 리팩토링은 태깅 로직을 새 `emission` 모듈로 옮기지만 `__synthetic` 키 이름은 불변.
- **ast-queries 추출의 교훈 (`CLAUDE.md` 전역 메모리)**: acorn-walk의 `simple`/`full`은 post-order. 이 플랜은 순회 함수를 옮길 뿐 순서를 바꾸지 않는다.

### Internal Dependency DAG (확인 완료, 순환 없음)

```
ast-queries (기존)         ast-builders (기존)         constants (기존)
      └──────────┬──────────────────┬──────────────────┘
                 ↓
        transformer/traversal.ts
          (walkChildren, walkFuncBody, SKIP_KEYS)
                 ↓
        transformer/scope.ts
          (collectUserFuncNames, collectVarNamesInFuncs,
           collectOwnVarNames, collectVisibleVarNames,
           determineFuncName, hasUserFunctionCall,
           shouldWrapReturn, ParentInfo 타입)
                 ↓
        transformer/emission.ts
          (markSynthetic, captureVarsExpr, traceLineCall,
           paramArrayLiteral, closureCaptureExpr, guardCall,
           proxyReassignment)
                 ↓
        transformer/return-wrapping.ts
          (wrapReturn, wrapReturnsIn, wrapAllReturns)
                 ↓
        transformer/index.ts (orchestrator)
          (transformCode — public, walkAndTransform,
           transformBlockBody, wrapInPlace,
           LOOP_TYPES, isLoop)
```

역할별 모듈은 "한 방향으로만" 의존 — 모든 import는 전체 순위에서 위에서 아래로만 흐른다.

## Key Technical Decisions

- **Subdir layout (`src/engine/transformer/*.ts`) over flat (`src/engine/transformer-*.ts`)**: 초기엔 flat을 택했으나 Unit 1 실행 중 파일명 길이(`transformer-ast-traversal.ts`, `transformer-return-wrapping.ts`)가 지나치게 길어지는 문제 확인. subdir이면 `traversal.ts`, `scope.ts`, `emission.ts`, `return-wrapping.ts`로 짧고 의미 명확. `src/engine/javascript/` 선례도 있음. `transformer.ts` → `transformer/index.ts`로 이동해서 외부 import 경로(`from "./transformer"`)는 그대로 유지.
- **내부 헬퍼는 export하지만 외부 import는 금지**: ESLint나 기타 강제 수단은 별도 — convention으로만 유지. `transformer/index.ts` 외 다른 파일이 `transformer/*.ts`를 직접 import하면 리뷰에서 차단한다는 정책 메모만 추가(아래 "Verification" 섹션에 grep 검증 포함). 외부는 `from "./transformer"`(폴더 자체)로만 가져온다.
- **`LOOP_TYPES` + `isLoop`는 orchestrator에 남긴다**: 루프 검출 정책은 `transformBlockBody`의 "루프면 `__guard` 삽입, 반복마다 traceLine 삽입" 로직과 **물리적으로 같은 결정**이라 분리 가치 낮음. 10줄 추출을 위한 파일 하나는 과함.
- **`ParentInfo` interface는 scope 모듈로**: `determineFuncName`이 유일한 소비자이며 같이 이동.
- **`markSynthetic`은 emission 쪽**: synthetic 태깅은 "방출하는 모든 노드에 찍는 마커"라서 emission 책임과 1:1.
- **신규 유닛 테스트 추가 없음**: 이 플랜은 behavior-preserving. 기존 `transformer.test.ts`(출력 문자열 검증) + `integration.test.ts`(시맨틱 검증)가 각 유닛마다 회귀 감지. 새 파일마다 `__tests__/transformer-*.test.ts`를 만드는 건 중복.
- **유닛 순서는 DAG 말단부터 뿌리 쪽으로**: traversal → scope → emission → return-wrapping → orchestrator cleanup. 각 유닛은 완료 시점에 `transformer/index.ts`에서 해당 심볼을 `import`로 대체하는 형태가 되므로, 의존 관계가 깨지지 않는다.

## Open Questions

### Resolved During Planning

- **Q: `walkChildren`을 `ast-queries.ts`로 승격할까?** → 아니오. 현재 `ast-queries`의 소비자는 `transformer.ts` + `analyzer.ts`이고 `analyzer.ts`는 `walkChildren`을 쓰지 않는다. 승격은 premature. transformer-local로 둔다.
- **Q: subdir vs flat layout?** → Subdir (`src/engine/transformer/*.ts`). Unit 1 실행 중 파일명 길이 문제로 flat에서 subdir로 전환. `transformer.ts` → `transformer/index.ts`로 이동해서 외부 경로 `from "./transformer"` 그대로 유지.
- **Q: 각 모듈마다 `__tests__/*.test.ts`를 새로 만들까?** → 아니오. 기존 `transformer.test.ts` + `integration.test.ts`가 모든 분기를 덮는다. 신규 단위 테스트는 동일 커버리지를 중복 작성하는 꼴.

### Deferred to Implementation

- **Import 순서/정리 스타일**: 각 유닛 PR에서 prettier/lint가 해결. 플랜에서 결정할 문제 아님.
- **옮긴 함수가 새 모듈에서 내부에서만 쓰일 경우 `export` 제거 여부**: 구현 시 실제 호출 그래프를 보고 판단. 기본은 "다른 형제 모듈 또는 `transformer/index.ts`가 호출하는 것만 export, 나머지는 module-local".

## High-Level Technical Design

> *This illustrates the intended module split and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### Module responsibility chart

| Module | Public exports (index.ts가 import) | Private (module-local) | Lines (approx) |
|---|---|---|---|
| `transformer/traversal.ts` | `walkChildren`, `walkFuncBody` | `SKIP_KEYS` | ~30 |
| `transformer/scope.ts` | `collectUserFuncNames`, `collectOwnVarNames`, `collectVisibleVarNames`, `determineFuncName`, `shouldWrapReturn`, `ParentInfo` (type), `collectVarNamesInFuncs` (emission이 소비) | `hasUserFunctionCall` | ~95 |
| `transformer/emission.ts` | `markSynthetic`, `traceLineCall`, `guardCall`, `proxyReassignment`, `paramArrayLiteral`, `closureCaptureExpr` (`wrapInPlace` 호출용) | `captureVarsExpr` | ~70 |
| `transformer/return-wrapping.ts` | `wrapAllReturns` | `wrapReturn`, `wrapReturnsIn` | ~55 |
| `transformer/index.ts` (orchestrator, 축소판) | `transformCode` (외부) | `walkAndTransform`, `transformBlockBody`, `wrapInPlace`, `LOOP_TYPES`, `isLoop` | ~120 |

**합계:** 원본 443줄 → 5개 파일, 각 파일이 한 책임만. Orchestrator는 "파싱 → 사용자 함수 이름 수집 → 전체 walk/transform → return 래핑 → 코드 생성" 5단계를 선형으로 읽게 된다.

### Import graph after refactor

```
transformer/index.ts ──→ transformer/return-wrapping.ts ──→ transformer/emission.ts
     │                         │                                 │
     │                         │                                 ↓
     │                         └─────────→ transformer/scope.ts ─┴─→ transformer/traversal.ts
     │                                              │                    │
     └──────────────────────────────────────────────┴────────────────────┘
                                                    ↓
                             ../ast-queries.ts, ../ast-builders.ts, ../constants.ts (상위)
```

Orchestrator는 emission + return-wrapping + scope + traversal을 모두 조합 — 나머지 4개 파일은 서로의 상위를 모른다.

## Implementation Units

- [x] **Unit 1: Extract AST traversal primitives**

**Goal:** AST 순회 프리미티브를 독립 모듈로 분리.

**Requirements:** R3, R4, R6

**Dependencies:** None (말단 레이어)

**Files:**
- Create: `src/engine/transformer/traversal.ts`
- Move: `src/engine/transformer.ts` → `src/engine/transformer/index.ts` (외부 import 경로 `from "./transformer"` 유지)
- Test (covered, no changes): `src/engine/__tests__/transformer.test.ts`, `src/engine/__tests__/integration.test.ts`

**Approach:**
- 새 파일로 옮길 심볼: `walkChildren`, `walkFuncBody`, `SKIP_KEYS`.
- `SKIP_KEYS`는 `walkChildren` 내부 정책이므로 module-local (export 안 함).
- `walkFuncBody`는 `FUNC_TYPES`를 사용 — `ast-queries`의 `FUNCTION_NODE_TYPES`를 재import해서 사용.
- 기존 `transformer.ts`를 `transformer/index.ts`로 이동하면서 상위 레벨 sibling import는 `./types` → `../types` 식으로 한 단계 올린다.
- `transformer/index.ts`에 `import { walkChildren, walkFuncBody } from "./traversal"` 추가.

**Patterns to follow:**
- `src/engine/ast-queries.ts` (공용 AST 헬퍼 모듈 스타일).
- `src/engine/javascript/` (subdir에 역할별 파일 배치 선례).

**Test scenarios:**
- Test expectation: none — behavior-preserving move. 기존 테스트가 회귀 감지한다.

**Verification:**
- `npx vitest run src/engine/__tests__/` 통과 (38개 이상).
- `npx tsc --noEmit` 에러 없음.
- `rg "function (walkChildren|walkFuncBody)" src/engine/transformer/index.ts` 결과 0건.
- `rg "from ['\"]\\./traversal['\"]" src/engine/transformer` 결과는 `index.ts` 1건만.
- `rg "from ['\"]\\./transformer/" src/engine` 결과 0건 (외부 파일은 `transformer/*.ts`를 직접 import하지 않음 — `./transformer`만 사용).

---

- [x] **Unit 2: Extract scope and naming queries**

**Goal:** 변수/함수 이름 수집과 결정 로직을 독립 모듈로 분리.

**Requirements:** R3, R4, R6

**Dependencies:** Unit 1 (walkChildren, walkFuncBody 사용)

**Files:**
- Create: `src/engine/transformer/scope.ts`
- Modify: `src/engine/transformer/index.ts`

**Approach:**
- 새 파일로 옮길 심볼:
  - `collectUserFuncNames` (export)
  - `collectVarNamesInFuncs` (export — emission이 소비)
  - `collectOwnVarNames` (export — orchestrator의 `transformBlockBody`/`wrapInPlace`에서 직접 소비)
  - `collectVisibleVarNames` (export)
  - `determineFuncName` (export)
  - `hasUserFunctionCall` (module-local — `shouldWrapReturn`의 helper)
  - `shouldWrapReturn` (export — Unit 4 return-wrapping이 소비)
  - `ParentInfo` interface (export as type — orchestrator의 `walkAndTransform`가 파라미터 타입으로 사용)
- import 관계: `./traversal`에서 `walkChildren`, `walkFuncBody` 가져오고, `../ast-queries`에서 `FUNCTION_NODE_TYPES`, `extractParamNames` 가져오고, `../constants`에서 `ENTRY_FUNC_NAME` 가져온다.

**Patterns to follow:**
- `src/engine/ast-queries.ts`의 export 스타일.

**Test scenarios:**
- Test expectation: none — behavior-preserving move.

**Verification:**
- 기존 테스트 모두 통과.
- `npx tsc --noEmit` 에러 없음.
- `transformer/index.ts`에서 해당 함수들의 `function ...` 정의가 0건.

---

- [x] **Unit 3: Extract AST emission builders**

**Goal:** 변환된 AST 노드를 만들어내는 emission 레이어 분리.

**Requirements:** R3, R4, R6

**Dependencies:** Unit 2 (`closureCaptureExpr`가 `collectVarNamesInFuncs`를 사용)

**Files:**
- Create: `src/engine/transformer/emission.ts`
- Modify: `src/engine/transformer/index.ts`

**Approach:**
- 새 파일로 옮길 심볼:
  - `markSynthetic` (export — Unit 4 return-wrapping과 orchestrator가 사용)
  - `captureVarsExpr` (module-local — `traceLineCall`의 helper)
  - `traceLineCall` (export)
  - `paramArrayLiteral` (export — `proxyReassignment` + orchestrator의 `wrapInPlace`가 소비)
  - `closureCaptureExpr` (export — orchestrator의 `wrapInPlace`가 소비)
  - `guardCall` (export)
  - `proxyReassignment` (export)
- `wrapInPlace`는 orchestrator에 남지만 `paramArrayLiteral` + `closureCaptureExpr`을 호출하므로 이 두 개는 emission에서 export 필요.
- Import: `../ast-builders` 전부, `../constants`의 `TRACE_LINE`/`CREATE_PROXY`/`GUARD`, `./scope`의 `collectVarNamesInFuncs`.

**Patterns to follow:**
- `src/engine/ast-builders.ts`의 빌더 함수 컨벤션.

**Test scenarios:**
- Test expectation: none — behavior-preserving move.

**Verification:**
- 기존 테스트 모두 통과.
- `transformer.test.ts`의 "`__traceLine` 포함 확인", "`__createProxy` 포함 확인", "`__guard` 포함 확인" 시나리오가 emission 경로를 커버.

---

- [x] **Unit 4: Extract return-statement wrapping**

**Goal:** 리턴문을 감지하고 `__traceLine` + `__ret` 구조로 래핑하는 로직을 독립 모듈로 분리.

**Requirements:** R3, R4, R6

**Dependencies:** Unit 1, 2, 3

**Files:**
- Create: `src/engine/transformer/return-wrapping.ts`
- Modify: `src/engine/transformer/index.ts`

**Approach:**
- 새 파일로 옮길 심볼:
  - `wrapReturn` (module-local)
  - `wrapReturnsIn` (module-local)
  - `wrapAllReturns` (export — orchestrator의 `transformCode`가 호출)
- Import:
  - `./traversal`: `walkChildren`
  - `./scope`: `collectVisibleVarNames`, `shouldWrapReturn`
  - `./emission`: `markSynthetic`, `traceLineCall`
  - `../ast-queries`: `FUNCTION_NODE_TYPES`
  - `../ast-builders`: `block`, `ret`, `id`, `varDecl`
  - `../constants`: `ENTRY_FUNC_NAME`

**Patterns to follow:**
- Unit 1~3에서 확립된 import 스타일.

**Test scenarios:**
- Test expectation: none — behavior-preserving.
- 시맨틱 커버리지: `transformer.test.ts`의 "재귀 함수에 `__createProxy` 재할당을 삽입한다", "변수 스냅샷을 `__traceLine`에 전달한다" 시나리오가 이 경로를 실제로 돌려본다.

**Verification:**
- 기존 테스트 모두 통과.
- `rg "function (wrapReturn|wrapReturnsIn|wrapAllReturns)" src/engine/transformer/index.ts` 결과 0건.

---

- [x] **Unit 5: Orchestrator cleanup and final verification**

**Goal:** `transformer/index.ts`에 남은 것이 오케스트레이션 책임만인지 확인하고, import 블록을 정리하고, 전체 회귀 검사를 실행.

**Requirements:** R1, R2, R3, R4, R6

**Dependencies:** Unit 1, 2, 3, 4

**Files:**
- Modify: `src/engine/transformer/index.ts`

**Approach:**
- `transformer/index.ts`에 남아 있어야 하는 심볼: `transformCode` (export), `walkAndTransform`, `transformBlockBody`, `wrapInPlace`, `LOOP_TYPES`, `isLoop`. 그 외 정의가 있다면 누락된 이동이 있는지 점검.
- Import 블록 정리 — 사용하지 않는 import 제거.
- 외부 import 경로가 바뀌었는지 재확인: `executor.ts:4`, 테스트 2건은 `from "./transformer"` 또는 `from "../transformer"` 그대로 — 폴더의 `index.ts`로 자동 해석됨.

**Patterns to follow:**
- Unit 1~4의 정리된 상태.

**Test scenarios:**
- Test expectation: none — behavior-preserving. 최종 회귀 감지가 전부.

**Verification:**
- `npx vitest run` 전체 테스트 스위트 통과.
- `npx tsc --noEmit` 에러 없음.
- `rg "from ['\"]\\./transformer/" src/engine | rg -v "src/engine/transformer/index.ts"` 결과 0건 (외부에서 `transformer/*.ts`를 직접 import하는 파일이 없음을 확인).
- `rg "from ['\"][\\./]+transformer['\"]" src/engine` 결과가 `executor.ts`, `transformer.test.ts`, `integration.test.ts` 3건과 일치.
- 수동 한 차례 빌드 (`npm run build`) 성공 — Next.js webpack이 폴더 해석을 문제없이 처리하는지 확인.

## System-Wide Impact

- **Interaction graph:** 외부에 노출되는 API는 `transformCode` 하나로 변동 없음. `executor.ts`와 두 테스트 파일의 import 문도 **경로 불변** (`./transformer`에서 그대로 import).
- **Error propagation:** 기존 `transformCode` 내부에서 발생하던 acorn parse 에러 경로 동일. 새 모듈들은 throw하지 않는 순수 함수들.
- **State lifecycle risks:** 없음 — 모든 함수는 stateless 순수 / AST 노드를 in-place 변형. 모듈 분리로 인한 state 공유 경계 변동 없음.
- **API surface parity:** transformer가 방출하는 `__createProxy(...)` 호출의 5-인자 시그니처 유지 — worker 쪽 `__createProxy` 구현과의 계약 불변 (this is the critical contract; verified by integration.test.ts).
- **Integration coverage:** `integration.test.ts`가 stub 런타임으로 전체 파이프라인을 돌림. 각 유닛 이후 이 테스트를 돌리는 것만으로도 시맨틱 회귀 감지 가능.
- **Unchanged invariants:**
  - `__synthetic` 마커 이름 및 태깅 시점 불변
  - `ENTRY_FUNC_NAME = "__entry__"`를 비롯한 `constants.ts` 심볼 불변
  - `transformCode(strippedCode, analysis): string` 시그니처 및 출력 동일
  - `_analysis` 파라미터가 현재 사용되지 않는 사실도 그대로 둠 (별도 cleanup pass 대상)

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 순환 import가 실수로 유입될 수 있음 | DAG 설계대로 구현 + 각 유닛 후 `npx tsc --noEmit` (TS가 순환을 잡음). 플랜의 Internal Dependency DAG 섹션 참조 |
| `collectVarNamesInFuncs`의 export 여부 판단 실수로 Unit 2와 Unit 3 사이 수정 사이클 발생 | Unit 2 구현 시 이 헬퍼를 처음부터 **export**로 노출. 플랜의 Unit 3 Approach에서 명시 |
| 유닛 중간에 회귀가 숨어들 가능성 | 각 유닛마다 `vitest run src/engine/__tests__/` + `tsc --noEmit`을 **통과하는 커밋**만 유닛을 완료로 표시 |
| 큰 diff로 인한 리뷰 피로 | 유닛마다 1 PR 또는 1 커밋으로 원자화 — 파일 1개 신설 + `transformer/index.ts` 편집만 담기 |
| "이 함수는 `scope` 책임인가 `emission` 책임인가" 판단 애매 | 플랜의 Module responsibility chart에 각 심볼 확정 배정 — 구현 시점에 재판정 금지 |

## Documentation / Operational Notes

- `docs/architecture-walkthrough.md`에서 `transformer.ts`를 참조하는 라인이 있는지 Unit 5에서 한 번 확인. 있다면 모듈 맵 참조를 1~2줄 추가하고, 없으면 그냥 둠.
- `CLAUDE.md` / `AGENTS.md`에 이 리팩토링의 결과를 반영할 필요는 없음 — 내부 구현 세부라서 agent 지침에 영향 없음.
- 리뷰어 가이드: 각 유닛 PR 본문에 "이동만, 동작 변경 없음. `vitest run` + `tsc --noEmit` 통과 확인"을 명시.

## Sources & References

- Target file: `src/engine/transformer.ts`
- Test files: `src/engine/__tests__/transformer.test.ts`, `src/engine/__tests__/integration.test.ts`
- Related existing modules: `src/engine/ast-queries.ts`, `src/engine/ast-builders.ts`, `src/engine/constants.ts`
- Recent parallel refactor: PR #19 (ast-queries 추출) — 같은 스타일, 같은 저자
- Related plan: `docs/plans/2026-04-19-001-refactor-worker-module-plan.md` (worker 분리, 동일 기조)
- Institutional learning: `docs/solutions/best-practices/ast-transformer-and-worker-frame-model-2026-04-18.md`
