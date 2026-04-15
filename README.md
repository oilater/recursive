# Recursive

[한국어](./README.ko.md) | English

**Track your algorithms, line by line.**

Paste any JavaScript or TypeScript code and watch it execute step by step — with line highlighting, variable tracking, and call tree visualization.

[![Try it out](https://img.shields.io/badge/Try%20it%20out-recursive--ochre.vercel.app-38bdf8?style=for-the-badge&logo=vercel&logoColor=white)](https://recursive-ochre.vercel.app)

## Features

- **Line-by-line execution** — See which line is running at each step
- **Variable tracking** — Watch variables change in real time, with diff highlighting
- **Call tree** — Recursive functions are visualized as an interactive tree
- **Console output** — `console.log` output appears step by step
- **TypeScript support** — Types are stripped automatically
- **No setup needed** — Paste code, enter arguments, hit run

## Usage

1. Go to the [playground](https://recursive-ochre.vercel.app/visualize/custom)
2. Paste your code (function or bare code — both work)
3. Enter arguments if your function needs them
4. Click **▶ Run**
5. Step through with the controls or hit play

Preset algorithms (permutations, combinations, subsets, bubble sort) are also available from the home page, organized by category.

## Adding a preset algorithm

1. Add a `.js` file to `src/algorithm/presets/codes/`
2. Register the metadata in the matching category file (`recursion.ts`, `sorting.ts`):

```ts
{
  id: "selection-sort",
  name: "선택 정렬 (Selection Sort)",
  description: "가장 작은 원소를 찾아 앞으로 보냅니다",
  difficulty: "easy",
  category: "sorting",
  defaultArgs: [[5, 3, 8, 1, 2]],
  code: loadCode("selection-sort.js"),
}
```

## Project structure

```
src/
├── algorithm/        # Preset definitions & registry
│   └── presets/
│       └── codes/    # Algorithm source files (.js)
├── engine/           # AST analysis, transformation, Worker execution
├── editor/           # CodeMirror editor, ArgumentForm
├── player/           # Step playback (useAlgorithmPlayer)
├── visualizer/       # TreeView, CodePanel, CallStack, VariablePanel
├── shared/           # Theme, utils, common UI
└── app/              # Next.js routes
```

## Tech stack

Next.js · TypeScript · Vanilla-Extract · acorn · Shiki · d3-hierarchy · CodeMirror · Web Workers

## Development

```bash
pnpm install
pnpm dev
pnpm test
pnpm fix          # oxlint + oxfmt
```

## Contributing

Bug reports and feature requests → [GitHub Issues](https://github.com/oilater/recursive/issues)

## License

MIT
