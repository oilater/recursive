# 아키텍처 워크스루: 한 줄 단위로 읽는 Recursive

> `docs/how-it-was-built.md`가 "왜 이렇게 만들었나"를 풀어 쓴 글이라면, 이 문서는 **"실제 코드가 한 줄 한 줄 무슨 일을 하는가"**를 함수 시그니처/매개변수/분기 단위까지 전부 풀어 쓴 동반 문서입니다. 각 섹션은 파일 경로와 라인 번호를 명시해, 읽으면서 바로 코드를 열어 따라갈 수 있도록 구성했습니다.
>
> **읽는 순서**: 0 → 1 → (2~5) → 6 → 7 → (8~10) → 11 → 12. 처음 읽는다면 1, 6, 11번을 먼저 훑은 다음 디테일로 들어가세요.

---

## 목차

- [0. 30초 요약](#0-30초-요약)
- [1. 진입점: `executeCode` → `executeCustomCode`](#1-진입점-executecode--executecustomcode)
- [2. 데이터 모델](#2-데이터-모델)
- [3. JS 분석 단계 — `analyzer.ts` 한 줄씩](#3-js-분석-단계--analyzerts-한-줄씩)
- [4. JS 변환 단계 — `transformer.ts` 한 줄씩](#4-js-변환-단계--transformerts-한-줄씩)
- [5. AST 빌더 — `ast-builders.ts`](#5-ast-빌더--ast-buildersts)
- [6. Worker 빌드 — `build-worker-code.ts` 한 줄씩](#6-worker-빌드--build-worker-codets-한-줄씩)
- [7. 손으로 추적하는 `factorial(3)` 전체 흐름](#7-손으로-추적하는-factorial3-전체-흐름)
- [8. Python 엔진 — `executor.ts` + `pyodide-worker.ts`](#8-python-엔진--executorts--pyodide-workerts)
- [9. Python 트레이서 — `tracer.py.ts` 한 줄씩](#9-python-트레이서--tracerpyts-한-줄씩)
- [10. 시각화 레이어](#10-시각화-레이어)
- [11. 프리셋 = 데이터](#11-프리셋--데이터)
- [12. 부록: 파일 빠른 참조표](#12-부록-파일-빠른-참조표)

---

## 0. 30초 요약

```
[코드 문자열] + [인자]
   │
   ▼ executeCode(code, args, language)
   │
   ├─ language === "javascript" → executeCustomCode
   │     1. analyzeCode    (acorn 파싱 + __entry__ 래핑 + 함수 메타데이터)
   │     2. transformCode  (모든 statement 앞에 __traceLine, 루프에 __guard,
   │                        재귀 함수에 Proxy 재할당)
   │     3. buildWorkerCode → Blob → new Worker(url) → postMessage
   │     4. Worker 안에서 new Function(...)로 변환된 코드 실행
   │     5. 실행 끝나면 worker.onmessage로 { steps, tree } 수신
   │
   └─ language === "python" → executePython
         1. ensurePyodideWorker (CDN에서 Pyodide 로드, 트레이서 코드 주입)
         2. postMessage({ type: "execute", code, args })
         3. Pyodide Worker가 sys.settrace로 후크하면서 _run_traced 실행
         4. JSON으로 직렬화 → 메인 스레드 → 정규화

→ 결과: { steps: Step[], tree: TreeNode }
   │
   ▼ useAlgorithmPlayer(steps)
   │   useReducer로 currentIndex/isPlaying/speed 관리
   │   setInterval로 자동 재생 (800/speed ms)
   │
   ▼ player.currentStep을 모든 시각화에 분배
   ├─ TreeView      (d3-hierarchy 좌표 + SVG 노드/엣지)
   ├─ CodePanel     (Shiki HTML + data-line 토글)
   ├─ VariablePanel (이전 step과 비교, 변경된 셀 노란 outline)
   ├─ CallStack     (activePath 기반 스택 프레임 표시)
   └─ StepperControls (재생/일시정지/탐색)
```

**핵심 단일 인사이트**: 모든 코드는 `{ steps, tree }`라는 동일한 모양으로 수렴합니다. 그래서 시각화 레이어는 어떤 언어/프리셋인지 몰라도 됩니다.

---

## 1. 진입점: `executeCode` → `executeCustomCode`

### 1-1. `executeCode` (`src/engine/execute.ts`)

```typescript
// src/engine/execute.ts:13
export async function executeCode(
  code: string,
  args: unknown[],
  language: Language = "javascript",
): Promise<ExecuteCodeResult> {
  if (language === "python") {
    const pyResult = await executePython(code, args);
    return { result, hasRecursion, finalReturnValue, consoleLogs };
  }

  const jsResult = await executeCustomCode(code, args);
  return { result, hasRecursion: jsResult.analysis.hasRecursion, ... };
}
```

여기서 보장되는 것은 **"어떤 언어든 리턴 모양은 동일하다"**입니다. 두 분기 모두 다음 4개를 채워서 돌려줍니다.

- `result: { steps, tree }` — 시각화의 원료
- `hasRecursion: boolean` — UI에서 트리/콜스택을 보일지 결정
- `finalReturnValue` — 최종 리턴값 (ResultPanel이 표시)
- `consoleLogs` — `console.log` 출력 (각 로그가 어느 stepIdx 직후에 발생했는지 기록)

### 1-2. `executeCustomCode` (`src/engine/executor.ts`)

```typescript
// src/engine/executor.ts:19
export async function executeCustomCode(
  code: string,
  args: unknown[],
  options: ExecuteOptions = {},
): Promise<ExecuteResult> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,            // 5000
    maxCalls = DEFAULT_MAX_CALLS,              // 1000
    maxLoopIterations = DEFAULT_MAX_LOOP_ITERATIONS, // 100000
  } = options;
```

**1) 분석 + 변환 (동기, 메인 스레드에서 즉시 실행)**

```typescript
const { analysis, strippedCode } = analyzeCode(code);
const transformedCode = transformCode(strippedCode, analysis);
```

- `analyzeCode`는 `{ analysis, strippedCode }`를 돌려주는데, 여기서 `strippedCode`는 사실 **TS만 제거된 게 아니라 `__entry__()`로 래핑된 코드**입니다. 변수 이름이 좀 헷갈리지만 코드를 보면 이렇게 돼 있습니다 (`analyzer.ts:168`):
  ```typescript
  return { strippedCode: wrappedCode, analysis: {...} };
  ```
- `transformCode`는 이 래핑된 코드의 AST에 `__traceLine` 등을 삽입해 다시 JS 문자열로 직렬화합니다.

**2) Promise + Worker 부트스트랩**

```typescript
return new Promise<ExecuteResult>((resolve, reject) => {
  const blob = new Blob([buildWorkerCode()], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
```

- `buildWorkerCode()`는 Worker 안에서 실행할 자바스크립트를 **문자열로** 리턴합니다 (별도 .js 파일이 아닙니다 — 빌드 타임에 따로 분리해도 됐지만 한 함수 안에 다 두는 쪽을 택함).
- Blob → ObjectURL → Worker 패턴: 별도 파일 없이 동적으로 Worker를 만드는 표준 트릭.
- `URL.revokeObjectURL(url)`을 즉시 호출해도 `Worker`는 이미 URL을 따라 코드를 읽기 시작했기 때문에 안전합니다 (메모리 누수 방지).

**3) 타임아웃 가드**

```typescript
const timer = setTimeout(() => {
  worker.terminate();
  reject(new Error(`Execution timed out after ${timeoutMs / 1000} seconds.`));
}, timeoutMs);
```

5초가 지나도 `onmessage`가 안 오면 Worker를 강제 종료. 무한 루프나 `__guard`로 못 잡은 무한 호출의 마지막 안전망입니다.

**4) 메시지 핸들러**

```typescript
worker.onmessage = (e) => {
  clearTimeout(timer);
  worker.terminate();
  const response = e.data;
  if (response.type === "success") {
    resolve({ result, analysis, finalReturnValue, consoleLogs });
  } else {
    reject(new Error(response.message));
  }
};
```

- 받자마자 `clearTimeout`과 `worker.terminate()` — 한 번 쓰고 버리는 일회용 Worker입니다 (Pyodide와 다른 점).
- `response.type`이 `"success"` 또는 `"error"` 두 가지 — 이 프로토콜은 `build-worker-code.ts`의 `postMessage` 호출과 1:1로 대응합니다.

**5) 워커에 보낼 페이로드**

```typescript
worker.postMessage({
  transformedCode,
  entryFuncName: analysis.entryFuncName,           // "__entry__"
  hasRecursion: analysis.hasRecursion,
  recursiveFuncName: analysis.recursiveFuncName,   // "factorial" 등
  recursiveParamNames: analysis.recursiveParamNames,
  args,                                            // 사용자 인자
  maxCalls,
  maxLoopIterations,
  funcStartLine: analysis.tracedFuncStartLine,     // 추적 함수 시작 줄
  funcEndLine: analysis.tracedFuncEndLine,
  lineOffset: analysis.lineOffset,                 // 1 (래핑 보정)
  userTopLevelFuncName: analysis.userTopLevelFuncName,
  originalLineCount: code.split("\n").length,      // 원본 줄 수
});
```

이 12개 필드가 Worker가 받는 데이터의 전부입니다. `originalLineCount`는 **변환 후 늘어난 라인을 필터링하기 위한 상한선**으로 쓰입니다 (Worker 안에서 `correctedLine > originalLineCount`이면 무시).

---

## 2. 데이터 모델

### 2-1. `Step`과 `TreeNode` (`src/algorithm/types.ts`)

```typescript
export interface Step {
  id: number;                           // 0부터 1씩 증가
  type: "call" | "return";              // 호출/리턴 시점
  codeLine: number;                     // 사용자 코드 기준 줄 번호
  activeNodeId: string;                 // TreeNode.id 참조
  activePath: string[];                 // 루트→현재 노드 경로 (ID 배열)
  variables: Record<string, unknown>;   // 변수명 → 값
  description: string;                  // "factorial(3)" 같은 표시 텍스트
}

export interface TreeNode {
  id: string;                           // "node-0", "node-1", ...
  label: string;                        // 함수 이름
  args: string;                         // 포맷팅된 인자
  children: TreeNode[];
  status: "idle" | "active" | "completed" | "backtracked";
}
```

### 2-2. ID 표기에 대한 주의

`how-it-was-built.md`는 `"root"`, `"root-0-1"` 같은 의미 있는 ID로 설명하지만, 실제 Worker는 **단조 증가 카운터**로 만듭니다 (`build-worker-code.ts:34, 125`):

```javascript
var rootNode = { id: 'node-' + nodeIdCounter++, ... };  // → "node-0"
// 자식 호출:
var nodeId = 'node-' + nodeIdCounter++;                  // → "node-1", "node-2", ...
```

부모-자식 관계는 ID 문자열이 아니라 **객체 참조**로 표현됩니다 (`children` 배열에 push). ID는 단순히 Step.activeNodeId/activePath와의 매칭용 식별자입니다.

### 2-3. Step과 TreeNode의 연결

| 축 | 자료구조 | 진행 방향 |
|---|---|---|
| 시간 | `Step[]` (배열) | currentIndex가 0 → totalSteps-1 |
| 공간 | `TreeNode` (트리) | 호출 깊이 (root → children → ...) |

두 축은 `Step.activeNodeId === TreeNode.id` 매칭으로 교차합니다. `activePath`는 그 시점의 콜스택을 통째로 ID 배열로 들고 있어서, 시각화에서 "현재 살아있는 가지"를 한 번에 강조할 수 있습니다.

---

## 3. JS 분석 단계 — `analyzer.ts` 한 줄씩

위치: `src/engine/analyzer.ts`

### 3-1. AST 순회 헬퍼들 (`analyzer.ts:9-39`)

```typescript
function walkAst(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (visitor(node) === true) return;        // visitor가 true 리턴 → 순회 중단
  for (const key of Object.keys(node)) {
    if (["type", "start", "end", "loc"].includes(key)) continue;
    // 위치 정보/타입 키는 자식이 아니므로 스킵
    const val = node[key];
    if (!val || typeof val !== "object") continue;
    for (const child of Array.isArray(val) ? val : [val]) {
      if (child?.type) walkAst(child, visitor);
    }
  }
}
```

이게 **분석 코드 전체의 기반**입니다. 동작 원리:
1. 현재 노드에 visitor 호출.
2. visitor가 `true`를 리턴하면 즉시 중단 (find류 함수에서 사용).
3. `type`, `start`, `end`, `loc`은 메타데이터라 자식이 아니므로 건너뛰기.
4. 나머지 키 중 객체/배열인 것을 자식 후보로 보고, `child.type`이 있으면 (= AST 노드면) 재귀.

위에 얹힌 `findInAst`(첫 번째 매칭 리턴), `collectInAst`(전부 모음)는 이 walkAst의 얇은 래퍼입니다.

### 3-2. 매개변수 이름 추출 (`analyzer.ts:52-58`)

```typescript
function extractParamNames(params) {
  return (params ?? []).map((p) => {
    if (p.type === "Identifier") return p.name;             // function f(a, b) {}
    if (p.type === "AssignmentPattern" && p.left?.type === "Identifier")
      return p.left.name;                                    // function f(a = 1) {}
    return "arg";                                            // 구조분해 등 → fallback
  });
}
```

지원하는 매개변수 형태: 일반 식별자(`a`), 디폴트값(`a = 1`). 그 외(`{x, y}`, `[a, b]`)는 `"arg"`로 통일 — 추후 디스플레이 용도로만 쓰기 때문에 정확하지 않아도 됩니다.

### 3-3. 지역 변수 이름 수집 (`analyzer.ts:60-79`)

```typescript
function extractLocalVarNames(funcNode) {
  const names = new Set<string>();

  // (1) var/let/const 선언의 모든 식별자
  for (const decl of collectInAst(funcNode,
    (n) => n.type === "VariableDeclarator" && n.id?.type === "Identifier")) {
    names.add(decl.id.name);
  }

  // (2) 내부 함수 선언의 매개변수까지 끌어모음
  for (const fn of collectInAst(funcNode, (n) => n.type === "FunctionDeclaration")) {
    for (const param of fn.params ?? []) {
      if (param.type === "Identifier" && param.name !== "_") names.add(param.name);
      if (param.type === "AssignmentPattern" && param.left?.type === "Identifier")
        names.add(param.left.name);
    }
  }

  return [...names];
}
```

이 변수 이름들이 `__captureVars` 함수의 try-catch 블록을 만드는 재료가 됩니다. 즉, **여기서 빠진 변수는 VariablePanel에 절대 안 보입니다**. 매개변수 `_`는 일부러 제외 — 관용적 "사용 안 함" 표시.

### 3-4. 함수 정보 수집 (`analyzer.ts:81-123`)

두 종류의 함수 정의를 모두 잡습니다:
1. `FunctionDeclaration`: `function foo(...) {}`
2. `VariableDeclarator + FunctionExpression/ArrowFunctionExpression`: `const foo = (...) => {}`

각 함수에 대해 채우는 메타:

```typescript
{
  name,                              // 함수 이름
  params: extractParamNames(...),    // 매개변수 이름 배열
  startLine: lineOf(node),           // 시작 줄
  endLine: node.loc?.end?.line,      // 끝 줄
  isRecursive: !!findInAst(           // body 내부에 자기 이름 호출이 있는가?
    body, (n) => n.type === "CallExpression" && n.callee?.name === name
  ),
  node,                              // AST 노드 자체 (지역변수 추출 시 재사용)
}
```

`isRecursive` 판정의 한계: `callee?.name`만 보기 때문에 `obj.foo()`나 `arr.map(foo)` 같이 **간접적으로 자기를 부르는 케이스는 못 잡습니다**. 보통의 재귀 함수는 직접 호출이라 이걸로 충분합니다.

### 3-5. `analyzeCode` 메인 흐름 (`analyzer.ts:130-181`)

```typescript
export function analyzeCode(code) {
  const strippedCode = stripTypeScript(code);                   // 1. TS 제거

  let originalAst;
  try {
    originalAst = acorn.parse(strippedCode, {
      ecmaVersion: 2022, sourceType: "script", locations: true,
    });
  } catch (e) {
    throw new Error(`Syntax error: ${...}`);                    // 2. 파싱 실패면 즉시 throw
  }

  const originalFunctions = findAllFunctions(originalAst);      // 3. 원본의 함수들

  const topLevelFunc = originalFunctions.length > 0 ? originalFunctions[0] : null;
  const returnRef = topLevelFunc ? `\nreturn ${topLevelFunc.name};` : "";
  const wrappedCode = `function ${ENTRY_FUNC_NAME}() {\n${strippedCode}${returnRef}\n}`;
  // 4. __entry__ 함수로 래핑

  const wrappedAst = acorn.parse(wrappedCode, {...});           // 5. 래핑된 코드 재파싱
  const wrappedFunctions = findAllFunctions(wrappedAst);

  const entryFunc = wrappedFunctions.find((f) => f.name === ENTRY_FUNC_NAME)!;
  const recursiveFunc = wrappedFunctions.find(
    (f) => f.name !== ENTRY_FUNC_NAME && f.isRecursive
  ) ?? null;
  // 6. __entry__ 자기 자신은 제외하고 재귀 함수 찾기

  const localVarNames = [
    ...new Set([...entryFunc.params, ...extractLocalVarNames(entryFunc.node)]),
  ];
  // 7. __entry__ 스코프의 모든 변수 (사용자 코드의 모든 var/let/const + 매개변수)

  return {
    strippedCode: wrappedCode,                                  // 변환 단계로 넘길 코드
    analysis: {
      entryFuncName: ENTRY_FUNC_NAME,
      entryParamNames: topLevelFunc ? topLevelFunc.params : [], // UI 폼 필드 이름
      recursiveFuncName: recursiveFunc?.name ?? null,
      recursiveParamNames: recursiveFunc?.params ?? [],
      tracedFuncStartLine: recursiveFunc?.startLine ?? entryFunc.startLine,
      tracedFuncEndLine: recursiveFunc?.endLine ?? entryFunc.endLine,
      localVarNames,
      hasRecursion: !!recursiveFunc,
      lineOffset: 1,                                            // 래핑이 1줄 추가
      userTopLevelFuncName: topLevelFunc?.name ?? null,
    },
  };
}
```

### 3-6. `stripTypeScript` (`src/engine/strip-types.ts`)

```typescript
export function stripTypeScript(code: string): string {
  try {
    return transform(code, {
      transforms: ["typescript"],
      disableESTransforms: true,                                // ES 문법은 건드리지 마라
    }).code;
  } catch {
    return code;                                                 // 실패해도 원본 그대로 진행
  }
}
```

핵심: `disableESTransforms: true`. sucrase가 화살표 함수, 클래스 등을 다운컴파일하지 않도록 막습니다 — TS만 떼고 나머지는 그대로 실행하고 싶기 때문.

### 3-7. 분석 단계 의사코드 요약

```
analyzeCode(code):
  1. stripTypeScript로 TS 문법 제거
  2. acorn으로 AST 파싱 → SyntaxError면 throw
  3. 원본 AST에서 모든 함수 정보 수집 (이름/매개변수/줄/재귀여부)
  4. 첫 번째 top-level 함수의 이름을 잡아 wrappedCode 생성:
     function __entry__() { <원본> ; return <topFuncName>; }
     (top-level 함수 없으면 return 없이)
  5. wrappedCode를 다시 파싱 → __entry__ 안의 함수 재수집
  6. __entry__를 제외하고 재귀 함수 1개 선택
  7. __entry__ 스코프의 모든 변수 이름 수집 (captureVars 재료)
  8. analysis 객체 + wrappedCode를 리턴
```

---

## 4. JS 변환 단계 — `transformer.ts` 한 줄씩

위치: `src/engine/transformer.ts`

### 4-1. 진입점 (`transformer.ts:31-40`)

```typescript
export function transformCode(strippedCode, analysis) {
  const ast = acorn.parse(strippedCode, {
    ecmaVersion: 2022, sourceType: "script", locations: true,
  });
  const tracedFuncName = analysis.recursiveFuncName ?? analysis.entryFuncName;
  walkAndTransform(ast, tracedFuncName, analysis.recursiveFuncName,
                   analysis.localVarNames, false);
  return generate(ast);                                          // astring → JS 문자열
}
```

**중요한 결정**: `tracedFuncName`은 재귀 함수가 있으면 그 이름, 없으면 `__entry__`. 즉 비재귀 코드도 추적은 됩니다 — 단지 "추적되는 본문"이 `__entry__` 자체가 됩니다. `how-it-was-built.md` 8번 섹션의 "범용 추적 엔진"이 바로 이 한 줄로 가능해집니다.

### 4-2. `walkAndTransform`의 핵심 상태 (`transformer.ts:42-48`)

```typescript
function walkAndTransform(node, tracedFuncName, recursiveFuncName, varNames, insideTracedFunc) {
```

`insideTracedFunc`라는 boolean이 핵심입니다. **추적되는 함수의 body 안에 들어왔는가?**를 트래킹합니다. true일 때만 statement 앞에 `__traceLine`이 삽입되고, body 시작에 `__captureVars`가 한 번 선언됩니다.

### 4-3. body 배열 처리 (`transformer.ts:51-117`)

```typescript
if (Array.isArray(node.body)) {
  const newBody = [];
  let captureInjected = false;

  for (const stmt of node.body) {
    // (a) 루프라면 body 시작에 __guard, 끝에 추가 __traceLine
    if (isLoop(stmt) && stmt.body?.type === "BlockStatement" && Array.isArray(stmt.body.body)) {
      const loopLine = stmt.loc?.start?.line;
      const loopBackTrace = insideTracedFunc && loopLine ? [traceLineCall(loopLine)] : [];
      stmt.body.body = [guardCall(), ...stmt.body.body, ...loopBackTrace];
    }

    // (b) 추적되는 본문이라면, 가장 첫 statement 앞에 __captureVars 한 번 선언
    if (insideTracedFunc && !captureInjected) {
      newBody.push(captureVarsInit(varNames));
      captureInjected = true;
    }

    // (c) FunctionDeclaration과 EmptyStatement는 trace 스킵
    const skipTrace = stmt.type === "FunctionDeclaration" || stmt.type === "EmptyStatement";
    if (insideTracedFunc && stmt.loc?.start?.line && !skipTrace) {
      newBody.push(traceLineCall(stmt.loc.start.line));
    }

    newBody.push(stmt);

    // (d) 재귀 함수가 정의된 직후 → Proxy로 재할당
    if (recursiveFuncName) {
      if (stmt.type === "FunctionDeclaration" && stmt.id?.name === recursiveFuncName) {
        newBody.push(proxyReassignment(recursiveFuncName));
      }
      if (stmt.type === "VariableDeclaration" && stmt.declarations) {
        for (const decl of stmt.declarations) {
          if (decl.id?.name === recursiveFuncName && decl.init &&
              (decl.init.type === "FunctionExpression" || decl.init.type === "ArrowFunctionExpression")) {
            newBody.push(proxyReassignment(recursiveFuncName));
          }
        }
      }
    }

    // (e) 다음 깊이 재귀: 이 statement가 추적 함수의 정의면 enteringTracedFunc=true
    const enteringTracedFunc =
      (stmt.type === "FunctionDeclaration" && stmt.id?.name === tracedFuncName) ||
      (stmt.type === "VariableDeclaration" && stmt.declarations?.some(
        (d) => d.id?.name === tracedFuncName &&
               (d.init?.type === "FunctionExpression" || d.init?.type === "ArrowFunctionExpression")
      ));

    walkAndTransform(stmt, tracedFuncName, recursiveFuncName, varNames,
                     insideTracedFunc || !!enteringTracedFunc);
  }

  // (f) 추적 본문 끝에 마지막 __traceLine 한 번 더
  if (insideTracedFunc && newBody.length > 0) {
    const lastStmt = newBody[newBody.length - 1];
    const lastLine = lastStmt.loc?.end?.line ?? lastStmt.loc?.start?.line;
    if (lastLine) newBody.push(traceLineCall(lastLine));
  }

  node.body = newBody;
  return;
}
```

각 단계의 의도:

- **(a) 루프 처리**: body 시작에 `__guard()` (무한루프 카운터). body 끝에 `__traceLine(루프시작줄)`을 다시 찍어서, 사용자가 보기에 "while 조건 → body → while 조건"의 자연스러운 흐름이 유지되도록.
- **(b) `__captureVars` 선언 1회**: body의 가장 첫 statement 앞에 단 한 번. 이후의 모든 `__traceLine` 호출이 이 함수를 참조함.
- **(c) FunctionDeclaration/EmptyStatement skip**: 함수 정의 줄에서 Step이 찍히면 "정의 = 실행"으로 오해 유발. EmptyStatement(`;`)는 의미 없음.
- **(d) Proxy 재할당**: `function foo() {...}` 또는 `const foo = function() {...}` 직후에 `foo = __createProxy(foo);`를 추가. 이후 `foo(...)` 호출은 모두 Proxy를 거쳐 트리에 노드를 매답.
- **(e) `enteringTracedFunc` 전파**: 다음 재귀 호출에서 추적 모드를 켜기 위한 플래그 계산. body 자체가 아니라 **자식 노드들을 순회할 때** 이 플래그가 켜진 채로 들어가야 함.
- **(f) body 끝의 마지막 trace**: 함수가 `return` 없이 끝나거나 마지막 줄에서 멈춰도 그 라인이 한 번은 찍히게.

### 4-4. body가 아닌 일반 노드 순회 (`transformer.ts:120-145`)

```typescript
for (const key of Object.keys(node)) {
  if (["type", "start", "end", "loc"].includes(key)) continue;
  const val = node[key];
  if (val && typeof val === "object") {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item?.type) walkAndTransform(item, ...);
      }
    } else if (val.type) {
      // body 키이고 부모가 추적 대상 함수면, 본문 진입을 표시
      const entersTracedBody =
        key === "body" &&
        ((node.type === "FunctionDeclaration" &&
          (node.id?.name === tracedFuncName || node.id?.name === ENTRY_FUNC_NAME)) ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression");
      walkAndTransform(val, ..., insideTracedFunc || entersTracedBody);
    }
  }
}
```

이 부분이 **"어디서 추적 모드가 켜지는가"**를 결정합니다. `body` 키로 들어가는 시점에:
- 부모가 `FunctionDeclaration`이고 이름이 `tracedFuncName` 또는 `__entry__`이면, 또는
- 부모가 `FunctionExpression`/`ArrowFunctionExpression`이면 (이름이 없으니 일단 켬)

→ 그때부터 자식 statement에 `__traceLine`이 붙기 시작합니다.

### 4-5. 헬퍼 함수들 (`transformer.ts:148-174`)

```typescript
const isLoop = (node) => LOOP_TYPES.includes(node.type);
// ["ForStatement", "WhileStatement", "DoWhileStatement", "ForInStatement", "ForOfStatement"]

function captureVarsInit(varNames) {
  // var __captureVars = function() {
  //   var __v = {};
  //   try { __v.<name> = <name> } catch(__e) { __v.<name> = "-" }
  //   ...
  //   return __v;
  // }
  const tryBlocks = varNames.map((name) =>
    tryCatch(
      [expr(assign(member(id("__v"), id(name)), id(name)))],
      [expr(assign(member(id("__v"), id(name)), literal("-")))],
    ),
  );
  return varDecl(CAPTURE_VARS, funcExpr([], block([
    varDecl("__v", obj()),
    ...tryBlocks,
    ret(id("__v")),
  ])));
}

function traceLineCall(line) {
  // __traceLine(<line>, __captureVars())
  return expr(call(id(TRACE_LINE), [literal(line), call(id(CAPTURE_VARS))]));
}

function proxyReassignment(funcName) {
  // <funcName> = __createProxy(<funcName>);
  return expr(assign(id(funcName), call(id(CREATE_PROXY), [id(funcName)])));
}

function guardCall() {
  // __guard()
  return expr(call(id(GUARD)));
}
```

`captureVarsInit`이 **변수마다 개별 try-catch**의 정확한 구현입니다. 한 변수가 아직 TDZ(Temporal Dead Zone)에 있어도 다른 변수는 캡처되도록.

### 4-6. 변환 단계 의사코드 요약

```
transformCode(wrappedCode, analysis):
  ast = parse(wrappedCode)
  walkAndTransform(ast, tracedFuncName, recursiveFuncName, localVarNames, false)
  return astring.generate(ast)

walkAndTransform(node, tracedFuncName, recursiveFuncName, varNames, insideTracedFunc):
  if node.body는 배열:
    newBody = []
    captureInjected = false
    for stmt in node.body:
      if stmt이 루프: stmt.body.body = [__guard(), ...stmt.body.body, __traceLine(loopStart)]
      if insideTracedFunc and not captureInjected:
        newBody.push(var __captureVars = function() { try-catch들 })
        captureInjected = true
      if insideTracedFunc and stmt이 trace 가능한 종류:
        newBody.push(__traceLine(stmt.line, __captureVars()))
      newBody.push(stmt)
      if stmt이 재귀 함수 정의:
        newBody.push(<funcName> = __createProxy(<funcName>))
      재귀: walkAndTransform(stmt, ..., insideTracedFunc OR (stmt가 추적 함수 정의)?)
    if insideTracedFunc:
      newBody.push(__traceLine(lastLine))   # body 마지막 trace
    node.body = newBody
  else:
    각 자식 키에 대해 재귀 (body 키로 들어갈 때 추적 함수면 insideTracedFunc=true)
```

---

## 5. AST 빌더 — `ast-builders.ts`

위치: `src/engine/ast-builders.ts`

### 5-1. 베이스

```typescript
type AstNode = any;

const n = (type: string, props = {}) => ({
  type, start: 0, end: 0, ...props,
});
```

`start`/`end`는 acorn이 위치 정보로 쓰는 필드. 새로 만든 노드라 0/0으로 채움. astring은 위치 없이도 직렬화 가능합니다.

### 5-2. 빌더 카탈로그

| 빌더 | 만드는 AST | 예 (생성된 코드) |
|---|---|---|
| `id(name)` | `Identifier` | `foo` |
| `literal(value)` | `Literal` | `5`, `"hello"`, `true` |
| `call(callee, args)` | `CallExpression` | `foo(a, b)` |
| `assign(left, right)` | `AssignmentExpression` (`=`) | `a = b` |
| `member(obj, prop)` | `MemberExpression` (`.`) | `obj.prop` |
| `expr(expression)` | `ExpressionStatement` | `<expr>;` (statement 래퍼) |
| `block(body)` | `BlockStatement` | `{ ... }` |
| `varDecl(name, init)` | `VariableDeclaration` (`var`) | `var name = init` |
| `tryCatch(tryBody, catchBody)` | `TryStatement` (catch param `__e`) | `try { ... } catch(__e) { ... }` |
| `ret(arg)` | `ReturnStatement` | `return arg` |
| `funcExpr(params, body)` | `FunctionExpression` (익명) | `function(p1, p2) { ... }` |
| `obj(properties)` | `ObjectExpression` | `{}` |
| `shorthandProp(name)` | `Property` (shorthand) | `{ name }` |

### 5-3. 조합 예: `__captureVars` 한 변수 분량

```typescript
// 만들고 싶은 코드: try { __v.arr = arr } catch(__e) { __v.arr = "-" }

tryCatch(
  [expr(assign(member(id("__v"), id("arr")), id("arr")))],
  [expr(assign(member(id("__v"), id("arr")), literal("-")))],
)

// 풀어쓰면:
// {
//   type: "TryStatement",
//   block: { type: "BlockStatement", body: [
//     { type: "ExpressionStatement",
//       expression: { type: "AssignmentExpression", operator: "=",
//         left:  { type: "MemberExpression", object: {Identifier "__v"}, property: {Identifier "arr"} },
//         right: { type: "Identifier", name: "arr" } } }
//   ]},
//   handler: { type: "CatchClause", param: {Identifier "__e"}, body: { ... 위와 비슷한 ... } },
//   finalizer: null
// }
```

빌더 덕분에 한 줄. 빌더 없으면 30줄짜리 객체 리터럴.

---

## 6. Worker 빌드 — `build-worker-code.ts` 한 줄씩

위치: `src/engine/build-worker-code.ts`

이 파일이 리턴하는 문자열이 **Web Worker 안에서 실제로 실행되는 자바스크립트**입니다. 메인 스레드 코드와는 클로저/스코프가 완전히 분리됩니다.

### 6-1. 보안 차단 (`build-worker-code.ts:4-8`)

```javascript
'use strict';
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.importScripts = undefined;
self.WebSocket = undefined;
self.EventSource = undefined;
```

Worker 컨텍스트의 글로벌에서 외부 통신 API들을 모두 제거. 사용자 코드가 실행되더라도 네트워크/외부 스크립트 로딩 불가.

### 6-2. 메시지 핸들러 골격

```javascript
self.onmessage = function(e) {
  var data = e.data;
  // ... 12개 필드 unpack ...
  try {
    // ... 실행 ...
    self.postMessage({ type: 'success', result, finalReturnValue, consoleLogs });
  } catch(err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};
```

**프로토콜**: 메인 → Worker는 `postMessage(payload)` 한 번. Worker → 메인은 `success` 또는 `error` 한 번. 양방향 스트리밍 없음 — Worker는 한 번 실행하고 끝.

### 6-3. 받는 데이터 unpack (`build-worker-code.ts:12-23`)

```javascript
var transformedCode = data.transformedCode;
var entryFuncName   = data.entryFuncName;
var args            = data.args;
var hasRecursion    = data.hasRecursion;
var recursiveFuncName    = data.recursiveFuncName;
var recursiveParamNames  = data.recursiveParamNames || [];
var maxCalls          = data.maxCalls || 5000;
var maxLoopIterations = data.maxLoopIterations || 100000;
var funcStartLine     = data.funcStartLine || 1;
var funcEndLine       = data.funcEndLine || 1;
var lineOffset        = data.lineOffset || 0;
var userFunc          = data.userTopLevelFuncName;
```

기본값(`|| 5000` 등)이 있는 이유: 메시지 직렬화 과정에서 `undefined`가 누락되거나 빈 객체가 올 가능성에 대한 방어.

### 6-4. 실행 컨텍스트 변수 (`build-worker-code.ts:26-39`)

```javascript
var steps = [];
var stepId = 0;
var nodeIdCounter = 0;
var callCount = 0;
var loopCount = 0;
var callStack = [];

var rootNode = {
  id: 'node-' + nodeIdCounter++,        // → "node-0"
  label: userFunc || entryFuncName,
  args: formatArgs(args),
  children: [],
  status: 'completed'
};
```

루트 노드가 미리 만들어집니다. 라벨은 사용자 함수 이름(있으면) 또는 `__entry__`. 트리는 항상 이 루트에서 시작합니다.

### 6-5. 헬퍼: `deepClone` (`build-worker-code.ts:41-47`)

```javascript
function deepClone(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
  if (typeof val !== 'object') return val;                  // 원시값
  if (Array.isArray(val)) return val.map(deepClone);
  try { return JSON.parse(JSON.stringify(val)); } catch(e) { return String(val); }
}
```

왜 deepClone이 필요한가: Step에 저장된 `variables`는 **그 시점의 스냅샷**이어야 합니다. 참조만 저장하면 나중에 같은 배열이 수정될 때 과거 Step의 값까지 같이 바뀌는 버그가 생깁니다.

순환 참조나 직렬화 불가 객체는 `JSON.stringify` 실패 → `String(val)` fallback.

### 6-6. 헬퍼: `formatArgs` (`build-worker-code.ts:49-64`)

```javascript
function formatArgs(argsList) {
  return argsList.map(function(a) {
    if (a === undefined) return 'undefined';
    if (a === null) return 'null';
    if (Array.isArray(a)) {
      if (a.length > 8) return '[' + a.slice(0, 3).join(',') + ',...(' + a.length + ')]';
      if (a.length > 0 && Array.isArray(a[0])) return '[[...]](' + a.length + 'x' + a[0].length + ')';
      return '[' + a.join(',') + ']';
    }
    if (typeof a === 'object') {
      var s = JSON.stringify(a);
      return s.length > 20 ? s.slice(0, 17) + '...' : s;
    }
    return String(a);
  }).join(', ');
}
```

TreeNode의 `args`에 표시될 짧은 문자열을 만듭니다. 긴 배열/객체는 잘라서 표시 — 트리 노드가 너무 커지는 걸 방지.

### 6-7. 헬퍼: `getPath` (`build-worker-code.ts:66-72`)

```javascript
function getPath(stack, nodeId) {
  var path = [];
  if (hasRecursion && rootNode.children.length > 0) path.push(rootNode.id);
  for (var i = 0; i < stack.length; i++) path.push(stack[i].nodeId);
  if (nodeId) path.push(nodeId);
  return path;
}
```

현재 콜스택 + 활성 노드 ID로 활성 경로를 만듭니다. `if (hasRecursion && rootNode.children.length > 0)` 조건이 흥미로움: 재귀가 있는데 자식이 아직 없으면 root를 path에 안 넣는다 — 즉 첫 호출 진입 직전까지는 path가 비어있도록 처리.

### 6-8. `__guard` (`build-worker-code.ts:74-79`)

```javascript
function __guard() {
  loopCount++;
  if (loopCount > maxLoopIterations) {
    throw new Error('Loop iteration limit exceeded (' + maxLoopIterations + ').');
  }
}
```

루프 body 첫 줄에 삽입. 카운터가 100,000을 넘으면 throw → onmessage에서 catch → `error` 응답.

### 6-9. `__traceLine` (`build-worker-code.ts:85-113`)

```javascript
var originalLineCount = data.originalLineCount || 9999;
var MAX_STEPS = 10000;

function __traceLine(line, varsSnapshot) {
  if (steps.length >= MAX_STEPS) {
    throw new Error('Step limit exceeded (' + MAX_STEPS + '). Try smaller input.');
  }
  var correctedLine = line - lineOffset;                                // 1줄 보정
  if (correctedLine < 1 || correctedLine > originalLineCount) return;   // 범위 밖 무시

  var currentNodeId = callStack.length > 0
    ? callStack[callStack.length - 1].nodeId
    : rootNode.id;
  var activePath = callStack.length > 0
    ? getPath(callStack, currentNodeId)
    : [rootNode.id];

  var variables = {};
  if (varsSnapshot) {
    for (var k in varsSnapshot) {
      if (varsSnapshot.hasOwnProperty(k)) {
        variables[k] = deepClone(varsSnapshot[k]);
      }
    }
  }

  steps.push({
    id: stepId++,
    type: 'call',
    codeLine: correctedLine,
    activeNodeId: currentNodeId,
    activePath: activePath.slice(),
    variables: variables,
    description: ''
  });
}
```

**호출 패턴**: `__traceLine(<원본 line + 1>, __captureVars())`. 즉 lineOffset을 빼서 **사용자가 보는 라인 번호**로 복원합니다. `correctedLine > originalLineCount`이면 변환 과정에서 추가된 `return ...` 같은 줄 → 무시.

`activePath.slice()`로 복사본을 push하는 이유: 이후 callStack이 변해도 과거 Step의 path가 영향받지 않도록.

### 6-10. `__createProxy` (`build-worker-code.ts:115-173`)

```javascript
function __createProxy(originalFunc) {
  if (!hasRecursion) return originalFunc;                  // 비재귀면 그대로

  return new Proxy(originalFunc, {
    apply: function(target, thisArg, argsList) {
      callCount++;
      if (callCount > maxCalls) throw new Error(...);

      // (1) 새 노드 생성 + 트리 연결
      var nodeId = 'node-' + nodeIdCounter++;
      var node = {
        id: nodeId, label: recursiveFuncName,
        args: formatArgs(argsList),
        children: [], status: 'idle'
      };
      if (callStack.length === 0) rootNode.children.push(node);
      else callStack[callStack.length - 1].node.children.push(node);

      callStack.push({ nodeId: nodeId, node: node });

      // (2) 진입 직후 "call" Step 추가 (description에 함수 호출 표현)
      var entryLine = Math.max(1, funcStartLine - lineOffset);
      if (entryLine >= 1 && entryLine <= originalLineCount) {
        var prevVars = steps.length > 0
          ? Object.assign({}, steps[steps.length - 1].variables)
          : {};
        for (var i = 0; i < recursiveParamNames.length; i++) {
          prevVars[recursiveParamNames[i]] = deepClone(argsList[i]);
        }
        steps.push({
          id: stepId++, type: 'call',
          codeLine: entryLine, activeNodeId: nodeId,
          activePath: getPath(callStack, nodeId),
          variables: prevVars,
          description: recursiveFuncName + '(' + formatArgs(argsList) + ')'
        });
      }

      // (3) 실제 함수 호출
      var result;
      try {
        result = Reflect.apply(target, thisArg, argsList);
      } catch(err) {
        node.status = 'backtracked';                       // 예외 → 빨강
        callStack.pop();
        throw err;                                          // 예외는 그대로 다시 throw
      }

      node.status = 'completed';                           // 정상 → 초록
      callStack.pop();
      return result;
    }
  });
}
```

세 단계로 분리됩니다:

**(1) 트리 연결**: 새 노드를 만들어 부모 노드의 `children`에 push. 부모는 콜스택의 마지막 프레임 (없으면 rootNode).

**(2) 진입 Step**: 호출이 시작된 순간 한 번 Step을 찍습니다. `prevVars`는 이전 Step의 변수를 복사한 뒤 매개변수를 덮어쓰는 방식 — 이렇게 해야 VariablePanel이 매끄럽게 "n=3 → n=2"로 갱신됩니다. `description`에 `factorial(2)` 같은 호출 표현이 들어가서 StepperControls 하단에 표시됨.

**(3) 실제 실행**: `Reflect.apply`로 원래 함수 호출. 이 호출 안에서 또 재귀가 일어나면 → 다시 Proxy의 apply로 들어옴 (트리가 깊어짐). 정상 리턴이면 status='completed', 예외가 throw되면 status='backtracked' (백트래킹 알고리즘에서 throw로 가지를 끊는 패턴 지원).

### 6-11. `console.log` 캡처 (`build-worker-code.ts:175-185`)

```javascript
var consoleLogs = [];
var fakeConsole = {
  log: function() {
    var args = Array.prototype.slice.call(arguments);
    var text = args.map(function(a) {
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    consoleLogs.push({ text: text, stepIdx: stepId - 1 });
  },
  warn:  function() { fakeConsole.log.apply(null, arguments); },
  error: function() { fakeConsole.log.apply(null, arguments); },
  info:  function() { fakeConsole.log.apply(null, arguments); }
};
```

브라우저 콘솔에 출력하지 않고, **현재 stepId-1과 함께** 배열에 모아둡니다. 나중에 ResultPanel이 "이 step 직후에 이 로그가 나왔구나"를 표시할 수 있도록.

### 6-12. 실행 호출 (`build-worker-code.ts:187-195`)

```javascript
var runCode;
var hasArgs = userFunc && args.length > 0;
if (hasArgs) {
  runCode = transformedCode + '\nvar __fn = __entry__();\nreturn __fn.apply(null, __args);\n';
} else {
  runCode = transformedCode + '\n__entry__();\n';
}
var runFn = new Function('__guard', '__createProxy', '__traceLine', '__args', 'console', runCode);
var finalReturnValue = runFn(__guard, __createProxy, __traceLine, args, fakeConsole);
```

**왜 `new Function`인가**: Worker 안에 사용자가 정의한 함수들을 정상적으로 평가하기 위해서입니다. `eval`을 쓸 수도 있지만, `new Function`은 항상 글로벌 스코프에서 실행되고 매개변수로 의존성을 명시적으로 주입할 수 있어 깔끔합니다.

**5개 매개변수 주입**: `__guard`, `__createProxy`, `__traceLine`, `__args`, `console`. 변환된 코드는 이 5개 이름을 직접 호출/참조합니다 (transformer가 그렇게 삽입했으니까).

**hasArgs 분기**: 사용자 함수 + 인자가 있으면 → `__entry__()`가 사용자 함수를 리턴할 테니 그걸 받아서 `apply`. 아니면 → `__entry__()`만 실행하면 끝.

### 6-13. 응답 메시지 (`build-worker-code.ts:197-202`)

```javascript
self.postMessage({
  type: 'success',
  result: { steps: steps, tree: rootNode },
  finalReturnValue: deepClone(finalReturnValue),
  consoleLogs: consoleLogs
});
```

`tree: rootNode`로 전체 트리를 통째로 전송. `finalReturnValue`도 `deepClone`해서 직렬화 안전.

`postMessage`는 내부적으로 [Structured Clone Algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)으로 데이터를 복사합니다. 함수나 DOM 노드는 못 보내지만, 우리가 만든 객체는 plain object/array/primitive뿐이라 안전.

---

## 7. 손으로 추적하는 `factorial(3)` 전체 흐름

이론을 다 봤으니 실제로 한 번 끝까지 따라가봅니다.

### 7-1. 입력

```javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
```

`args = [3]`.

### 7-2. `analyzeCode` 결과

```typescript
strippedCode (= wrappedCode):
  function __entry__() {
  function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  }
  return factorial;
  }

analysis: {
  entryFuncName: "__entry__",
  entryParamNames: ["n"],                  // factorial의 매개변수
  recursiveFuncName: "factorial",
  recursiveParamNames: ["n"],
  tracedFuncStartLine: 2,                  // wrappedCode 기준 factorial 정의 줄
  tracedFuncEndLine: 5,
  localVarNames: [],                        // __entry__ 자체에 var/let/const 없음
  hasRecursion: true,
  lineOffset: 1,
  userTopLevelFuncName: "factorial",
}
```

`localVarNames`가 비어있는 게 흥미롭습니다. `__entry__` 안의 `function factorial`은 FunctionDeclaration이지만 `extractLocalVarNames`에서 모으는 건 그 함수의 **매개변수**뿐 (`function`의 `n`). 그래서 결과는 `["n"]`이 됩니다 (사실 위 분석 결과의 `[]`는 단순화한 것 — 실제로는 `["n"]`).

### 7-3. `transformCode` 결과 (개념적으로)

```javascript
function __entry__() {
  function factorial(n) {
    var __captureVars = function() {
      var __v = {};
      try { __v.n = n } catch(__e) { __v.n = "-" }
      return __v;
    };
    __traceLine(3, __captureVars());           // if (n <= 1)
    if (n <= 1) return 1;
    __traceLine(4, __captureVars());           // return n * ...
    return n * factorial(n - 1);
    __traceLine(5, __captureVars());           // 함수 끝 (도달 안 함)
  }
  factorial = __createProxy(factorial);
  __traceLine(6, __captureVars());             // return factorial 줄
  return factorial;
}
```

(라인 번호는 wrappedCode 기준. 실제 실행 시 `lineOffset=1`을 빼서 사용자 코드 기준으로 보정됨)

### 7-4. Worker 실행 — Step이 쌓이는 순서

`runFn`이 호출되면:

1. `__entry__()` 호출.
2. `factorial` 함수 정의 → 즉시 `factorial = __createProxy(factorial)`로 덮어쓰기.
3. `__entry__` body 끝의 `__traceLine` 호출 (사용자 코드 5번줄? 보정 후 무시 가능). `return factorial`로 빠져나옴.
4. Worker가 `__fn = __entry__()`로 받은 후, `__fn.apply(null, [3])` 호출.
5. **여기서 Proxy.apply 발동** — `factorial(3)` 첫 호출.
   - 노드 `node-1` 생성, rootNode.children에 추가, callStack에 push.
   - 진입 Step 생성: `{ id: 0, codeLine: 1, activeNodeId: "node-1", description: "factorial(3)", variables: {n: 3} }`.
   - `Reflect.apply`로 실제 factorial(3) 실행.
6. factorial body 안에서:
   - `__traceLine(3, ...)` → Step `{ id: 1, codeLine: 2, variables: {n: 3}, description: "" }` (라인 보정: 3-1=2).
   - `n <= 1` 거짓이라 통과.
   - `__traceLine(4, ...)` → Step `{ id: 2, codeLine: 3, variables: {n: 3} }`.
   - `factorial(n - 1)` 호출 → **다시 Proxy.apply** (재귀).
7. `factorial(2)` 진입:
   - `node-2` 생성, `node-1.children`에 추가, callStack push.
   - 진입 Step: `{ id: 3, codeLine: 1, activeNodeId: "node-2", description: "factorial(2)", variables: {n: 2} }`.
   - body 안: Step id 4, 5 (n <= 1 체크, return 라인).
   - `factorial(1)` 호출 → 또 Proxy.
8. `factorial(1)` 진입:
   - `node-3` 생성.
   - 진입 Step: id 6.
   - body 안: `__traceLine(3, ...)` → Step id 7 (n=1, n <= 1 줄).
   - `return 1` 즉시 — body의 두 번째 trace는 도달 안 함.
   - Proxy.apply의 catch 안 거치고 정상 리턴 → `node-3.status = 'completed'`, callStack pop.
9. `factorial(2)`로 복귀:
   - `n * factorial(n-1)` = `2 * 1` = `2` 리턴 → `node-2.status = 'completed'`, pop.
10. `factorial(3)`으로 복귀:
    - `3 * 2` = `6` 리턴 → `node-1.status = 'completed'`, pop.
11. callStack 비음. `finalReturnValue = 6`. postMessage success.

### 7-5. 최종 트리 모양

```
node-0 (root, label "factorial", args "3")
  └─ node-1 (label "factorial", args "3", status "completed")
        └─ node-2 (label "factorial", args "2", status "completed")
              └─ node-3 (label "factorial", args "1", status "completed")
```

### 7-6. Step 배열 요약 (8개)

| id | codeLine | activeNodeId | description | variables.n |
|----|----------|--------------|-------------|---|
| 0 | 1 | node-1 | factorial(3) | 3 |
| 1 | 2 | node-1 |  | 3 |
| 2 | 3 | node-1 |  | 3 |
| 3 | 1 | node-2 | factorial(2) | 2 |
| 4 | 2 | node-2 |  | 2 |
| 5 | 3 | node-2 |  | 2 |
| 6 | 1 | node-3 | factorial(1) | 1 |
| 7 | 2 | node-3 |  | 1 |

(실제로는 root의 진입과 종료 시 추가 Step이 더 있을 수 있음 — 이 표는 개념적 추적)

이 8개 Step이 useAlgorithmPlayer에 들어가, 사용자가 ▶ 누르면 0→7로 진행하면서 시각화가 갱신됩니다.

---

## 8. Python 엔진 — `executor.ts` + `pyodide-worker.ts`

### 8-1. 모듈 레벨 싱글톤 (`src/engine/python/executor.ts:15-32`)

```typescript
let worker: Worker | null = null;
let state: PyodideState = "idle";
let readyPromise: Promise<void> | null = null;
const stateListeners: Set<(state: PyodideState) => void> = new Set();

function notifyState(newState: PyodideState) {
  state = newState;
  stateListeners.forEach((fn) => fn(newState));
}
export function getPyodideState(): PyodideState { return state; }
export function onPyodideStateChange(listener): () => void {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
}
```

JS Worker는 매 실행마다 새로 만들어지지만 (5MB의 Pyodide를 매번 로드할 순 없으니), Python Worker는 **모듈이 살아있는 동안 단 하나만 존재**합니다. 상태(idle/loading/ready/error)를 추적하고, UI가 구독할 수 있는 옵저버 패턴.

### 8-2. `ensurePyodideWorker` (`executor.ts:34-63`)

```typescript
export function ensurePyodideWorker(): Promise<void> {
  if (state === "ready" && worker) return Promise.resolve();    // 이미 준비됨
  if (readyPromise) return readyPromise;                          // 진행 중인 약속 재사용

  notifyState("loading");

  readyPromise = new Promise<void>((resolve, reject) => {
    const blob = new Blob([buildPyodideWorkerCode()], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    worker = new Worker(url);
    URL.revokeObjectURL(url);

    const initHandler = (e) => {
      if (e.data.type === "ready") {
        worker!.removeEventListener("message", initHandler);
        notifyState("ready");
        resolve();
      } else if (e.data.type === "error") {
        worker!.removeEventListener("message", initHandler);
        notifyState("error");
        reject(new Error(e.data.message));
      }
    };

    worker.addEventListener("message", initHandler);
    worker.postMessage({ type: "init" });
  });

  return readyPromise;
}
```

**3중 가드**: (1) ready면 즉시, (2) 진행 중이면 그 promise 재사용, (3) 아니면 새로 시작. `how-it-was-built.md` 15번에서 "Python 탭 hover 시 preload"가 결국 이 함수를 미리 호출하는 것일 뿐입니다.

`initHandler`는 `removeEventListener`로 자기 자신을 제거 — 이후 `execute` 메시지 핸들러와 충돌 안 나게.

### 8-3. `executePython` (`executor.ts:65-102`)

```typescript
export async function executePython(code, args, timeoutMs = DEFAULT_TIMEOUT_MS) {
  await ensurePyodideWorker();                                   // 준비 보장
  if (!worker) throw new Error("Pyodide worker not initialized.");

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker!.terminate();
      worker = null; state = "idle"; readyPromise = null;
      reject(new Error(`Execution timed out after ${timeoutMs / 1000} seconds.`));
    }, timeoutMs);

    const handler = (e) => {
      clearTimeout(timer);
      worker!.removeEventListener("message", handler);
      if (e.data.type === "success") {
        resolve({ result, hasRecursion, finalReturnValue, consoleLogs });
      } else {
        reject(new Error(e.data.message));
      }
    };

    worker!.addEventListener("message", handler);
    worker!.postMessage({ type: "execute", code: stripSelfParam(code), args });
  });
}
```

JS Worker와 결정적으로 다른 점:
- **타임아웃 시에만 worker 리셋**: 정상 실행은 worker를 살려둔다.
- **handler를 매 호출마다 add/remove**: init과 execute 응답이 서로 섞이지 않게.
- `stripSelfParam(code)`: `def method(self, x)` 같은 클래스 메서드 시그니처에서 `self`를 제거 — 트레이서가 메서드/함수를 구분 안 하고 처리하기 위한 정규화.

### 8-4. `stripSelfParam` (`python/analyze.ts:24-29`)

```typescript
export function stripSelfParam(code: string): string {
  return code.replace(
    /^(\s*def\s+\w+\s*)\(\s*self\s*,?\s*/gm,
    (_, prefix) => `${prefix}(`,
  );
}
```

정규식으로 `def name(self, ...)` → `def name(...)`. multiline 플래그(`m`)로 여러 줄에서 모두 처리.

### 8-5. Pyodide Worker 부트 (`pyodide-worker.ts:11-46`)

```javascript
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js");

let pyodide = null;
let isReady = false;

async function initialize() {
  try {
    pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/" });

    // Pyodide 로드 후에 네트워크 API 차단 (loadPyodide 자체는 fetch 필요)
    self.importScripts = undefined;
    self.fetch = undefined;
    self.XMLHttpRequest = undefined;
    self.WebSocket = undefined;
    self.EventSource = undefined;

    // Python 측에서도 위험한 모듈 차단
    pyodide.runPython(`
import sys
for mod in ['subprocess', 'os', 'shutil', 'socket', 'ctypes', 'multiprocessing']:
    sys.modules[mod] = None
sys.setrecursionlimit(200)
`);

    // 트레이서 코드 주입 (이후 _run_traced 함수가 전역에 존재)
    pyodide.runPython(${JSON.stringify(PYTHON_TRACER)});

    isReady = true;
    self.postMessage({ type: "ready" });
  } catch (err) {
    self.postMessage({ type: "error", message: "Failed to initialize Python: " + err.message });
  }
}
```

순서가 중요합니다:
1. `importScripts`로 pyodide.js 로드.
2. `loadPyodide`가 CDN에서 wasm + 표준 라이브러리 다운로드 (~5MB, 2-5초).
3. **로드 완료 후에야** 네트워크 API 차단 (그 전에 차단하면 loadPyodide가 실패).
4. Python 모듈 차단 + 재귀 한도 200.
5. 트레이서 코드 평가.
6. ready 메시지 송신.

### 8-6. 실행 메시지 처리 (`pyodide-worker.ts:60-110`)

```javascript
if (data.type === "execute") {
  if (!isReady) { /* error 응답 */ return; }
  try {
    var code = data.code;
    var args = data.args || [];

    pyodide.globals.set("_user_code", code);
    pyodide.globals.set("_user_args", pyodide.toPy(args));

    pyodide.runPython("_result = _run_traced(_user_code, list(_user_args))");
    pyodide.runPython("import json as _json; _result_json = _json.dumps(_result, default=str)");
    var resultJson = pyodide.globals.get("_result_json");
    var result = JSON.parse(resultJson);

    var steps = (result.steps || []).map(function(s, i) {
      return {
        id: s.id, type: s.type, codeLine: s.codeLine,
        activeNodeId: s.activeNodeId, activePath: s.activePath || [],
        variables: s.variables || {}, description: s.description || ""
      };
    });

    function convertTree(node) {
      return {
        id: node.id || "root", label: node.label || "",
        args: node.args || "",
        children: (node.children || []).map(convertTree),
        status: node.status || "completed"
      };
    }

    self.postMessage({
      type: "success",
      result: { steps: steps, tree: convertTree(result.tree) },
      hasRecursion: result.hasRecursion || false,
      finalReturnValue: result.finalReturnValue,
      consoleLogs: result.consoleLogs || []
    });
  } catch (err) {
    self.postMessage({ type: "error", message: err.message || String(err) });
  }
}
```

**Python ↔ JS 데이터 교환**: `pyodide.globals.set/get` + JSON 직렬화. 직접 `pyodide.toJs()`를 쓸 수도 있지만 JSON으로 우회하면 타입 변환 엣지케이스를 피할 수 있고, `default=str`로 직렬화 불가 객체도 fallback.

`steps.map`과 `convertTree`로 **다시 정규화**하는 이유: 트레이서가 누락한 필드가 있어도 시각화가 안 깨지도록 모든 필드에 기본값.

---

## 9. Python 트레이서 — `tracer.py.ts` 한 줄씩

위치: `src/engine/python/tracer.py.ts`

이 파일이 export하는 `PYTHON_TRACER`는 **순수 Python 코드 문자열**입니다. 빌드 타임에 Worker 코드에 `JSON.stringify`되어 박힘.

### 9-1. 전역 상태 (`tracer.py.ts:12-21`)

```python
_steps = []
_step_id = 0
_call_stack = []
_root_node = {"id": "root", "label": "", "args": "", "children": [], "status": "completed"}
_node_counter = 0
_recursive_func_name = None
_has_recursion = False
_max_steps = 5000
_last_traced_line = -1
_max_depth = 200
```

JS의 Worker 클로저 변수와 1:1 대응. `_last_traced_line`이 JS엔 없는 것 — Python은 같은 줄에서 여러 line 이벤트가 발생할 수 있어 (리스트 컴프리헨션 등) 중복 합치기용.

### 9-2. `_find_recursive_func` (`tracer.py.ts:22-46`)

```python
def _find_recursive_func(source):
    """Find top-level func and any recursive func (including nested)."""
    try:
        tree = _ast_module.parse(source)
    except:
        return None, None

    top_func = None
    for node in tree.body:                              # top-level만 보고
        if isinstance(node, _ast_module.FunctionDef):
            top_func = node.name
            break

    if not top_func:
        return None, None

    for node in _ast_module.walk(tree):                 # 모든 함수 (중첩 포함)
        if isinstance(node, _ast_module.FunctionDef):
            fn_name = node.name
            for child in _ast_module.walk(node):
                if isinstance(child, _ast_module.Call):
                    if isinstance(child.func, _ast_module.Name) and child.func.id == fn_name:
                        return top_func, fn_name        # 첫 번째 재귀 함수 리턴

    return top_func, None
```

JS의 `analyzer.ts`와 똑같은 일을 Python AST로. `ast.walk()`가 트리를 평탄화해서 순회해주기 때문에 코드가 짧음.

### 9-3. `_safe_value` (`tracer.py.ts:48-70`)

```python
def _safe_value(val, depth=0):
    if depth > 3: return str(val)                       # 깊이 제한 (순환/거대 객체 방어)
    if val is None: return None
    if isinstance(val, bool): return val
    if isinstance(val, (int, float)): return val
    if isinstance(val, str):
        return val if len(val) < 200 else val[:200] + "..."
    if isinstance(val, list):
        return [_safe_value(v, depth + 1) for v in val[:100]]  # 100개 제한
    if isinstance(val, tuple):
        return [_safe_value(v, depth + 1) for v in val[:100]]
    if isinstance(val, set):
        return [_safe_value(v, depth + 1) for v in sorted(val, key=str)[:100]]
    if hasattr(val, 'items'):                           # dict-like
        return dict({str(k): _safe_value(v, depth + 1) for k, v in list(val.items())[:50]})
    try: return str(val)
    except: return "?"
```

JS의 `deepClone`보다 정교합니다 — 깊이/길이 제한이 명시적. JSON 직렬화 가능한 형태로 normalize.

### 9-4. `_capture_vars` (`tracer.py.ts:72-92`)

```python
def _capture_vars(frame):
    result = {}
    for k, v in frame.f_locals.items():
        if k.startswith("_"):                           # 트레이서 내부 변수 스킵
            continue
        if isinstance(v, (FunctionType, BuiltinFunctionType, ModuleType, type)):
            continue                                    # 함수/모듈/타입 제외
        if callable(v) and not isinstance(v, (list, dict, set, tuple)):
            continue                                    # 그 외 callable도 제외
        try:
            if isinstance(v, (int, float, str, bool, type(None))):
                result[k] = v                           # immutable: 복사 불필요
            else:
                result[k] = _safe_value(copy.deepcopy(v))  # mutable: deepcopy
        except:
            try: result[k] = str(v)
            except: result[k] = "?"
    return result
```

`how-it-was-built.md` 15번의 "immutable 변수 deepcopy 스킵" 최적화가 이 분기. int/float/str/bool/None은 그냥 참조 저장 (복사해도 같은 값).

### 9-5. `_get_active_path` (`tracer.py.ts:94-98`)

```python
def _get_active_path():
    path = [_root_node["id"]]
    for frame_info in _call_stack:
        path.append(frame_info["node"]["id"])
    return path
```

JS의 `getPath`보다 단순 — 항상 루트부터 시작.

### 9-6. `_tracer` 콜백 — sys.settrace의 핵심 (`tracer.py.ts:100-188`)

```python
def _tracer(frame, event, arg):
    global _step_id, _node_counter, _has_recursion

    # (a) 사용자 코드가 아닌 프레임은 무시
    if frame.f_code.co_filename != "<user>":
        return _tracer

    fn_name = frame.f_code.co_name

    if _step_id >= _max_steps:
        raise RuntimeError("Step limit exceeded ...")

    # (b) 재귀 함수 진입 이벤트
    if event == "call" and fn_name == _recursive_func_name:
        _has_recursion = True
        _node_counter += 1

        param_names = frame.f_code.co_varnames[:frame.f_code.co_argcount]
        args_str = ", ".join(str(_safe_value(frame.f_locals.get(p))) for p in param_names)

        node = {
            "id": "node-" + str(_node_counter),
            "label": fn_name, "args": args_str,
            "children": [], "status": "active",
        }

        if _call_stack:
            _call_stack[-1]["node"]["children"].append(node)
        else:
            _root_node["children"].append(node)
        _call_stack.append({"node": node, "fn": fn_name})

        if len(_call_stack) > _max_depth:
            raise RuntimeError("Recursion depth exceeded ...")

        _steps.append({
            "id": _step_id, "type": "call",
            "codeLine": frame.f_lineno, "activeNodeId": node["id"],
            "activePath": _get_active_path(),
            "variables": _capture_vars(frame),
            "description": fn_name + "(" + args_str + ")"
        })
        _step_id += 1
        return _tracer

    # (c) 재귀 함수 리턴 이벤트
    if event == "return" and fn_name == _recursive_func_name and _call_stack:
        finished = _call_stack.pop()
        finished["node"]["status"] = "completed"
        current_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]
        _steps.append({
            "id": _step_id, "type": "return",
            "codeLine": frame.f_lineno, "activeNodeId": current_id,
            "activePath": _get_active_path(),
            "variables": _capture_vars(frame),
            "description": "return " + str(_safe_value(arg))
        })
        _step_id += 1
        return _tracer

    # (d) 일반 line 이벤트 (모든 줄)
    if event == "line" and (fn_name != "<module>" or _recursive_func_name is None):
        global _last_traced_line
        line_no = frame.f_lineno

        if line_no == _last_traced_line and _steps:
            # 같은 줄 반복 → 마지막 step의 변수만 갱신 (리스트 컴프리헨션 등)
            _steps[-1]["variables"] = _capture_vars(frame)
        else:
            current_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]
            _steps.append({
                "id": _step_id, "type": "call",
                "codeLine": line_no, "activeNodeId": current_id,
                "activePath": _get_active_path(),
                "variables": _capture_vars(frame),
                "description": ""
            })
            _step_id += 1
            _last_traced_line = line_no

    return _tracer
```

각 분기:

- **(a)** `co_filename != "<user>"` 필터 — 트레이서 함수 자체가 추적되지 않게 (`how-it-was-built.md` 14번의 첫 번째 트릭).
- **(b)** 재귀 함수의 `call` 이벤트 — 트리 노드 생성. JS의 `__createProxy.apply`와 동일한 일.
- **(c)** 재귀 함수의 `return` 이벤트 — `arg`가 리턴값이라 `description: "return 6"` 같이 표시.
- **(d)** 일반 line 이벤트 — `<module>` 프레임은 재귀 함수가 있을 때 스킵 (top-level에서 함수 정의/호출하는 줄들이 잡히는 걸 방지). `_last_traced_line` 합치기로 한 줄 이벤트가 여러 번 발생해도 step 하나로 통합.

### 9-7. `_run_traced` 메인 (`tracer.py.ts:190-306`)

```python
def _run_traced(source, args_list):
    # (a) 전역 상태 리셋
    global _steps, _step_id, _call_stack, _root_node, _node_counter
    global _recursive_func_name, _has_recursion, _last_traced_line
    _steps = []; _step_id = 0; _call_stack = []
    _node_counter = 0; _has_recursion = False; _last_traced_line = -1
    _root_node = {"id": "root", ...}

    # (b) 함수 분석
    func_name, rec_func_name = _find_recursive_func(source)
    _recursive_func_name = rec_func_name
    if func_name: _root_node["label"] = func_name

    # (c) print 캡처용 함수
    console_logs = []
    def _captured_print(*a, **kw):
        text = " ".join(str(x) for x in a)
        console_logs.append({"text": text, "stepIdx": max(0, _step_id - 1)})

    # (d) 안전한 builtins (위험한 함수 제거 + print 교체)
    _safe_builtins = {
        k: v for k, v in __builtins__.items()
        if k not in ("open", "eval", "exec", "compile", "__import__",
                     "globals", "locals", "breakpoint", "exit", "quit",
                     "input", "help", "copyright", "credits", "license",)
    } if isinstance(__builtins__, dict) else {
        ...                                              # 모듈 형태일 때 fallback
    }
    _safe_builtins["print"] = _captured_print
    _safe_builtins["__build_class__"] = ...              # class 정의 위해 필요
    exec_globals = {"__builtins__": _safe_builtins}

    # (e) 사용자 코드를 "<user>" 파일명으로 컴파일
    user_code = compile(source, "<user>", "exec")
    final_return = None

    if func_name and args_list:
        # (f-1) 함수 + 인자: 트레이서 OFF로 정의 → ON으로 호출
        exec(user_code, exec_globals)                    # 함수 정의 (안 추적)
        if func_name in exec_globals:
            sys.settrace(_tracer)
            try:
                final_return = exec_globals[func_name](*args_list)
            finally:
                sys.settrace(None)
            # 마지막 step 추가 (시각화에서 종료 상태 보여주기 위함)
            ...
    else:
        # (f-2) 함수 없음: 그냥 ON으로 exec
        sys.settrace(_tracer)
        try:
            exec(user_code, exec_globals)
        finally:
            sys.settrace(None)
        # 종료 후 전역 변수 상태 캡처
        ...

    return {
        "steps": _steps, "tree": _root_node,
        "hasRecursion": _has_recursion,
        "finalReturnValue": _safe_value(final_return),
        "consoleLogs": console_logs,
    }
```

**(d) builtins 화이트리스트**: `eval`, `exec`, `compile`, `__import__`, `open`, `input`, `globals`, `locals` 등을 제거. 이게 진짜 보안 경계. `print`는 `_captured_print`로 교체.

**(e) `compile(source, "<user>", "exec")`**: 컴파일된 코드 객체의 `co_filename`을 명시적으로 `"<user>"`로 지정. 그래야 `_tracer`의 `(a)` 분기가 동작.

**(f-1) vs (f-2)**: `how-it-was-built.md` 14번의 두 번째 트릭. 함수 정의는 추적할 필요 없으니 OFF 상태에서 정의하고, 호출만 ON 상태에서 추적.

---

## 10. 시각화 레이어

### 10-1. `useAlgorithmPlayer` (`src/player/useAlgorithmPlayer.ts`)

```typescript
interface State { currentIndex: number; isPlaying: boolean; speed: Speed; }

type Action =
  | { type: "STEP_FORWARD"; max: number }
  | { type: "STEP_BACKWARD" }
  | { type: "JUMP_TO"; index: number; max: number }
  | { type: "JUMP_TO_START" }
  | { type: "JUMP_TO_END"; max: number }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_SPEED"; speed: Speed }
  | { type: "RESET" }
  | { type: "AUTO_STEP"; max: number };
```

**11개 액션의 의미**:
- `STEP_FORWARD/BACKWARD`: 한 칸 이동 (Math.min/max로 클램핑).
- `JUMP_TO`: 임의 위치로. 슬라이더 드래그 등에서 사용.
- `JUMP_TO_START/END`: 양 끝으로.
- `PLAY/PAUSE/TOGGLE_PLAY`: isPlaying 토글.
- `SET_SPEED`: 0.5 / 1 / 2 / 4 중 하나.
- `RESET`: index=0, isPlaying=false (speed는 유지).
- `AUTO_STEP`: 인터벌이 디스패치. 끝에 도달하면 자동 일시정지.

```typescript
case "AUTO_STEP":
  if (state.currentIndex >= action.max) return { ...state, isPlaying: false };
  return { ...state, currentIndex: state.currentIndex + 1 };
```

### 10-2. 3개의 useEffect

```typescript
// (1) 최신 steps를 ref에 동기화
useEffect(function syncStepsRef() {
  stepsRef.current = steps;
}, [steps]);

// (2) steps가 바뀌면 처음으로
useEffect(function resetOnStepsChange() {
  dispatch({ type: "RESET" });
}, [totalSteps]);

// (3) 자동 재생 인터벌
useEffect(function autoPlayInterval() {
  if (!state.isPlaying || totalSteps === 0) return;
  const interval = setInterval(() => {
    dispatch({ type: "AUTO_STEP", max: stepsRef.current.length - 1 });
  }, 800 / state.speed);
  return function cleanup() { clearInterval(interval); };
}, [state.isPlaying, state.speed, totalSteps]);
```

**(1)이 필요한 이유**: (3)의 setInterval 콜백은 `state` 클로저를 캡처하지만, dispatch 안에서 `stepsRef.current.length`로 항상 최신 길이를 참조해야 함. 안 그러면 새 코드 실행 직후 옛 max로 동작.

**(2)가 필요한 이유**: 사용자가 새 알고리즘을 선택하거나 코드를 다시 실행하면 totalSteps가 바뀜 → 자동으로 처음 Step으로 돌아가야 자연스러움.

**(3)의 `800 / state.speed`**: speed=1이면 800ms, speed=2면 400ms, speed=4면 200ms. 사람이 따라갈 만한 속도부터 빠른 속도까지.

### 10-3. d3-hierarchy 트리 레이아웃 (`src/shared/lib/tree-layout.ts`)

```typescript
export function computeTreeLayout(root: TreeNode): TreeLayoutResult {
  const rootHierarchy = hierarchy(root, (d) => d.children);
  const nodeWidth = estimateMaxNodeWidth(root) + 16;

  const treeLayout = tree<TreeNode>()
    .nodeSize([nodeWidth, NODE_HEIGHT])                  // 가로/세로 간격
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

  treeLayout(rootHierarchy);                             // x, y 계산 (in-place)

  // 모든 노드/엣지 평탄화
  const allNodes: PositionedNode[] = [];
  const allEdges = [];
  function walk(node) {
    allNodes.push(node);
    if (node.children) {
      for (const child of node.children) {
        allEdges.push({ source: node, target: child });
        walk(child);
      }
    }
  }
  walk(positioned);

  // 바운딩 박스 + padding
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of allNodes) {
    if (node.x < minX) minX = node.x; ...
  }
  const padding = 60;
  minX -= padding; ...

  return { root: positioned, allNodes, allEdges, bounds: {...} };
}
```

핵심:
- `nodeSize([w, h])`: Reingold-Tilford 알고리즘에 노드 크기를 알려줘서 겹치지 않게.
- `separation(a, b)`: 같은 부모면 1, 다른 부모면 1.2 → 서브트리 사이 더 넓게.
- `estimateMaxNodeWidth`: 모든 노드의 라벨/args 길이 중 최대값을 픽셀로 환산. 가장 긴 노드 기준으로 간격을 잡아 모든 노드가 충돌 없이 배치되게.

### 10-4. `usePannable` (`src/shared/hooks/usePannable.ts`)

```typescript
export function usePannable(containerRef, initialViewBox = "0 0 800 400") {
  const [viewBox, setViewBox] = useState(initialViewBox);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);

  const onMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, vb: parseViewBox(viewBox) };
  };

  const onMouseMove = (e) => {
    if (!isDragging || !dragStart.current || !containerRef.current) return;
    const el = containerRef.current;
    const [vbX, vbY, vbW, vbH] = dragStart.current.vb;
    const scaleX = vbW / el.clientWidth;
    const scaleY = vbH / el.clientHeight;
    const dx = (dragStart.current.x - e.clientX) * scaleX;
    const dy = (dragStart.current.y - e.clientY) * scaleY;
    setViewBox(`${vbX + dx} ${vbY + dy} ${vbW} ${vbH}`);
  };
  ...
}
```

**핵심 트릭**: SVG viewBox는 픽셀이 아니라 SVG 좌표계의 단위. 마우스가 픽셀 단위로 움직이면 `vbW / clientWidth`로 스케일링해서 viewBox 좌표로 변환해야 자연스럽게 panning 됨.

`dragStart`를 useRef로 잡는 이유: 매 mousemove마다 setState하면 리렌더링이 잦아짐. 시작점은 ref에 두고 viewBox만 state로.

### 10-5. TreeView (`src/visualizer/tree-view/TreeView.tsx`)

```typescript
const layout = useMemo(() => computeTreeLayout(tree), [tree]);
const activePathSet = useMemo(() => new Set(currentStep?.activePath ?? []), [currentStep]);
const activeNodeId = currentStep?.activeNodeId;
const nodeById = useMemo(() => new Map(layout.allNodes.map((n) => [n.data.id, n])), [layout]);

useEffect(function updateViewBox() {
  if (isDragging) return;                                // 사용자 드래그 중엔 카메라 X
  if (activeNodeId && containerRef.current) {
    const activeNode = nodeById.get(activeNodeId);
    if (activeNode) {
      const el = containerRef.current;
      const viewWidth = Math.max(400, Math.min(layout.bounds.width, el.clientWidth));
      const viewHeight = Math.max(300, Math.min(layout.bounds.height, el.clientHeight));
      setViewBox(`${activeNode.x - viewWidth/2} ${activeNode.y - viewHeight/2} ${viewWidth} ${viewHeight}`);
      return;
    }
  }
  // 활성 노드 없으면 전체 트리 보기
  const { bounds } = layout;
  setViewBox(`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`);
}, [activeNodeId, layout, nodeById]);
```

세 가지 행동:
1. 활성 노드가 있으면 그 노드를 중앙에 두는 viewBox 계산.
2. 사용자가 드래그 중이면 카메라 자동 이동을 멈춤 (사용자 우선).
3. 활성 노드 없으면 전체 트리가 보이도록 fitting.

```typescript
const getNodeStatus = (node) => {
  if (node.data.id === activeNodeId) return "active";    // 활성 노드 자체
  if (activePathSet.has(node.data.id)) return "active";  // 경로 위 노드도
  return node.data.status;                                // 그 외는 원래 상태
};
```

`activePath` 위의 모든 노드를 `active`로 그리는 게 중요 — 단순히 현재 노드 하나만 강조하면 어디서 들어왔는지 알 수 없음.

```typescript
opacity={isActive || inPath ? 1 : 0.25}
```

활성 경로 밖은 25% 투명도. 큰 트리에서 현재 위치만 또렷하게.

### 10-6. CodePanel (`src/visualizer/code-panel/CodePanel.tsx`)

```typescript
export const CodePanel = memo(function CodePanel({ html, activeLine, title }) {
  const codeRef = useRef(null);

  useEffect(function highlightActiveLine() {
    if (!codeRef.current) return;

    // 기존 하이라이트 제거
    codeRef.current.querySelectorAll(".highlighted-line").forEach((el) => {
      el.classList.remove("highlighted-line");
    });

    if (activeLine !== undefined) {
      const currEl = codeRef.current.querySelector(`[data-line="${activeLine}"]`);
      currEl?.classList.add("highlighted-line");
      currEl?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeLine, html]);

  return (
    <div className={styles.container}>
      {title && <div className={styles.header}>{title}</div>}
      <div ref={codeRef} className={styles.codeWrapper}
           dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
});
```

**왜 React가 아니라 직접 DOM 조작?**: Shiki HTML은 미리 서버에서 렌더링된 거대한 문자열입니다. 매번 React로 다시 렌더링하면 비효율 → 한 번만 innerHTML로 넣고, 라인 하이라이트는 클래스 토글로만 처리.

`memo`로 감싼 이유: 부모 리렌더링 시 html 문자열이 같으면 다시 렌더링하지 않게.

### 10-7. VariablePanel — 변경 감지 자세히

```typescript
function didChange(prev, curr) {
  if (prev === curr) return false;                       // 참조 같음
  if (typeof prev !== typeof curr) return true;          // 타입 다름
  if (typeof prev !== "object" || prev === null)
    return prev !== curr;                                 // 원시값
  return JSON.stringify(prev) !== JSON.stringify(curr);  // 객체/배열 깊은 비교
}

function cellChanged(prevArr, currArr, index) {
  if (!Array.isArray(prevArr)) return true;
  if (index >= prevArr.length) return true;              // 새로 추가된 칸
  return JSON.stringify(prevArr[index]) !== JSON.stringify(currArr[index]);
}

function cell2dChanged(prevArr, row, col, value) {
  if (!Array.isArray(prevArr)) return true;
  if (row >= prevArr.length) return true;
  const prevRow = prevArr[row];
  if (!Array.isArray(prevRow)) return true;
  if (col >= prevRow.length) return true;
  return JSON.stringify(prevRow[col]) !== JSON.stringify(value);
}
```

3단계 감지: 변수 전체 → 1D 배열 셀 → 2D 배열 셀. 그래서 `arr[3]`만 바뀌어도 그 셀 하나만 노란 outline. N-Queen 같은 2D 배열에서 한 칸만 바뀐 것도 정확히 표시 가능.

---

## 11. 프리셋 = 데이터

### 11-1. 메타데이터 (`src/algorithm/presets/recursion.ts`)

```typescript
export const recursionPresets: PresetAlgorithm[] = [
  {
    id: "permutations",
    name: "순열 (Permutations)",
    description: "n개 중 r개를 순서 있게 선택합니다",
    difficulty: "easy",
    category: "recursion",
    defaultArgs: [[1, 2, 3], 2],
    code: loadCode("permutations.js"),
  },
  // combinations, subsets, ...
];
```

각 프리셋은 7개 필드만 있는 plain 객체. `generateSteps()` 같은 함수 없음. `code` 필드만 있으면 `executeCustomCode`가 다 처리.

### 11-2. 코드 파일 분리

- `src/algorithm/presets/codes/permutations.js` 같은 실제 .js 파일.
- `loadCode("permutations.js")`가 빌드/런타임에 파일 내용을 문자열로 읽어옴 (`presets/load-code.ts`).
- 알고리즘 추가 비용: 파일 1개 + 카탈로그 객체 1개.

---

## 12. 부록: 파일 빠른 참조표

| 영역 | 파일 | 역할 |
|------|------|------|
| 진입점 | `src/engine/execute.ts` | 언어 분기 (JS/Python) |
| 데이터 모델 | `src/algorithm/types.ts` | Step, TreeNode, PresetAlgorithm 타입 |
| JS 분석 | `src/engine/analyzer.ts` | walkAst, findAllFunctions, __entry__ 래핑 |
| TS 제거 | `src/engine/strip-types.ts` | sucrase로 TS 문법만 제거 |
| JS 변환 | `src/engine/transformer.ts` | walkAndTransform, 추적 코드 삽입 |
| AST 빌더 | `src/engine/ast-builders.ts` | id, literal, call, expr 등 12개 헬퍼 |
| JS 실행 | `src/engine/executor.ts` | Worker 생성, postMessage, 타임아웃 |
| Worker 코드 | `src/engine/build-worker-code.ts` | __traceLine, __createProxy, __guard, fakeConsole |
| 상수 | `src/engine/constants.ts` | __entry__ 등 이름 + 한도 |
| Python 진입 | `src/engine/python/executor.ts` | Pyodide Worker 싱글톤, ensure/execute |
| Python Worker | `src/engine/python/pyodide-worker.ts` | importScripts, runPython |
| Python 트레이서 | `src/engine/python/tracer.py.ts` | _tracer, _capture_vars, _run_traced |
| Python 분석 | `src/engine/python/analyze.ts` | analyzePythonCode, stripSelfParam |
| 재생 훅 | `src/player/useAlgorithmPlayer.ts` | useReducer, 11 액션, 자동 재생 |
| 트리 레이아웃 | `src/shared/lib/tree-layout.ts` | d3-hierarchy 좌표 계산 |
| 패닝 | `src/shared/hooks/usePannable.ts` | viewBox 마우스 드래그 |
| 트리 시각화 | `src/visualizer/tree-view/TreeView.tsx` | SVG 노드/엣지, 카메라 자동 이동 |
| 코드 패널 | `src/visualizer/code-panel/CodePanel.tsx` | data-line 클래스 토글 |
| 변수 패널 | `src/visualizer/variable-panel/VariablePanel.tsx` | 1D/2D 셀 단위 변경 강조 |
| 프리셋 메타 | `src/algorithm/presets/recursion.ts`, `sorting.ts` | 알고리즘 카탈로그 |
| 프리셋 코드 | `src/algorithm/presets/codes/*.js` | 실제 알고리즘 JS |
| 코드 로더 | `src/algorithm/presets/load-code.ts` | .js 파일 → 문자열 |
