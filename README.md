# Recursive

[한국어](./README.ko.md) | English

<img width="2400" height="1260" alt="og" src="https://github.com/user-attachments/assets/074c2b71-d776-4811-a012-d439209717fd" />

Paste your code and watch it execute step by step — with line highlighting, variable tracking, and call tree visualization.

[![Try it out](https://img.shields.io/badge/Try%20it%20out-recursive--ochre.vercel.app-38bdf8?style=for-the-badge&logo=vercel&logoColor=white)](https://recursive.oilater.com)

## Supported Languages

- Python
- JavaScript / TypeScript

## Features

- Paste your code and input fields are automatically generated
- Recursive functions are visualized as a tree structure
- Debug comfortably without setting breakpoints
- Current execution line is highlighted with manual/auto playback
- Works with a single function or plain code

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
  name: "Selection Sort",
  description: "Finds the smallest element and moves it to the front",
  difficulty: "easy",
  category: "sorting",
  defaultArgs: [[5, 3, 8, 1, 2]],
  code: loadCode("selection-sort.js"),
}
```


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
