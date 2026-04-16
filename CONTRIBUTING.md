# Contributing

Recursive에 관심 가져주셔서 감사합니다! 버그 제보, 기능 제안, PR 모두 환영해요.

## Issues

- **버그 제보** — 어떤 코드를 넣었을 때, 어떤 결과가 나왔는지 알려주세요. 스크린샷이나 코드 예시가 있으면 더 좋아요.
- **기능 제안** — 이런 게 있으면 좋겠다 싶은 거 편하게 올려주세요.
- **질문** — 사용법이나 구조가 궁금하면 이슈로 물어봐도 돼요.

[GitHub Issues →](https://github.com/oilater/recursive/issues)

## 로컬 개발 환경

```bash
git clone https://github.com/oilater/recursive.git
cd recursive
pnpm install
pnpm dev
```

테스트와 린트:

```bash
pnpm test
pnpm fix          # oxlint + oxfmt
```

## PR 올리기

1. `main`에서 브랜치를 따세요
2. 변경사항을 커밋하고 푸시하세요
3. PR을 열어주세요 — 무엇을 왜 바꿨는지 간단히 적어주세요

작은 수정이라도 괜찮아요. 오타 수정, 번역 개선, UI 개선 다 좋습니다.

## 프리셋 알고리즘 추가하기

새로운 알고리즘 프리셋을 추가하고 싶다면:

1. `src/algorithm/presets/codes/`에 `.js` 파일 추가
2. `src/algorithm/presets/`의 카테고리 파일(`sorting.ts`, `recursion.ts`)에 등록

```ts
{
  id: "your-algorithm",
  name: "알고리즘 이름",
  description: "한 줄 설명",
  difficulty: "easy" | "medium" | "hard",
  category: "sorting" | "recursion",
  defaultArgs: [[1, 2, 3]],
  code: loadCode("your-algorithm.js"),
}
```

3. `messages/ko.json`과 `messages/en.json`에 번역 추가

## 코드 컨벤션

- 스타일링은 Vanilla Extract (`.css.ts`) — 인라인 스타일 쓰지 않기
- 다국어 텍스트는 `messages/ko.json`, `messages/en.json`에 번역 키로 관리
- 커밋 메시지는 `feat:`, `fix:`, `docs:` 등 conventional commit 형식

## License

기여해주신 코드는 MIT 라이선스로 포함됩니다.
