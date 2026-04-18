---
title: AST transformer + Web Worker frame model — five non-obvious lessons
date: 2026-04-18
category: best-practices
module: engine
problem_type: best_practice
component: tooling
severity: high
applies_when:
  - 사용자 코드를 AST 변환하여 trace 코드를 삽입하는 transformer를 작성할 때
  - Web Worker가 step 데이터를 메인 스레드로 postMessage 직렬화할 때
  - call stack 기반 frame 모델로 데이터 모델을 마이그레이션할 때
  - 큰 plan을 multi-agent review로 검증한 뒤 implementation에 들어갈 때
tags: [ast, web-worker, transformer, frame-model, postmessage, refactoring]
---

# AST transformer + Web Worker frame model — five non-obvious lessons

`Step.variables` 평면 dict를 `Step.frames` 콜스택 모델로 마이그레이션하면서 손쉽게 빠지는 함정 5가지. 각각 한 번씩 머리를 박고 발견했다.

## Context

알고리즘 시각화 도구 Recursive에서 사용자가 보고한 시나리오:

```javascript
function AddTen(num) { return num + 10; }
const a = AddTen(5);
```

마지막 step의 변수 패널에 `a=15`, `num=null`로 잔존. 사용자는 "함수가 끝나면 변수도 사라져야 한다"고 — 디버거 멘탈모델 — 직접 요구했다. 평면 `Step.variables: Record<string, unknown>` 모델을 콜스택 frame 배열 `Step.frames: Frame[]`으로 교체.

작업 범위:
- `src/engine/analyzer.ts`, `src/engine/transformer.ts` (AST 재작성)
- `src/engine/build-worker-code.ts` (worker 런타임)
- `src/algorithm/types.ts` (Step 모델)
- `src/visualizer/variable-panel/VariablePanel.tsx`, `src/visualizer/result-panel/ResultPanel.tsx`
- `src/engine/python/pyodide-worker.ts` (어댑터)

## Guidance

다섯 가지 학습. 각각이 한 번 빠진 함정에 대응한다.

### 1. Hybrid binding — "스코프"와 "lifetime"을 다른 레이어가 책임지게 분리

처음엔 frame push/pop을 transformer가 AST로 직접 삽입하려 했다. 결국 모든 함수에 `tryFinally` 빌더가 필요하고, 다중 return / throw / arrow expression body의 implicit return 등 edge case가 transformer 책임으로 폭발.

근본 분리:

| 책임 | 누가 안다 | 어디서 처리 |
|---|---|---|
| Frame **lifetime** (push/pop, 예외 cleanup) | runtime — 호출이 일어나는 시점 | Worker의 `__createProxy` |
| Frame **content** (어떤 변수가 보이는가) | static — lexical scope | Transformer가 함수마다 자체 `__captureVars` closure 삽입 |

이 분리를 명문화하고 나니 analyzer의 "함수별 변수 이름 사전 수집" 작업 자체가 사라졌다. 각 함수의 captureVars closure가 자기 lexical scope의 변수만 자동으로 try-access. JS 스코프 규칙이 데이터 구조를 대신 만들어줌.

```typescript
// transformer.ts — 모든 함수 본문 시작에 자체 captureVars만 삽입
function transformBlockBody(node, enclosingFunc) {
  if (isFuncBody && !captureInjected) {
    newBody.push(captureVarsInit(collectFunctionVarNames(enclosingFunc)));
    captureInjected = true;
  }
  // ... __pushFrame/__popFrame은 삽입하지 않음
}

// build-worker-code.ts — Proxy가 lifetime 단독 관리
function __createProxy(originalFunc, funcName, paramNames) {
  return new Proxy(originalFunc, {
    apply(target, thisArg, argsList) {
      var seedVars = {};
      for (var i = 0; i < paramNames.length; i++) {
        seedVars[paramNames[i]] = deepClone(argsList[i]);
      }
      callStack.push({ funcName, variables: seedVars });
      try { return Reflect.apply(target, thisArg, argsList); }
      finally { callStack.pop(); }
    }
  });
}
```

### 2. Synthetic AST 노드는 한 marker로 일관되게 — 마커 누락이 stack overflow

처음 transformer 구현 시 `__transformed`, `__captureVarsInjected` 등 ad-hoc marker가 늘어남. captureVars의 새 FunctionExpression이 walkAndTransform에 의해 다시 transformBlockBody → 그 안에 또 captureVars 삽입 → 또 walk → ... **무한 재귀, stack overflow**.

세 차례 patch로 막으려다 보니 점점 더 복잡. 근본 fix:

```typescript
function walkAndTransform(node, enclosingFunc) {
  if (!node || typeof node !== "object" || node.__synthetic) return;
  // ... 사용자 AST만 처리
}

function mark(node) { node.__synthetic = true; return node; }

function captureVarsInit(varNames) {
  return mark(varDecl(CAPTURE_VARS, funcExpr([], block([...]))));
}
function traceLineCall(line)         { return mark(expr(call(...))); }
function proxyReassignment(name, ps) { return mark(expr(...)); }
function guardCall()                  { return mark(expr(call(id(GUARD)))); }
```

**규칙**: helper로 만든 모든 노드에 `__synthetic` 마킹 + walker 첫 줄에서 즉시 return. 사용자 AST와 helper AST의 경계를 한 곳에서 명확히. 마커 누락 patch가 늘어난다는 신호 = walker가 자기 출력을 다시 처리하고 있다는 신호.

### 3. `const f = () => ...`는 reassignment 못 — init을 in-place wrap

기존 transformer는 재귀 함수만 wrap했고 `function fib(...)` (FunctionDeclaration)에 다음 statement로 `fib = __createProxy(fib, ...)` 추가. 이는 hoisted function이라 OK.

모든 함수로 확장하면서 `const double = (n) => n * 2`도 wrap 필요. 순진하게 `double = __createProxy(double, ...)` 추가하면:

```
TypeError: Assignment to constant variable.
```

const는 binding 변경 불가. 근본 fix:

```typescript
// FunctionDeclaration: 정의 후 reassignment (var-like, hoisted)
if (stmt.type === "FunctionDeclaration" && ...) {
  newBody.push(proxyReassignment(stmt.id.name, ...));
}

// VariableDeclarator + Function/Arrow: init 자체를 in-place wrap
if (stmt.type === "VariableDeclaration" && ...) {
  for (const decl of stmt.declarations) {
    if (... function/arrow init ...) {
      decl.init = wrapFunctionInProxy(decl.init, decl.id.name);
      // const double = __createProxy((n) => n * 2, "double", ["n"])
    }
  }
}
```

bind type별로 다른 패턴. const/let/var binding 호환성을 처음부터 신경써야 한다.

### 4. Web Worker postMessage는 함수를 직렬화 못 함 — 저장 시점에 deepClone

`__createProxy` 모든 함수 적용 후 worker가 다음 에러:

```
Failed to execute 'postMessage' on 'DedicatedWorkerGlobalScope':
function addTen(num) { ... } could not be cloned.
```

원인 분석:
1. `collectFunctionVarNames`가 hoisted FunctionDeclaration 이름까지 lexical scope에 포함 → `__entry__`의 captureVars가 `addTen` 변수를 try-access
2. `addTen`은 함수 (Proxy로 wrap됨)
3. `__traceLine`이 active frame.variables에 raw value 저장 — **함수 그대로**
4. 다음 step에서 다른 함수가 push되면 `__entry__`는 parent. **structural sharing**으로 reference만 공유.
5. `snapshotFrames`는 active frame만 deep clone, parent는 reference. parent.variables에 raw 함수 잔존
6. step.frames postMessage 시 structured clone algorithm이 함수 만나서 throw

근본 fix — **저장 시점에 clone**:

```javascript
function __traceLine(line, varsSnapshot) {
  var top = callStack[callStack.length - 1];
  if (varsSnapshot) {
    for (var k in varsSnapshot) {
      if (varsSnapshot.hasOwnProperty(k)) {
        top.variables[k] = deepClone(varsSnapshot[k]);  // ← 저장 시점에
      }
    }
  }
  // ...
}
```

이러면 frame.variables 어디 있든 (active든 parent든) 항상 clone-safe. 함수는 `'[Function: name]'` 문자열로 저장. structural sharing 안전성 회복.

**일반 원칙**: structured clone 통과해야 하는 데이터는 **수집 시점에 정규화**. 직렬화 시점에서 막으려 하면 reference 공유의 미묘한 leak이 따라옴.

### 5. Document-review의 cross-cutting 가정 검증

Plan에 "Step.variables 직접 참조하는 곳: VariablePanel만"이라 단언. document-review의 feasibility/adversarial reviewer가 grep으로 검증:

- `src/visualizer/result-panel/ResultPanel.tsx:29-33` — `step.variables.result` 사용
- `src/engine/python/pyodide-worker.ts:86` — Python step에 `variables` emit
- `src/engine/python/tracer.py.ts` — 7곳에서 `variables` 키

→ Plan의 "VariablePanel만" 단언은 거짓. Atomic replace를 강행했다면 ResultPanel 깨짐 + Python 전체 깨짐.

**원칙**: "X를 사용하는 곳은 Y뿐이다" 같은 cross-cutting 단언은 plan 작성 시 항상 grep으로 검증. AI agent가 작성한 plan 특히. document-review가 잡아주지만, plan 작성 자체에서 한 번 더 grep 박는 게 비용 대비 효과 좋음.

## Why This Matters

이 5개를 따로 보면 작은 detail이지만, 합쳐서 보면 **"AST 변환 + Worker 직렬화 + 데이터 모델 마이그레이션이 동시에 일어나는 작업의 종합적 함정 카탈로그"**. 한 번 박은 함정은 다음 비슷한 작업(예: Python frame 모델 별도 plan, async/await frame 추적 등)에서 같은 cost를 두 번 내지 않게 해준다.

특히 (1)과 (2)는 일반화 가능:
- (1) **Lexical vs dynamic 분리** — 컴파일러/transpiler/tracer 어디든 적용. "어떤 정보가 어느 시점에 알려지는가"로 책임 나누기.
- (2) **Synthetic vs user 노드 단일 marker** — AST 또는 비슷한 트리 변환 시스템에 항상 등장.

(3)(4)(5)는 더 specific한 trap이지만, JS 코드 변환 / Web Worker / 데이터 모델 마이그레이션 어떤 조합에서든 다시 나타날 수 있음.

## When to Apply

- AST 변환으로 user 코드에 trace 삽입을 추가/확장할 때 → (1), (2), (3) 점검
- Web Worker가 사용자 값을 step 데이터에 담아 메인 스레드로 보낼 때 → (4) 점검
- "데이터 모델 한 번에 교체" plan 작성 시 → (5)의 "consumer 단언 grep 검증" 절차 의무
- 큰 plan을 implementation 들어가기 전 → ce-plan deepen + document-review 둘 다 거치기

## Examples

### (1) Hybrid binding 적용 전후

Before — analyzer가 함수별 var 사전 수집 시도:
```typescript
// analyzer.ts (안 씀)
analysis.funcLocalVars = {
  "addTen": ["num"],
  "outer": ["x", "inner"],
  "inner": ["x"],  // ← outer의 x도 잡아야 하나? closure?
};
// → 정책 모호, 데이터 구조 비대
```

After — transformer가 함수 만나면 그 자리에서 자체 closure:
```typescript
function transformBlockBody(node, enclosingFunc) {
  if (isFuncBody && !captureInjected) {
    newBody.push(captureVarsInit(collectFunctionVarNames(enclosingFunc)));
  }
}
// collectFunctionVarNames는 그 함수의 매개변수 + body 직속 var/let/const + nested function name만
// closure 변수는 자동 제외 (해당 함수 자체의 lexical scope에 없으므로 ReferenceError → catch → "-")
```

### (4) postMessage clone 안전 패턴

```javascript
// 위험: structural sharing의 parent에 raw 값
top.variables[k] = varsSnapshot[k];  // ← 함수면 postMessage 실패

// 안전: 저장 시점에 정규화
top.variables[k] = deepClone(varsSnapshot[k]);  // ← 함수는 '[Function: name]'

function deepClone(val) {
  if (typeof val === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
  // ... 다른 타입 처리
}
```

## Related

- `docs/plans/2026-04-18-001-feat-stack-frame-variables-plan.md` — 이 작업의 plan (deepening + document-review 거침)
- `docs/how-it-was-built.md` §6 — 기존 worker 구조 설명
- `docs/architecture-walkthrough.md` §6 — 워커 빌드 라인별 매핑 (Step.variables 시절 — frames 모델 반영 필요, 별도 follow-up)
- `AGENTS.md` §0, §3 — 책임 분리 원칙 + 안티패턴 카탈로그
