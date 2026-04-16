# Contributing

Thanks for your interest in Recursive! Bug reports, feature requests, and PRs are all welcome.

## Issues

- **Bug reports** — Tell us what code you entered and what happened. Screenshots or code examples are helpful.
- **Feature requests** — Got an idea? Feel free to open an issue.
- **Questions** — Curious about usage or architecture? Issues work for that too.

[GitHub Issues →](https://github.com/oilater/recursive/issues)

## Local Development

```bash
git clone https://github.com/oilater/recursive.git
cd recursive
pnpm install
pnpm dev
```

Test and lint:

```bash
pnpm test
pnpm fix          # oxlint + oxfmt
```

## Pull Requests

1. Create a branch from `main`
2. Commit and push your changes
3. Open a PR — briefly describe what you changed and why

Small fixes are totally fine. Typo fixes, translation improvements, UI tweaks — all welcome.

## Adding a Preset Algorithm

1. Add a `.js` file to `src/algorithm/presets/codes/`
2. Register the metadata in the matching category file (`sorting.ts`, `recursion.ts`):

```ts
{
  id: "your-algorithm",
  name: "Algorithm Name",
  description: "One-line description",
  difficulty: "easy" | "medium" | "hard",
  category: "sorting" | "recursion",
  defaultArgs: [[1, 2, 3]],
  code: loadCode("your-algorithm.js"),
}
```

3. Add translations to `messages/ko.json` and `messages/en.json`

## Code Conventions

- Styling with Vanilla Extract (`.css.ts`) — no inline styles
- All user-facing text goes in `messages/ko.json` and `messages/en.json`
- Commit messages follow conventional commit format (`feat:`, `fix:`, `docs:`, etc.)

## License

Contributions are released under the MIT License.
