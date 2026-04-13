---
title: "재귀 시각화 사이트 FSD 아키텍처 및 커스텀 코드 실행 패턴"
date: "2026-04-13"
category: best-practices
module: recursion-visualizer
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - "프론트엔드 프로젝트를 Feature-Sliced Design으로 리팩토링할 때"
  - "직렬화 가능한 메타데이터와 런타임 함수를 분리해야 할 때"
  - "사용자 코드를 Proxy + AST로 런타임 추적해야 할 때"
  - "여러 모듈이 동일한 객체 생성 패턴을 공유할 때"
tags:
  - fsd-architecture
  - feature-sliced-design
  - nextjs
  - proxy-tracing
  - ast-transformation
  - web-worker
  - curried-factory
  - es-toolkit
  - refactoring
---

# 재귀 시각화 사이트 FSD 아키텍처 및 커스텀 코드 실행 패턴

## Context

코딩테스트 준비생을 위한 재귀 알고리즘 시각화 사이트를 Next.js 16 + TypeScript + Vanilla-Extract + SVG로 구축했다. 4개 프리셋 알고리즘(순열, 조합, 부분집합, N-Queen)과 사용자가 직접 코드를 붙여넣어 시각화하는 커스텀 모드를 포함한다.

초기 구현은 동작했지만 몇 가지 구조적 문제가 있었다:

- **Side-effect import 의존**: `import "@/lib/algorithms"` 로 알고리즘을 등록 — 순서 민감, tree-shaking 불가
- **직렬화 문제**: `AlgorithmConfig`에 `stepGenerator` 함수가 포함되어 Server→Client 경계에서 직렬화 에러
- **보일러플레이트**: 4개 알고리즘이 동일한 Step/TreeNode 생성 코드를 각자 반복
- **평탄 구조**: `components/`, `lib/`, `hooks/`, `types/` 평탄 디렉토리로 도메인 경계 불명확
- **shared에 도메인 로직 혼재**: step-factory(알고리즘 전용)가 shared/lib에 있었음

이를 FSD(Feature-Sliced Design) 아키텍처로 리팩토링하고, 여러 패턴을 적용하여 해결했다.

## Guidance

### 1. 직렬화 가능한 메타데이터와 런타임 함수 분리

```typescript
// Before: 함수 포함 → Server Component에서 사용 불가
interface AlgorithmConfig {
  id: string;
  name: string;
  stepGenerator: StepGenerator; // 직렬화 불가
}

// After: 메타(직렬화 안전) + Map(Client 전용) 분리
interface AlgorithmMeta {  // Server/Client 양쪽 안전
  id: string;
  name: string;
  code: string;
  isPremium: boolean;
}
const generatorMap = new Map<string, StepGenerator>(); // Client 전용
```

레지스트리가 이 두 가지를 별도로 관리:
```typescript
export function registerAlgorithm(meta: AlgorithmMeta, generator?: StepGenerator): void {
  metaRegistry.push(meta);
  if (generator) generatorMap.set(meta.id, generator);
}
// Server: getMeta(id) → AlgorithmMeta
// Client: getStepGenerator(id) → StepGenerator
```

### 2. Side-effect import → 명시적 초기화 함수

```typescript
// Before: 숨겨진 의존성
import "@/lib/algorithms";

// After: 명시적, 제어 가능, tree-shakeable
import { initializeAlgorithms } from "@/features/preset-algorithms";
initializeAlgorithms();
```

### 3. Curried step-factory로 보일러플레이트 제거

`entities/algorithm/lib/step-factory.ts`:
```typescript
// 함수명을 고정하면 (ctx, args) => TreeNode 반환
const makeNode = createNodeFactory("permute");

// context를 고정하면 { pushCall, pushReturn } 반환
const { pushCall, pushReturn } = createStepPushers(ctx);

// 사용: 3줄 셋업으로 4개 알고리즘 공통
const ctx = createTraceContext();
const makeNode = createNodeFactory("permute");
const { pushCall, pushReturn } = createStepPushers(ctx);
```

### 4. 중첩 재귀 함수의 Proxy 추적 — 스코프 인식 AST 변환

사용자가 이런 코드를 붙여넣었을 때:
```typescript
function exist(board, word) {
  function backtrack(r, c, depth) { ... backtrack(r+1, c, depth+1) ... }
  backtrack(0, 0, 0);
}
```

핵심: `backtrack = __createProxy(backtrack)` 삽입을 **exist 내부 스코프**에서 해야 한다. 최상위에 삽입하면 `backtrack`이 스코프에 없어서 동작하지 않는다.

AST transformer가 `walkAndTransform`으로 모든 body 배열을 재귀 순회하며, FunctionDeclaration 직후에 proxy 재할당을 삽입:
```typescript
if (stmt.type === "FunctionDeclaration" && stmt.id?.name === funcName) {
  newBody.push(createProxyReassignment(funcName));
}
```

### 5. FSD 디렉토리 구조

```
src/
├── app/                           # Pages (Next.js routing)
├── entities/
│   ├── algorithm/                 # 알고리즘 도메인 모델
│   │   ├── model/ (types, registry)
│   │   ├── lib/ (step-factory)    # 도메인 전용 팩토리
│   │   └── ui/ (AlgorithmCard)
│   └── custom-code/               # 코드 분석 도메인 (순수 로직)
│       ├── model/ (analyzer, transformer, strip-types, types)
│       └── lib/ (executor, build-worker-code)
├── features/
│   ├── preset-algorithms/         # 알고리즘 config + generator
│   ├── custom-code/ui/            # UI만 (CodeEditor, ArgumentForm)
│   ├── player/                    # 재생 훅
│   └── visualizer/                # 시각화 위젯들
└── shared/
    ├── lib/ (clone, array, validate, format, shiki, tree-layout)
    └── styles/ (theme, global)
```

**원칙**: entities에는 도메인 모델 + 순수 로직, features에는 UI + 사용자 기능, shared에는 진짜 범용 유틸만.

### 6. es-toolkit 활용

| es-toolkit 함수 | 적용 위치 | 대체한 패턴 |
|---|---|---|
| `cloneDeep` | `shared/lib/clone.ts` | `JSON.parse(JSON.stringify())` |
| `uniq` | `shared/lib/validate.ts` → `hasDuplicates()` | `new Set().size` 비교 |
| `omit` | VariablePanel → 숨길 변수 제외 | `Object.entries().filter()` |
| `flatMap` | `shared/lib/array.ts` → `countInMatrix()` | `.flat().filter()` |

### 7. useEffect 콜백 이름 + 훅 반환타입 명시

```typescript
// Before
useEffect(() => { ... }, [steps]);

// After
useEffect(function syncStepsRef() { ... }, [steps]);
useEffect(function autoPlayInterval() { ... return function cleanup() { clearInterval(interval); }; }, [...]);
```

## Why This Matters

- **Meta/Generator 분리**: Next.js App Router에서 Server→Client 직렬화 경계를 타입 수준에서 강제. 런타임 에러가 컴파일 타임 에러로 전환.
- **명시적 초기화**: 의존 그래프가 가시적. 테스트에서 특정 알고리즘만 등록 가능.
- **Curried factory**: Step 인터페이스 변경 시 step-factory 하나만 수정. 새 알고리즘 추가 시 3줄 셋업으로 시작.
- **스코프 인식 변환**: 이것 없이는 `exist()` 안의 `backtrack()` 같은 일반적 백트래킹 패턴이 시각화 불가.
- **FSD 구조**: 새 도메인 추가 시 어디에 놓을지 명확. shared에 도메인 로직이 섞이지 않음.

## When to Apply

- Next.js App Router에서 Server/Client 경계를 넘는 데이터가 함수를 포함할 때
- 3개 이상 모듈이 동일한 객체 생성 패턴을 반복할 때
- `import "..."` side-effect로 모듈을 등록하는 패턴이 있을 때
- 사용자 코드를 AST 수준에서 변환할 때 중첩 스코프를 고려해야 할 때
- 프론트엔드 프로젝트가 20+ 컴포넌트로 성장하여 도메인 경계가 필요할 때
- useEffect가 컴포넌트당 2개 이상일 때 (항상 이름 붙이기)

## Examples

### 새 알고리즘 추가 시 (FSD + step-factory)

```typescript
// features/preset-algorithms/merge-sort.ts
import type { AlgorithmMeta } from "@/entities/algorithm";
import { createTraceContext, createNodeFactory, createStepPushers } from "@/entities/algorithm/lib/step-factory";

export const mergeSortMeta: AlgorithmMeta = { id: "merge-sort", name: "머지소트", ... };

function generateSteps(input) {
  const ctx = createTraceContext();
  const makeNode = createNodeFactory("mergeSort");
  const { pushCall, pushReturn } = createStepPushers(ctx);
  // ... 알고리즘 로직
  return { steps: ctx.steps, tree: rootTree };
}

export const mergeSortGenerator = generateSteps;
```

```typescript
// features/preset-algorithms/index.ts — 한 줄 추가만
freeAlgorithms.push({ meta: mergeSortMeta, generator: mergeSortGenerator });
```

### 커스텀 코드 분석 재사용 (entities 분리 덕분)

```typescript
// 새로운 feature에서 analyzer 재사용
import { analyzeCode } from "@/entities/custom-code";
const { analysis } = analyzeCode(userCode);
// analysis.recursiveFuncName, analysis.recursiveParamNames 등 활용
```

## Related

- `docs/brainstorms/recursion-visualizer-requirements.md` — 원본 요구사항
- `docs/plans/2026-04-12-001-feat-recursion-visualizer-mvp-plan.md` — MVP 구현 플랜 (경로는 리팩토링 전 구조 기준)
- `docs/plans/2026-04-13-001-feat-custom-code-visualizer-plan.md` — 커스텀 코드 기능 플랜
