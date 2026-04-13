# Recursive

[English](./README.md) | 한국어

**코드의 실행 흐름을, 한 줄씩 따라가세요.**

JavaScript / TypeScript 코드를 붙여넣으면 실행 흐름을 단계별로 보여줍니다. 재귀 함수는 호출 트리까지 시각화합니다.

[사용해보기 →](https://recursive-visualizer.vercel.app)

## 기능

- **라인별 실행 추적** — 실행 중인 코드 라인이 하이라이트됩니다
- **변수 추적** — 매 단계마다 변수 상태를 확인하고, 변경된 값은 강조됩니다
- **호출 트리** — 재귀 함수의 호출 구조를 트리로 시각화합니다
- **콘솔 출력** — `console.log` 결과가 스텝별로 나타납니다
- **TypeScript 지원** — 타입은 자동으로 제거됩니다
- **설정 없이 바로 사용** — 코드 붙여넣고, 인자 입력하고, 실행

## 사용 방법

1. [플레이그라운드](https://recursive-visualizer.vercel.app/visualize/custom)에 접속합니다
2. 코드를 붙여넣습니다 (함수 또는 일반 코드 모두 가능)
3. 함수에 인자가 필요하면 입력합니다
4. **▶ 실행**을 클릭합니다
5. 컨트롤로 한 단계씩 이동하거나 재생합니다

홈 페이지에서 순열, 조합, 부분집합 프리셋도 사용할 수 있습니다.

## 기술 스택

Next.js · TypeScript · Vanilla-Extract · acorn · Shiki · d3-hierarchy · CodeMirror · Web Workers

## 개발

```bash
pnpm install
pnpm dev
pnpm test
pnpm fix          # oxlint + oxfmt
```

## 기여

버그 제보 및 기능 건의 → [GitHub Issues](https://github.com/oilater/recursive/issues)

## 라이선스

MIT
