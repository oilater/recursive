# Recursive

[한국어](./README.ko.md) | English

**Track your algorithms, line by line.**

Recursive is a browser-based algorithm visualizer that lets you paste any JavaScript or TypeScript code and watch it execute step by step — with line highlighting, variable tracking, and call tree visualization for recursive functions.

[Try it out →](https://recursive-visualizer.vercel.app)

## Features

### Playground
Paste any JS/TS code and hit run. Recursive automatically detects functions, parameters, and execution flow.

- **Line-by-line tracking** — Every statement is highlighted as it executes
- **Variable snapshots** — See how variables change at each step, with change highlighting
- **Console capture** — `console.log` output appears step by step
- **TypeScript support** — Types are stripped automatically via sucrase

### Recursive function support
When your code contains recursion, Recursive builds a **call tree** in real time.

- **Call tree visualization** — SVG tree with dynamic node sizing via d3-hierarchy
- **Call stack panel** — See the current recursion depth and stack frames
- **Works with nested recursion** — e.g. `function solve() { function dfs() { ... dfs() ... } }`

### Preset algorithms
Built-in presets for common algorithms with default arguments:

- **Permutations** — nPr with backtracking
- **Combinations** — nCr with DFS
- **Subsets** — Power set generation

Each preset runs through the same pipeline as custom code — no separate implementation.

## How it works

```
User code
  ↓
[1] Strip TypeScript types (sucrase)
  ↓
[2] Parse AST (acorn) → detect functions, recursion, local variables
  ↓
[3] Transform AST (astring)
    - Insert __traceLine(line, __captureVars()) before each statement
    - Insert __createProxy(func) after recursive function declarations
    - Insert __guard() in loops (infinite loop protection)
  ↓
[4] Execute in Web Worker (sandboxed)
    - __traceLine → creates Step with line number + variable snapshot
    - Proxy apply trap → builds TreeNode call tree
    - console.log → captured per step
  ↓
[5] Returns { steps: Step[], tree: TreeNode }
  ↓
[6] Visualization
    - CodePanel: Shiki syntax highlighting + active line highlight
    - TreeView: d3-hierarchy layout + SVG rendering
    - VariablePanel: variable state with change detection
    - StepperControls: play/pause/step/speed
    - CallStack: current recursion depth
    - ResultPanel: collected results + console output
```

### Single pipeline
Presets and custom code use the exact same execution pipeline (`executeCustomCode`). A preset is just `{ code, defaultArgs }` — no separate step generators.

### Safety
- Web Worker isolation (no DOM access)
- `fetch`, `XMLHttpRequest`, `importScripts` removed
- 5s timeout, 5000 call limit, 100k loop iteration limit

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Vanilla-Extract** — zero-runtime CSS-in-TS
- **d3-hierarchy** — tree layout calculation
- **Shiki** — syntax highlighting
- **acorn** + **astring** — AST parsing and code generation
- **sucrase** — TypeScript type stripping
- **CodeMirror 6** — code editor
- **es-toolkit** — utility functions
- **Vitest** — testing

## Project structure

Domain-centric flat structure — each folder is a self-contained domain.

```
src/
├── app/              # Pages (Next.js routing)
├── engine/           # Code tracing engine (analyzer, transformer, executor, worker)
├── algorithm/        # Preset definitions, types, registry, card UI
├── visualizer/       # Visualization components (TreeView, CodePanel, Stepper, etc.)
├── editor/           # Code input (CodeMirror editor, argument form)
├── player/           # Playback hook (useAlgorithmPlayer)
└── shared/           # Styles, UI primitives, utilities
```

## Development

```bash
pnpm install
pnpm dev          # dev server
pnpm build        # production build
pnpm test         # vitest
pnpm fix          # oxlint + oxfmt
pnpm analyze      # bundle analyzer
```

## Contributing

Bug reports and feature requests → [GitHub Issues](https://github.com/oilater/recursive/issues)
