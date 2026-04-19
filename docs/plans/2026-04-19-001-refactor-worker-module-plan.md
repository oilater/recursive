---
title: "refactor: Convert JS worker from string template to real Web Worker module"
type: refactor
status: active
date: 2026-04-19
---

# refactor: Convert JS worker from string template to real Web Worker module

## Overview

Replace the 289-line string template in `src/engine/build-worker-code.ts` with a real TypeScript Web Worker module under `src/engine/javascript/`, loaded via the webpack-canonical `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` pattern.

The goal is to regain TypeScript tooling (types, IDE navigation, refactor, source maps, unit-testable pure helpers) that is currently unreachable because the worker is a giant backtick string. **No runtime behavior changes** — the transformer ↔ worker contract stays identical, all runtime-injected globals (`__guard`, `__createProxy`, `__traceLine`) keep their exact signatures, all sandbox shims stay, and the postMessage envelope shape stays the same.

## Problem Frame

The worker runtime that executes user code lives in `src/engine/build-worker-code.ts` as a template literal. A TypeScript function returns ~289 lines of JavaScript source as a string; `executor.ts` wraps it in a Blob, creates an object URL, and boots a classic `new Worker(url)`.

This pattern was an explicit preference, not a requirement. `docs/architecture-walkthrough.md:133` says verbatim:

> `buildWorkerCode()`는 Worker 안에서 실행할 자바스크립트를 문자열로 리턴합니다 (별도 .js 파일이 아닙니다 — 빌드 타임에 따로 분리해도 됐지만 한 함수 안에 다 두는 쪽을 택함).

Costs that have accumulated:

- **No type checking** inside the template — every `var` is `any`, the 12-field postMessage payload and 2-shape response envelope are stringly-typed
- **No IDE tooling** — rename, jump-to-def, inline-refactor, find-references all break at the backtick boundary
- **No unit tests** — `deepClone`, `formatArgs`, `cloneFrame`, `ownerFrameIndex` are all string-embedded. `integration.test.ts` stubs `__guard`/`__createProxy`/`__traceLine` with simplified versions, so the entire worker runtime is untested end-to-end
- **Hard to debug** — dev runtime runs under a `blob:...` URL; DevTools cannot map it back to source
- **Three copies of the contract** — payload shape exists in `executor.ts:68-82` (posting side), `build-worker-code.ts:11-23` (unpacking side), and a partial type in `types.ts:3-13`. Changes must be made in three places by hand

Next.js 16.2.3 on webpack supports the module-worker pattern with zero config changes — the migration target is well-understood.

## Requirements Trace

- **R1.** `executor.ts` boots the worker via `new Worker(new URL('./javascript/worker.ts', import.meta.url), { type: 'module' })` with **no config changes** to `next.config.ts`
- **R2.** Transformer ↔ worker runtime contract (`__createProxy(originalFunc, funcName, paramNames, ownVarNames, captureClosureFn)`, `__traceLine(line, varsSnapshot)`, `__guard()`) remains byte-identical in signature and semantics
- **R3.** The 12-field postMessage payload (`transformedCode`, `entryFuncName`, `hasRecursion`, `recursiveFuncName`, `recursiveParamNames`, `args`, `maxCalls`, `maxLoopIterations`, `maxSteps`, `lineOffset`, `userTopLevelFuncName`, `entryOwnVarNames`, `originalLineCount`) remains identical in both posting and unpacking sites — and gains a single shared type
- **R4.** Response envelopes (`{type: "success", result, finalReturnValue, consoleLogs}` / `{type: "error", message}`) remain identical in shape — and gain a single shared type
- **R5.** Security shims (`self.fetch = undefined`, `self.XMLHttpRequest = undefined`, `self.importScripts = undefined`, `self.WebSocket = undefined`, `self.EventSource = undefined`) run **before** any call to `new Function(...)` that executes user-transformed code. The transformer is not modified
- **R6.** `src/engine/build-worker-code.ts` is deleted once the new module boots successfully in dev AND production builds
- **R7.** Existing behavior preserved: 5-second timeout + `worker.terminate()`, `__guard` loop cap, `__traceLine` step cap, call-count cap, `correctedLine > originalLineCount` line filter, `rootNode` / `status: 'idle' | 'completed' | 'backtracked'` tree construction, `closureMap` WeakMap closure-snapshot mechanism, `fakeConsole` with `stepIdx` association
- **R8.** All 69 existing tests continue to pass (they do not exercise the worker, so they should be unaffected)
- **R9.** Manual browser verification across the example matrix (factorial recursion, curried closure, bubble sort, runtime error with step-limit hit, console.log output, timeout) shows identical step counts and tree structures before/after

## Scope Boundaries

**In scope:**
- The JavaScript worker only (`src/engine/build-worker-code.ts` → `src/engine/javascript/worker.ts`)
- `executor.ts` boot-site rewiring
- A shared typed envelope for both inbound payload and outbound response
- Optionally extracting pure helpers (`formatArgs`, `cloneFrame`) to a unit-testable module

**Out of scope:**
- The Python/Pyodide worker (`src/engine/python/pyodide-worker.ts`) — it uses `importScripts` to pull Pyodide from CDN, which requires classic worker. Separate refactor, separate plan
- Changing `transformer.ts` emission logic — the contract stays
- Moving unused constants (`CAPTURE_VARS`, `PUSH_FRAME`, `POP_FRAME` in `constants.ts`) — cleanup for a future pass
- `@vitest/web-worker` adoption for worker-integration tests — deferred; regression guard in this plan is manual browser testing + type checking
- Migrating dev/build from webpack to turbopack — pattern works on webpack out of the box; turbopack has open edges (Next.js issues #62650, #78784)

## Context & Research

### Relevant Code and Patterns

- `src/engine/build-worker-code.ts` — the 289-line worker string being replaced
- `src/engine/executor.ts:36-38` — the boot site to rewire (Blob + ObjectURL + `new Worker`)
- `src/engine/transformer.ts:355-448` — `wrapInPlace` and `proxyReassignment` emit `__createProxy(...)` calls. This plan does **not** modify these, but their emitted shape is the contract the new worker must satisfy
- `src/engine/constants.ts` — `TRACE_LINE`, `CREATE_PROXY`, `GUARD`, `ENTRY_FUNC_NAME` names used by both transformer and worker. Keep unchanged
- `src/engine/types.ts:3-13` — partial `ExecuteSuccessResponse` / `ExecuteErrorResponse` / `ExecuteResponse`; this plan extends these into a shared envelope
- `src/engine/python/pyodide-worker.ts` — parallel Python worker. Stays as-is. Its existence is why the new JS worker lives under `src/engine/javascript/` (mirroring `src/engine/python/`)
- `src/engine/__tests__/integration.test.ts:26-37` — the test harness stubs `__guard`/`__createProxy`/`__traceLine`. Keep unchanged; worker changes do not affect transformer tests

### Institutional Learnings

- `docs/solutions/best-practices/ast-transformer-and-worker-frame-model-2026-04-18.md` — the single most load-bearing document. Codifies five non-obvious runtime-contract facts that this refactor must preserve:
  1. **Hybrid frame binding**: `__createProxy` owns frame lifetime (runtime); transformer owns frame content (static via `__captureVars` closure). Do not merge sides
  2. **`__synthetic` marker**: every transformer-emitted AST node is tagged so the walker early-returns. Worker does not touch this, but any future refactor on the emission side must preserve
  3. **`FunctionDeclaration` vs `FunctionExpression`/`ArrowFunctionExpression` binding paths**: post-decl reassignment vs in-place wrap. Worker-side `__createProxy` handles both via the same apply trap
  4. **`deepClone` at collection time**: `__traceLine` deep-clones `varsSnapshot` when pushing a step. Functions become `{__kind: 'function', ...}` via a `WeakMap` populated by `__createProxy`. **The WeakMap must remain a single module-level singleton inside the worker — splitting it across files would break the lookup**
  5. **Grep-verify cross-cutting claims** — "X is only used by Y" must be verified, not assumed
- `docs/architecture-walkthrough.md` §6 (lines 115-164, 695-720) — line-by-line narration of the worker. Any line-number references in that doc will shift after this refactor; update the doc in a follow-up if staleness becomes a problem
- `docs/how-it-was-built.md` §5, §6, §16-4 — high-level rationale for worker isolation (infinite-loop containment, API removal). The `__entry__` wrapping + `lineOffset = 1` convention is enforced by `transformer.ts`, not the worker
- `docs/plans/2026-04-16-002-feat-python-support-plan.md:95` — Python worker uses classic workers + `importScripts` because CDN loading via Blob was unstable. **This constraint does not apply to the new JS worker**: same-origin module worker bundled by Next.js, no external script loading
- `docs/conventions/bundle-optimization.md` — CI has a 50 KB chunk threshold rule. Worker chunk size should be checked with `pnpm analyze` before and after

### External References

- [webpack Web Workers guide](https://webpack.js.org/guides/web-workers/) — canonical `new Worker(new URL(...))` pattern; static literal requirement
- [Next.js 16 webpack config docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack) — worker support is built in; no config changes needed
- [Next.js productionBrowserSourceMaps](https://nextjs.org/docs/app/api-reference/config/next-config-js/productionBrowserSourceMaps) — if prod source maps for worker are wanted later
- [Next.js discussion #29415](https://github.com/vercel/next.js/discussions/29415) — `workerPublicPath` when `assetPrefix` is set (not currently set in this project, so no action)
- [@vitest/web-worker](https://www.npmjs.com/package/@vitest/web-worker) — potential future integration-test helper (deferred)
- [vitest issue #6566](https://github.com/vitest-dev/vitest/issues/6566) — known module-mock isolation regression in worker tests; reason we defer integration tests

## Key Technical Decisions

- **Module worker (`type: "module"`) over classic worker**: ES imports work natively, separate helper files possible, better tree-shaking. We do not use `importScripts` so there is no reason to stay classic
- **`src/engine/javascript/` subdirectory**: mirrors the existing `src/engine/python/` convention. The `code-language-adapter.ts` already keys on `"javascript" | "python"` literals, so directory naming stays parallel to the domain axis
- **One worker entry file, pure helpers optionally extracted**: the worker runtime holds shared mutable state (`callStack`, `steps`, `closureMap`, counters). Splitting runtime functions across files would fracture that state or require injecting it as arguments — ugly. Only the truly pure helpers (`formatArgs`, `cloneFrame`) may live in a sibling file and gain tests. Other functions stay in `worker.ts`
- **Shared typed envelope in a single types file**: `src/engine/javascript/worker-types.ts` defines `JsWorkerInboundMessage` and `JsWorkerOutboundMessage`. Both `executor.ts` and `worker.ts` import from here. This resolves the three-copy contract problem
- **`/// <reference lib="webworker" />` at top of `worker.ts`**: gives the file access to `self`, `postMessage`, `MessageEvent` types without touching the project-wide tsconfig. Less intrusive than adding `"WebWorker"` to `lib` globally
- **`new Function(...)` runtime injection kept verbatim**: this is how transformed user code receives `__guard`, `__createProxy`, `__traceLine`, `__args`, `console`. Module workers do not change this — it is a runtime eval, not a module import. Keep as-is
- **Delete `build-worker-code.ts` only after Units 2 and 3 pass browser verification**: the old file should coexist with the new module for exactly one commit's worth of verification time, then be removed
- **No transformer changes**: `transformer.ts` emits `__createProxy(...)` with the same 5-arg shape the new worker consumes. The seam does not move

## Open Questions

### Resolved During Planning

- **Is `new Worker(new URL('./...', import.meta.url), { type: 'module' })` supported out of the box with `next dev --webpack` / `next build --webpack` in Next.js 16.2.3?** — Yes. No config changes required. Literal `new URL(...)` expression passed directly to `new Worker(...)` is a webpack 5 static analysis requirement (cannot assign to a variable first)
- **Where should the new worker live?** — `src/engine/javascript/worker.ts`, mirroring `src/engine/python/pyodide-worker.ts`. Consistent with `code-language-adapter.ts`'s `"javascript" | "python"` axis
- **Can pure helpers be unit-tested without spinning up a real worker?** — Yes, direct import. `formatArgs` and `cloneFrame` qualify. `deepClone` does NOT qualify — it reads from a module-scoped `WeakMap` populated by `__createProxy`. Keep it in `worker.ts`
- **Should the Python worker also be modernized?** — Not in this plan. It uses `importScripts` for CDN Pyodide loading which requires classic worker. Separate concern

### Deferred to Implementation

- **Exact name of the shared types file** — `worker-types.ts` vs `types.ts` vs `messages.ts`. Trivial call at file-creation time
- **Whether to keep `fakeConsole` as a nested object literal or split to a small factory function** — minor style choice, decide during Unit 2
- **Whether any of the minor helpers (`getPath`, `snapshotFrames`, `ownerFrameIndex`) end up pure enough to extract after translation** — only obvious once translated with explicit types. Likely stay in `worker.ts`

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### The contract that must not move

```
┌───────────────────────────────────────────────────────────────────┐
│  Transformer (src/engine/transformer.ts) — UNCHANGED              │
│                                                                   │
│  Emits calls like:                                                │
│    __traceLine(lineNumber, { varName: varValue, ... })            │
│    __createProxy(originalFunc, "funcName", [params], [ownVars],   │
│                  function captureClosure() { ... })               │
│    __guard()                                                      │
└───────────────────────────────────────────────────────────────────┘
                                │
                                │ transformed code (string)
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│  Worker (src/engine/javascript/worker.ts) — REWRITTEN AS TS       │
│                                                                   │
│  self.onmessage(e) {                                              │
│    // parse e.data as JsWorkerInboundMessage                      │
│    // initialize state: steps, callStack, closureMap, counters    │
│    // define __guard, __traceLine, __createProxy (closing over    │
│    //   the state above — same scope as today's string worker)    │
│    // new Function("__guard", "__createProxy", "__traceLine",     │
│    //              "__args", "console", transformedCode + boot)   │
│    //   .call(undefined, __guard, __createProxy, __traceLine,     │
│    //         args, fakeConsole)                                  │
│    // postMessage(JsWorkerOutboundMessage)                        │
│  }                                                                │
└───────────────────────────────────────────────────────────────────┘
                                ▲
                                │ new Worker(new URL('./javascript/worker.ts',
                                │               import.meta.url),
                                │            { type: 'module' })
                                │
┌───────────────────────────────────────────────────────────────────┐
│  Executor (src/engine/executor.ts) — REWIRED                      │
│  - Boots worker via module URL (no Blob, no ObjectURL)            │
│  - postMessage typed as JsWorkerInboundMessage                    │
│  - onmessage.data typed as JsWorkerOutboundMessage                │
└───────────────────────────────────────────────────────────────────┘
```

### State that must stay in one scope

```
worker.ts (top-level onmessage scope):
  - steps: Step[]
  - stepId: number
  - nodeIdCounter: number
  - callCount: number
  - loopCount: number
  - callStack: Frame[]
  - rootNode: TreeNode
  - closureMap: WeakMap<Function, ClosureMeta>   ← CRITICAL: single instance
  - consoleLogs: ConsoleEntry[]
  - (config: maxCalls, maxLoopIterations, maxSteps, lineOffset, originalLineCount)

All of __guard, __traceLine, __createProxy close over these.
Splitting them across files would require passing state by reference or
making state a module-level singleton of another file — the latter works
but adds indirection with no benefit.
```

## Implementation Units

- [ ] **Unit 1: Define shared message envelope types**

**Goal:** One typed home for both the inbound payload (executor → worker) and the outbound response (worker → executor), consumed by both sides.

**Requirements:** R3, R4

**Dependencies:** none

**Files:**
- Create: `src/engine/javascript/worker-types.ts`
- (No existing files modified yet — wiring happens in Units 2 and 3)

**Approach:**
- `JsWorkerInboundMessage` mirrors the 12 fields currently posted by `executor.ts:68-82`. Fields whose types already exist (`AnalysisResult`-derived) reuse those types; primitives stay primitive
- `JsWorkerOutboundMessage` is a discriminated union over `{ type: "success" }` and `{ type: "error" }`. The success variant carries `result: StepGeneratorResult`, `finalReturnValue: unknown`, `consoleLogs: Array<{ text: string; stepIdx: number }>`
- The partial types in `src/engine/types.ts:3-13` (`ExecuteSuccessResponse`, `ExecuteErrorResponse`, `ExecuteResponse`) may be kept as aliases or deleted — decide in Unit 3 when the executor is rewired

**Patterns to follow:**
- Keep the discriminated-union style already in `src/engine/types.ts`
- Reuse `StepGeneratorResult` from `@/algorithm/types`

**Test scenarios:**
- Test expectation: none — type-only module; tsc is the verification

**Verification:**
- `npx tsc --noEmit` passes
- Types are exported and can be imported from both `src/engine/executor.ts` and the (future) `src/engine/javascript/worker.ts`

---

- [ ] **Unit 2: Translate build-worker-code.ts to a real TS worker module**

**Goal:** Create `src/engine/javascript/worker.ts` as a standalone ES module worker. It must boot the same message handler, define the same three runtime globals, and execute transformed user code identically to the string template.

**Requirements:** R2, R5, R7

**Dependencies:** Unit 1

**Files:**
- Create: `src/engine/javascript/worker.ts`
- (No other files touched in this unit — `build-worker-code.ts` still exists; `executor.ts` still uses the string path)

**Approach:**
- Add `/// <reference lib="webworker" />` at the top so `self`, `MessageEvent`, `postMessage` are typed without modifying project-wide tsconfig
- Sandbox shims (`self.fetch = undefined` etc.) run at the top of the module before anything else — ES module workers still allow statement-level initialization after imports, and this module has no imports at top level (types import does not emit code). Shim sequence is identical to `build-worker-code.ts:4-8`
- `self.onmessage` handler parses `e.data` as `JsWorkerInboundMessage`
- Inside the handler, declare all shared state (`steps`, `callStack`, `closureMap`, counters, config) as `let` / `const` at function scope. This is the same scope model as the string worker
- Define `__guard`, `__traceLine`, `__createProxy` as nested functions that close over that state. Every helper (`deepClone`, `formatArgs`, `getPath`, `snapshotFrames`, `cloneFrame`, `ownerFrameIndex`) also nested. Add types at every function boundary (`Frame`, `ClosureMeta`, `TreeNode`, `Step` — some of these already exist in `@/algorithm`, some must be defined locally)
- The `new Function("__guard", "__createProxy", "__traceLine", "__args", "console", runCode)` call stays **exactly** as today. Do not try to replace it with `eval` or any other dynamic-code mechanism
- Outbound `postMessage` calls use `JsWorkerOutboundMessage`. Errors go through the same `catch(err)` in the outer `self.onmessage`
- **No semantic changes**. If tempted to "fix" something during translation (e.g. tighten a bounds check, rename a var, shorten a loop) — do not. File the temptation as a follow-up task. This unit is pure translation
- The `runCode` construction logic (`hasArgs ? transformedCode + '\n...\n' : transformedCode + '\n...\n'`) stays identical — same string, same escape sequences

**Execution note:** Translation-first — port lines in file order. Leave semantic changes for later passes. Easier to diff against the original if structure tracks 1:1.

**Technical design:** *(outline only, not code)*
```
/// <reference lib="webworker" />
import type { JsWorkerInboundMessage, JsWorkerOutboundMessage } from "./worker-types";

// sandbox shims (self.fetch = undefined, etc.)

self.onmessage = (e: MessageEvent<JsWorkerInboundMessage>) => {
  const data = e.data;
  try {
    // state: steps, stepId, nodeIdCounter, callCount, loopCount, callStack, rootNode, closureMap
    // helpers (nested): deepClone, formatArgs, getPath, snapshotFrames, cloneFrame, ownerFrameIndex
    // runtime: __guard, __traceLine, __createProxy
    // fakeConsole
    // runFn = new Function(...)
    // postMessage success
  } catch (err) {
    // postMessage error
  }
};
```

**Patterns to follow:**
- `src/engine/python/pyodide-worker.ts` as the precedent for a worker in this codebase (though that one is a string too — take the file-location convention, not the string-template pattern)
- `src/engine/types.ts` for discriminated-union response shape

**Test scenarios:**
- Test expectation: none at the unit level — worker entry files cannot be pure-unit-tested without `@vitest/web-worker` (deferred out of scope). Regression protection comes from Unit 4 manual browser testing. Type-checker is the unit-level guard
- Type safety: `npx tsc --noEmit` must pass with the new file in place

**Verification:**
- `npx tsc --noEmit` passes cleanly (no `any` leaking from worker code; postMessage/receive are typed)
- The file is self-contained and independently compilable
- Visual diff against `build-worker-code.ts` shows only (a) type annotations added, (b) template-literal escape sequences replaced with real syntax, (c) TypeScript-compatible var declarations — nothing else

---

- [ ] **Unit 3: Rewire executor.ts to boot the module worker**

**Goal:** Replace the Blob + ObjectURL worker boot with the canonical `new Worker(new URL('./javascript/worker.ts', import.meta.url), { type: 'module' })` pattern. Type the `postMessage` and `onmessage.data` sites.

**Requirements:** R1, R3, R4

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `src/engine/executor.ts`

**Approach:**
- Remove the `buildWorkerCode` import
- Replace lines 36-39 (`const blob = new Blob([buildWorkerCode()], ...)`, `URL.createObjectURL`, `new Worker(url)`, `URL.revokeObjectURL(url)`) with a single `new Worker(new URL('./javascript/worker.ts', import.meta.url), { type: 'module' })`
- **The `new URL(...)` must be inlined as a literal** directly in the `new Worker(...)` call. Webpack's static analysis cannot follow a variable. Do not factor it out "for readability"
- Type `worker.postMessage(...)` arg as `JsWorkerInboundMessage` (importable from `src/engine/javascript/worker-types.ts`)
- Type `worker.onmessage`'s `e.data` as `JsWorkerOutboundMessage`
- Keep the 5-second timeout + `worker.terminate()` + `worker.onerror` logic unchanged
- If `src/engine/types.ts:3-13`'s partial `ExecuteSuccessResponse` / `ExecuteErrorResponse` / `ExecuteResponse` are now redundant, delete them. Otherwise keep them as aliases

**Patterns to follow:**
- Keep the `new Promise<ExecuteResult>((resolve, reject) => {...})` structure unchanged — only the worker-boot line moves

**Test scenarios:**
- Integration (manual, browser): all 69 existing vitest tests still pass (they do not exercise the worker boot path — this is a sanity check that the import graph is still valid)
- Build: `pnpm build` (`next build --webpack`) succeeds and emits a separate `static/chunks/*.worker.js`
- Dev: `pnpm dev` starts; visiting `/` and clicking Example 1 (factorial) + Run produces a trace
- Dev source map: DevTools shows the worker under its own thread with `worker.ts` as the visible source

**Verification:**
- `npx tsc --noEmit` passes
- `pnpm test` passes (69/69)
- `pnpm build` succeeds without warnings about worker resolution
- Visiting the dev server, Example 1 (factorial) produces an identical step count and call tree to what it produces today (compare against a pre-refactor baseline captured before starting Unit 3)

---

- [ ] **Unit 4: Manual browser regression sweep, then delete build-worker-code.ts**

**Goal:** Verify the new module worker produces identical runtime behavior across the example matrix, then remove the old string template.

**Requirements:** R6, R7, R9

**Dependencies:** Unit 3

**Files:**
- Delete: `src/engine/build-worker-code.ts`
- (Only deletion — no other modifications)

**Approach:**
- **Before deleting**, run the manual matrix in dev (`pnpm dev`) with the new module worker active:
  1. **Recursion + call tree**: Example 1 (factorial) with `n=5` — tree nodes 5 deep, all `status: 'completed'`, console shows `120`
  2. **Curried closure + function values**: Example 2 (add/internal) — variables panel shows `fn` cards for `addTen` and `addFive` with `closure: { num: 10 }` and `closure: { num: 5 }`; `fifteen` and `alsoFifteen` both `= 15`
  3. **Loop + array mutation**: bubble sort from docs page — 1D array cells re-render with yellow-outline changes as swaps occur
  4. **Runtime error (step-limit hit)**: factorial with `n=10000` (or larger) — error envelope received, UI shows "Step limit exceeded (10000). Try smaller input." and "back to editor" button is reachable
  5. **Console output**: the curried-closure example — `console.log(fifteen)` and `console.log(alsoFifteen)` appear in the console panel at the correct step index
  6. **Timeout**: contrived infinite loop (`while(true){}`) — 5-second timeout hits, `worker.terminate()` cleans up, error UI shows the timeout message
  7. **Python path unaffected**: switch language to Python, load factorial, Run — Python worker boots normally (completely separate file, should be trivially unaffected, but verify)
- For each: confirm **step count**, **tree node count**, and **final return value** match the pre-refactor baseline captured before Unit 3
- After all pass: delete `src/engine/build-worker-code.ts`
- Final `pnpm build` to confirm the old file is not implicitly referenced anywhere

**Patterns to follow:** none — manual verification

**Test scenarios:**
- All seven manual scenarios above pass
- Build succeeds after deletion

**Verification:**
- `grep -r buildWorkerCode src/` returns zero matches
- `pnpm build` succeeds
- `pnpm test` passes (69/69)

---

- [ ] **Unit 5: Extract pure helpers and add unit tests (optional, bounded)**

**Goal:** Move the genuinely pure helpers (`formatArgs`, `cloneFrame`) into a sibling module and cover them with unit tests. This is the only unit that delivers new test coverage.

**Requirements:** R7 (preserves behavior), delivers test coverage as a secondary benefit

**Dependencies:** Unit 2 (the worker must be a TS module first)

**Files:**
- Create: `src/engine/javascript/worker-helpers.ts` (exports `formatArgs`, `cloneFrame`)
- Create: `src/engine/javascript/__tests__/worker-helpers.test.ts`
- Modify: `src/engine/javascript/worker.ts` (replace inline definitions with imports)

**Approach:**
- **Only move functions that are truly pure** — no closure over worker state. After Unit 2, the obvious candidates are `formatArgs(argsList)` and `cloneFrame(frame)`
- Do NOT move `deepClone` — it reads from `closureMap`, a module-scoped `WeakMap`. If moved, either (a) pass `closureMap` as an argument on every call (noisy), or (b) instantiate `closureMap` inside the helper file as a singleton (works technically, but then the worker's state is split across two files for no real gain). Keep `deepClone` in `worker.ts`
- Do NOT move `getPath` / `snapshotFrames` / `ownerFrameIndex` — they close over `callStack` / `rootNode` / `hasRecursion`
- Tests cover: `formatArgs` with primitives, arrays < 8 items, arrays > 8 items, 2D arrays, objects, `undefined`, `null`, mixed types; `cloneFrame` for variable independence (mutating the clone does not affect the original), preservation of `funcName` / `ownVarNames` / optional `nodeId` / `node`

**Execution note:** If during Unit 5 it becomes clear that extracting these two helpers introduces friction (import noise in `worker.ts`, type duplication, etc.), skip the extraction and close Unit 5 as "not beneficial." This unit is worth only if the tests genuinely read clean.

**Patterns to follow:**
- Test file naming matches `src/engine/__tests__/*.test.ts`
- Use vitest's `describe` + `it` + `expect`, no custom test runner

**Test scenarios:**
- Happy path, `formatArgs`: `formatArgs([1, 2, 3])` → `"1, 2, 3"`
- Edge case, `formatArgs` (array truncation): `formatArgs([[1,2,3,4,5,6,7,8,9]])` → `"[1,2,3,...(9)]"` (matches the `length > 8` branch)
- Edge case, `formatArgs` (2D array): `formatArgs([[[1,2],[3,4]]])` → `"[[...]](2x2)"`
- Edge case, `formatArgs` (`undefined` / `null`): `formatArgs([undefined, null])` → `"undefined, null"`
- Happy path, `cloneFrame`: clone has same `funcName` / `ownVarNames`; mutating `clone.variables.x = 99` does not mutate original
- Edge case, `cloneFrame` (optional `nodeId` / `node`): when present on source, present on clone; when absent, absent on clone

**Verification:**
- All new tests pass
- `src/engine/javascript/worker.ts` imports the two helpers and uses them with identical call sites
- `pnpm test` passes (71/71 after adding ~2-6 new tests — count depends on scenario granularity)

## System-Wide Impact

- **Interaction graph:** The worker boot site is isolated to `src/engine/executor.ts:36-38`. No other code path boots the JS worker. `executor.ts:5` is the only non-test importer of `buildWorkerCode`. Transformer emission (`src/engine/transformer.ts`) interacts with the worker only through the runtime-injected globals, not through imports — no impact
- **Error propagation:** Error envelope shape (`{type: "error", message}`) stays identical; `executor.ts:62-66`'s `worker.onerror` handler still catches worker-thread errors. The 5-second timeout + `worker.terminate()` stays identical
- **State lifecycle risks:** `closureMap` (WeakMap) must remain a single module-level instance inside `worker.ts`. If Unit 5 were to over-extract and put the map in a separate module, the lookup between `__createProxy` (populate) and `deepClone` (read) would target different maps. Mitigation: explicit constraint in Unit 5 approach — `deepClone` stays in `worker.ts`
- **API surface parity:** Python worker (`src/engine/python/pyodide-worker.ts`) is an independent classic worker; it shares no code with the JS worker today and none after the refactor. Its boot site in `src/engine/python/executor.ts:42-43` stays as-is. Design note: a follow-up plan could apply the same modernization there, but `importScripts` + CDN Pyodide forces classic-worker semantics that complicate the migration
- **Integration coverage:** Unit tests on extracted helpers (Unit 5) cover isolated logic. Cross-layer behavior — transformer emits → worker executes → steps arrive at viewer — remains covered only by manual browser verification. Adopting `@vitest/web-worker` for integration tests is a deferred follow-up (see Deferred to Implementation)
- **Unchanged invariants:**
  - `__createProxy(originalFunc, funcName, paramNames, ownVarNames, captureClosureFn)` — 5-arg positional contract with transformer. Unchanged
  - `__traceLine(line, varsSnapshot)` — 2-arg contract. Unchanged
  - `__guard()` — no-arg. Unchanged
  - `ENTRY_FUNC_NAME`, `TRACE_LINE`, `CREATE_PROXY`, `GUARD` constants (`src/engine/constants.ts`) — unchanged
  - `__entry__()` wrapping by analyzer — unchanged
  - `lineOffset = 1` convention — unchanged
  - `__synthetic` marker on transformer-emitted nodes — unchanged (transformer is not modified at all)
  - `correctedLine > originalLineCount` filter in `__traceLine` — unchanged
  - `status: 'idle' | 'completed' | 'backtracked'` tree node states — unchanged
  - `fakeConsole` with `stepIdx` association — unchanged

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Webpack cannot statically resolve the worker URL (e.g. because someone "refactors" it to a variable) | Explicit rule in Unit 3 approach: literal `new URL(...)` must be inlined in `new Worker(...)`. Comment in code noting the constraint |
| Translation drops or alters a subtle behavior (off-by-one, missing branch) | Unit 2 is translation-only — no "cleanup" allowed during port. Unit 4 manual matrix compares step count / tree count / final return value against a pre-refactor baseline for 7 scenarios |
| `closureMap` gets split across modules during Unit 5 extraction, silently breaking function-value visualization | Explicit constraint in Unit 5 approach: `deepClone` and `closureMap` stay in `worker.ts`. Do not export either |
| Module worker fails to boot in production build (dev works, prod does not) | Unit 3 verification requires `pnpm build` to succeed and emit a worker chunk. Unit 4 manual matrix is run against a production build too (not only dev) |
| Source map stops mapping worker errors | Accept: dev source maps work out of the box; prod source maps require `productionBrowserSourceMaps: true` — not in scope here. Worker error messages still propagate through `worker.onerror` |
| Chunk size regression | Run `pnpm analyze` before and after. If the worker chunk exceeds the 50 KB threshold in `docs/conventions/bundle-optimization.md`, treat as a follow-up — it shouldn't regress since the code is the same, just packaged differently |
| `@vitest/web-worker` not installed, so worker entry is untestable | Accepted risk. Unit 5 only tests helpers. Integration testing is manual. Adopting `@vitest/web-worker` is a tracked follow-up |
| Turbopack later replaces webpack | Pattern works on turbopack with open edges; this plan does not depend on turbopack. If later adopted, verify the `new URL(..., import.meta.url)` form behaves correctly per Next.js issues #62650 / #78784 |
| Python worker refactor later takes a different structural approach | Accepted — Python worker is classic-worker constrained by `importScripts`. No shared structure is assumed |

## Documentation / Operational Notes

- After Unit 4, `docs/architecture-walkthrough.md` §6 will reference stale line numbers in the old file path. This can be fixed in a follow-up pass when that doc is next refreshed — not a blocker
- `docs/conventions/bundle-optimization.md` CI threshold (50 KB) — run `pnpm analyze` before and after as part of Unit 3 verification
- `docs/solutions/best-practices/ast-transformer-and-worker-frame-model-2026-04-18.md` — if the refactor surfaces new learnings (e.g., a gotcha in module-worker bootstrap), append them there or create a companion solutions doc following the same frontmatter schema
- Dev-server restart: when switching branches between the module-worker version and the string-template version, restart `pnpm dev`. Hot module reload may not pick up the worker-boot change reliably
- No feature flag / rollout gate is warranted — the change is internal, the UI-visible behavior is identical, and `worker.onerror` + timeout both still catch regressions

## Sources & References

- **Origin document:** none — this plan was scoped directly in conversation
- Related code:
  - `src/engine/build-worker-code.ts` (the file being replaced)
  - `src/engine/executor.ts` (boot site to rewire)
  - `src/engine/transformer.ts` (contract source — read only, not modified)
  - `src/engine/constants.ts` (shared names)
  - `src/engine/types.ts` (existing partial envelope types)
  - `src/engine/python/pyodide-worker.ts` (parallel Python worker — out of scope but informs directory convention)
  - `src/engine/__tests__/integration.test.ts` (unaffected; stubs the runtime globals)
- Related PRs/issues: none yet
- External docs:
  - [webpack Web Workers guide](https://webpack.js.org/guides/web-workers/)
  - [Next.js 16 webpack config docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/webpack)
  - [Next.js productionBrowserSourceMaps](https://nextjs.org/docs/app/api-reference/config/next-config-js/productionBrowserSourceMaps)
  - [@vitest/web-worker](https://www.npmjs.com/package/@vitest/web-worker) (deferred)
- Institutional learnings:
  - `docs/solutions/best-practices/ast-transformer-and-worker-frame-model-2026-04-18.md`
  - `docs/architecture-walkthrough.md` §6, §16-4
  - `docs/how-it-was-built.md` §5, §6, §16-4
  - `docs/plans/2026-04-16-002-feat-python-support-plan.md` (precedent for a second worker style)
  - `docs/conventions/bundle-optimization.md`
- AGENTS.md guidance:
  - §0 "역할과 책임의 분리" — primary motivator
  - §1 prefix rule — drives `src/engine/javascript/` naming
  - §2 "외부 시스템 초기화 (Worker, Pyodide) → engine/" — confirms home
  - §4.6, §4.8 anti-patterns — informed the translation-first approach in Unit 2
