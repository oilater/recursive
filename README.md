# Recursive

[한국어](./README.ko.md) | English

**Track your algorithms, line by line.**

Paste any JavaScript or TypeScript code and watch it execute step by step — with line highlighting, variable tracking, and call tree visualization.

[Try it out →](https://recursive-visualizer.vercel.app)

## Features

- **Line-by-line execution** — See which line is running at each step
- **Variable tracking** — Watch variables change in real time, with diff highlighting
- **Call tree** — Recursive functions are visualized as an interactive tree
- **Console output** — `console.log` output appears step by step
- **TypeScript support** — Types are stripped automatically
- **No setup needed** — Paste code, enter arguments, hit run

## Usage

1. Go to the [playground](https://recursive-visualizer.vercel.app/visualize/custom)
2. Paste your code (function or bare code — both work)
3. Enter arguments if your function needs them
4. Click **▶ Run**
5. Step through with the controls or hit play

Preset algorithms (permutations, combinations, subsets) are also available from the home page.

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
