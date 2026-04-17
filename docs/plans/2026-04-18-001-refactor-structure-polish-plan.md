---
title: "refactor: Structure polish — hooks split, domain/UI separation"
type: refactor
status: completed
date: 2026-04-18
---

# refactor: Structure polish — hooks split, domain/UI separation

## Overview

현재 프로젝트 구조(2026-04-14 FSD→도메인 전환 이후)는 전반적으로 건강하지만, 시니어 리뷰 관점에서 두 가지 소규모 개선 여지가 있다. 이 플랜은 그 두 가지를 다룬다:

1. `src/shared/lib`가 순수 유틸과 React 훅을 섞어 담고 있어, 훅을 `src/shared/hooks`로 분리한다.
2. `src/algorithm`이 도메인(`types`, `registry`, `presets/`)과 UI(`AlgorithmCard`)를 한 평면에 두고 있어, UI를 `algorithm/ui/` 서브폴더로 내려 계층 의도를 드러낸다.

공개 import 경로(`@/algorithm`, `@/shared/lib` 등)의 barrel은 유지하여 외부 호출부의 깨짐을 0으로 만드는 것이 목표.

## Problem Frame

**현재 상태 (2026-04-18 기준):**

```
src/
├── algorithm/
│   ├── AlgorithmCard.tsx          # UI
│   ├── algorithm-card.css.ts      # UI
│   ├── registry.ts                # domain
│   ├── types.ts                   # domain
│   ├── presets/                   # domain
│   └── index.ts                   # barrel
├── shared/
│   └── lib/
│       ├── __tests__/
│       ├── analytics/
│       ├── embed-url.ts           # pure util
│       ├── normalize-code.ts      # pure util
│       ├── shiki.ts               # pure util
│       ├── tree-layout.ts         # pure util
│       ├── usePannable.ts         # React hook ← 이질적
│       └── validate.ts            # pure util
```

**문제:**
- `shared/lib`에 React 훅 하나(`usePannable`)가 순수 유틸들과 섞여 있어, 다음 훅이 추가될 때 어디 둘지 결정이 모호해진다. 지금 선제적으로 경계를 그어두면 의사결정 비용이 사라진다.
- `src/algorithm`은 도메인 레이어(`types`, `registry`, `presets/`)와 프레젠테이션 레이어(`AlgorithmCard`)가 같은 depth에 있다. 앞선 refactor(2026-04-14)가 "each folder = one domain, depth 1"을 명시했는데, `algorithm`만 이 원칙 안에서 두 역할을 겸하고 있다. 내부 서브폴더(`algorithm/ui/`) 한 단계로 의도를 드러내면 일관성이 회복된다.

**의도적으로 범위 외로 두는 항목:** `src/player`, `src/editor`의 얇음(1~2 파일)은 그 자체로 문제가 아니다. 앞선 플랜이 "도메인 경계 = 얇아도 독립"을 의식적으로 선택했고, 이를 뒤집으면 이전 의사결정과 충돌한다. 테스트 커버리지 확장도 별도 관심사라 다른 플랜에 분리한다.

## Requirements Trace

- R1. `src/shared/lib`에서 React 훅은 `src/shared/hooks`로 이동되어야 한다.
- R2. `src/algorithm`의 UI 컴포넌트는 `src/algorithm/ui/`로 내려 도메인 파일과 분리되어야 한다.
- R3. 외부 호출부(`@/algorithm`, `@/shared/lib` 등의 import 경로)는 기존과 동일하게 동작해야 한다 (barrel re-export로 유지).
- R4. 변경 후에도 전체 타입 체크·빌드·테스트·린트가 통과해야 한다.

## Scope Boundaries

**In scope:**
- `src/shared/lib/usePannable.ts` → `src/shared/hooks/usePannable.ts` 이동
- `src/algorithm/AlgorithmCard.tsx`, `src/algorithm/algorithm-card.css.ts` → `src/algorithm/ui/` 이동
- barrel(`src/algorithm/index.ts`, 필요 시 `src/shared/lib/index.ts`) 업데이트
- 영향 받는 import 경로 수정

**Out of scope:**
- `src/player`, `src/editor` 통합 여부 (이전 refactor 결정 존중)
- 테스트 커버리지 확장 (별도 플랜)
- `src/shared/styles` → `src/shared/ui/styles` 같은 styles 재배치 (현재 사용에 문제 없음)
- `src/algorithm/presets/` 내부 구조 변경

## Context & Research

### Relevant Code and Patterns

- `src/shared/lib/usePannable.ts` — `use` prefix + React 훅 (이동 대상)
- `src/shared/lib/__tests__/validate.test.ts` — 같은 레벨의 테스트 배치 패턴. 훅 이동 시 동일 패턴 적용
- `src/algorithm/index.ts` — 현재 domain 타입 + `AlgorithmCard`를 한 barrel에서 re-export. UI 이동 후에도 barrel 시그니처 유지 필요
- `src/app/[locale]/(main)/algorithms/page.tsx` — `AlgorithmCard`의 유일한 외부 소비자. `@/algorithm` barrel을 통해 import
- `src/visualizer/tree-view/TreeView.tsx` — `usePannable`의 유일한 소비자
- `tsconfig.json`의 path alias `@/* → ./src/*` — 이동 후 import 경로가 계속 짧게 유지됨

### Institutional Learnings

- `docs/plans/2026-04-14-002-refactor-domain-structure-plan.md` (completed) — 현재 도메인 중심 평탄 구조를 확립. 본 플랜은 그 원칙을 뒤집지 않고 내부 층을 명료화

### External References

External research 생략. 이동 범위가 작고 로컬 패턴(barrel, co-location, kebab-case css)이 확립되어 있음.

## Key Technical Decisions

- **Barrel 보존 원칙**: `@/algorithm`, `@/shared/lib`의 공개 시그니처를 바꾸지 않는다. UI와 hook을 이동해도 barrel에서 re-export하여 외부 import 수정 건수를 최소화.
  - 단, `@/shared/lib`가 기존에 `usePannable`을 직접 re-export하지 않았다면(import가 `@/shared/lib/usePannable` 식 서브경로였을 경우), 새 경로 `@/shared/hooks`로 명시 이전한다. 이 경우 소비자 쪽 import 1곳(`src/visualizer/tree-view/TreeView.tsx`)만 수정.
- **`shared/hooks` 디렉터리 신규 생성**: 당장은 훅 1개지만, "hooks는 여기" 라는 팀 규약을 구조로 못 박는다. 향후 훅이 늘어날 때 판단 비용이 사라진다.
- **`algorithm/ui/` 서브폴더**: UI 파일이 2개(컴포넌트 + CSS)뿐이지만, 도메인 파일과 섞지 않겠다는 의도를 폴더명으로 드러낸다. `presets/`가 이미 서브폴더로 존재해 서브폴더 사용에 구조적 전례가 있다.
- **한 PR 단위로 묶어도 안전**: 이동 3건은 독립적이고 import 경로 변경이 국소적이라 하나의 refactor PR로 처리 가능. 리뷰어 부담을 줄이기 위해 커밋은 분리.

## Open Questions

### Resolved During Planning

- Q. `algorithm/ui/`로 내린 뒤 barrel이 여전히 `AlgorithmCard`를 re-export해야 하는가? → Yes. 외부 소비자는 `@/algorithm`만 바라보게 유지하여 blast radius를 최소화.
- Q. `shared/hooks`에 index.ts(barrel)을 둘 것인가? → No, 처음에는 두지 않는다. 훅이 1개뿐일 때 barrel은 오히려 over-engineering. 훅이 3개 이상이 되면 그때 추가.
- Q. `usePannable`이 현재 `@/shared/lib` barrel을 통해 export되고 있는가? → 실제 import가 어떤 경로를 쓰는지 Unit 1 수행 시 grep으로 확인. barrel 경유면 barrel도 제거.

### Deferred to Implementation

- 정확한 import 수정 목록: 이동 대상 파일을 실제로 옮긴 뒤 TypeScript 컴파일 에러를 따라가며 수정.
- `.css.ts` co-location 규약에 따라 `algorithm-card.css.ts`가 `AlgorithmCard.tsx`와 같은 폴더로 함께 이동하는 것은 자명. 별도 검토 불필요.

## Implementation Units

- [x] **Unit 1: Extract `usePannable` to `src/shared/hooks/`**

**Goal:** React 훅을 `shared/lib`의 순수 유틸들로부터 분리해 `src/shared/hooks/usePannable.ts`로 이동한다. 향후 훅 추가 시 배치 판단 비용을 제거.

**Requirements:** R1, R3, R4

**Dependencies:** None

**Files:**
- Create: `src/shared/hooks/usePannable.ts` (이동된 내용)
- Delete: `src/shared/lib/usePannable.ts`
- Modify: `src/visualizer/tree-view/TreeView.tsx` (import 경로 변경)
- Modify (if exists): `src/shared/lib/index.ts` 또는 barrel — `usePannable` re-export 라인 제거. barrel 경유 import가 있었는지 먼저 확인.

**Approach:**
1. `grep -r "usePannable" src/`로 모든 import 경로 확인.
2. 파일을 새 위치로 이동(내용 변경 없음).
3. 호출부(`TreeView.tsx`) import를 `@/shared/hooks/usePannable`로 갱신.
4. `shared/lib`에서 re-export가 있었다면 제거.
5. `tsc --noEmit`으로 깨진 import가 없는지 확인.

**Patterns to follow:**
- 파일 구조: `src/shared/lib/validate.ts`가 파일 하나로 서비스되는 방식과 동일하게 `usePannable.ts` 단독 파일로 배치.
- 네이밍: `use` prefix camelCase 그대로 유지.

**Test scenarios:**
- Happy path: `pnpm typecheck`(또는 `tsc --noEmit`)가 0 에러로 통과 → 이동 후에도 타입 그래프가 완전함을 확인.
- Happy path: `TreeView`가 사용되는 페이지(`/visualize/[algorithm]`)에서 트리 패닝이 기존과 동일하게 동작 → 드래그 시 pan transform 적용, 마우스 업 시 정지.
- Edge case: `grep -r "from \"@/shared/lib/usePannable\"" src/` 결과가 0건 → 잔재 import 없음.

**Verification:**
- `src/shared/lib/usePannable.ts`가 존재하지 않는다.
- `src/shared/hooks/usePannable.ts`가 존재하고 원본과 동일한 시그니처·동작을 제공한다.
- 타입 체크·린트·테스트·빌드 모두 통과.

---

- [x] **Unit 2: Separate domain from UI in `src/algorithm`**

**Goal:** `AlgorithmCard`와 그 CSS를 `src/algorithm/ui/` 하위로 이동해, `src/algorithm` 루트는 도메인 파일(`types`, `registry`, `presets/`)만 남기고 레이어 분리를 구조로 드러낸다. 외부 import 경로(`@/algorithm`)는 barrel을 통해 변경 없이 유지.

**Requirements:** R2, R3, R4

**Dependencies:** None (Unit 1과 독립적)

**Files:**
- Create: `src/algorithm/ui/AlgorithmCard.tsx` (이동)
- Create: `src/algorithm/ui/algorithm-card.css.ts` (이동)
- Delete: `src/algorithm/AlgorithmCard.tsx`
- Delete: `src/algorithm/algorithm-card.css.ts`
- Modify: `src/algorithm/index.ts` (re-export 경로를 `./ui/AlgorithmCard`로 갱신)

**Approach:**
1. 두 파일을 `src/algorithm/ui/`로 이동. 내용 변경 없음.
2. 이동 후 `AlgorithmCard.tsx` 내부에서 `./algorithm-card.css.ts`를 상대 경로로 참조하고 있었다면 그대로 작동(같은 폴더로 함께 이동하므로 상대 경로 유효).
3. `src/algorithm/index.ts`의 `export { AlgorithmCard } from "./AlgorithmCard"` → `"./ui/AlgorithmCard"`로 수정.
4. 외부 소비자(`src/app/[locale]/(main)/algorithms/page.tsx` 등)는 `@/algorithm`을 계속 사용하므로 수정 불필요. `grep -r "@/algorithm/AlgorithmCard" src/`로 서브경로 직접 import가 없는지 확인하고, 있다면 barrel 경유로 교체하거나 새 경로로 갱신.

**Patterns to follow:**
- 서브폴더 분리 패턴: 기존 `src/algorithm/presets/`가 도메인 데이터를 서브폴더로 나눠 둔 전례와 동일하게 `ui/` 도입.
- CSS co-location: `.tsx`와 `.css.ts`를 같은 폴더에 유지하는 기존 규약 준수.

**Test scenarios:**
- Happy path: `pnpm typecheck`가 0 에러로 통과.
- Happy path: `/[locale]/algorithms` 페이지 렌더링 시 `AlgorithmCard` 목록이 기존과 동일하게 출력(카테고리별 카드, 난이도 배지, 클릭 이동).
- Edge case: barrel(`@/algorithm`) 경유 import 시 `AlgorithmCard`와 도메인 타입이 함께 정상 해석 → 리그레션 없음.
- Edge case: `grep -rn "from \"@/algorithm/AlgorithmCard\"" src/` 결과가 0건 → 서브경로 직접 import 잔재 없음.

**Verification:**
- `src/algorithm/AlgorithmCard.tsx`, `src/algorithm/algorithm-card.css.ts`가 존재하지 않는다.
- `src/algorithm/ui/AlgorithmCard.tsx`, `src/algorithm/ui/algorithm-card.css.ts`가 존재한다.
- `src/algorithm/` 루트에는 `index.ts`, `registry.ts`, `types.ts`, `presets/`, `ui/`만 남는다.
- 타입 체크·린트·테스트·빌드 모두 통과.
- 카드 목록 UI·레이아웃·인터랙션이 변경 전과 시각적으로 동일(스크린샷 비교 또는 육안 확인).

---

- [x] **Unit 3: Verification pass — full build, tests, lint, manual smoke**

**Goal:** 두 이동이 합쳐져 빌드/런타임을 깨지 않았음을 최종 확인.

**Requirements:** R4

**Dependencies:** Unit 1, Unit 2

**Files:**
- (변경 없음 — 검증만 수행)

**Approach:**
- 타입 체크, 빌드, 테스트, 린트를 프로젝트 표준 스크립트로 실행.
- 주요 페이지를 브라우저에서 수동 확인: `/[locale]/algorithms`(카드 목록), `/[locale]/visualize/[algorithm]`(트리 패닝).

**Test scenarios:**
- Test expectation: none -- 검증 전용 유닛. 새 테스트를 추가하지 않고 기존 테스트·타입 체크·빌드·런타임 동작만으로 확인.

**Verification:**
- `pnpm typecheck` / `pnpm build` / `pnpm test` / `pnpm lint`가 모두 통과(프로젝트에서 실제 쓰이는 스크립트명 기준).
- `/[locale]/algorithms` 페이지가 정상 렌더되고 카드 클릭으로 비주얼라이저 이동이 동작.
- `/[locale]/visualize/[algorithm]`에서 트리 드래그 패닝이 Unit 1 이전과 동일하게 동작.

## System-Wide Impact

- **Interaction graph:** barrel(`@/algorithm`, `@/shared/lib`)이 외부 소비자의 안정 경계 역할. 이동은 barrel 내부에서 소화되므로 외부 호출 그래프는 변하지 않는다.
- **Error propagation:** 해당 없음 — 순수 파일 이동, 에러 핸들링 코드 미변경.
- **State lifecycle risks:** 없음 — 런타임 로직 변경 없음.
- **API surface parity:** 공개 import 경로 유지(R3). `@/algorithm`과 `@/shared/lib` 시그니처는 변함 없음. `@/shared/hooks`가 신규 공개 경로로 추가됨.
- **Integration coverage:** 기존 `engine/__tests__`, `shared/lib/__tests__`가 계속 통과해야 함. 유닛 3의 빌드/런타임 스모크가 통합 검증 역할.
- **Unchanged invariants:** `src/player`, `src/editor`, `src/engine`, `src/visualizer`, `src/app`, `src/i18n`, `src/middleware.ts`의 구조·동작은 변경되지 않는다. `src/algorithm/presets/` 내부도 손대지 않는다.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 서브경로 직접 import(`@/algorithm/AlgorithmCard`, `@/shared/lib/usePannable`)가 있어 이동 후 깨질 수 있음 | 각 유닛에서 `grep`으로 서브경로 import를 먼저 훑고, 있으면 barrel 경유 또는 새 경로로 교체. TypeScript 컴파일 에러가 자동으로 잔재를 드러냄 |
| vanilla-extract `.css.ts`가 번들러 관점에서 경로 해석 실패 | `.css.ts`는 `.tsx`와 항상 같은 폴더로 함께 이동하므로 상대 경로 안정. 기존 co-location 규약 준수 |
| 이전 refactor 플랜의 "depth 1" 원칙과 `algorithm/ui/` 서브폴더 도입 간 긴장 | `presets/` 서브폴더 전례가 이미 존재. depth 1은 "도메인 경계"에 적용되며 도메인 *내부* 레이어 분리에는 적용되지 않음을 문서에 명시 |
| 얇은 도메인(`player`, `editor`) 통합 논의가 리뷰 중 튀어나와 PR이 부풀 수 있음 | Scope Boundaries에 명시적 out-of-scope로 기록하여 리뷰 범위를 좁힘 |

## Documentation / Operational Notes

- `CONTRIBUTING.md`에 폴더 규약 문서가 있다면 `src/shared/hooks/`와 `src/algorithm/ui/` 등장을 반영. (이 플랜 실행 시 확인)
- 배포·마이그레이션·롤백 이슈 없음 — 번들 결과물이 달라지지 않음(코드 자체는 동일).
- 외부 소비자 커뮤니케이션 불필요 — 공개 import 경로 유지.

## Sources & References

- Related plan: [docs/plans/2026-04-14-002-refactor-domain-structure-plan.md](../plans/2026-04-14-002-refactor-domain-structure-plan.md) — 현재 도메인 중심 구조 확립 배경
- Related code: `src/algorithm/index.ts`, `src/shared/lib/usePannable.ts`, `src/visualizer/tree-view/TreeView.tsx`, `src/app/[locale]/(main)/algorithms/page.tsx`
- Path alias: `tsconfig.json` `paths: { "@/*": ["./src/*"] }`
