---
title: "feat: Embeddable code visualizer widget"
type: feat
status: active
date: 2026-04-16
---

# feat: Embeddable code visualizer widget

## Overview

블로그(Obsidian Publish 등)나 교육 콘텐츠에 iframe으로 삽입할 수 있는 코드 시각화 위젯을 만든다. URL 파라미터로 코드와 인자를 받아, 헤더/푸터 없이 시각화만 보여주는 경량 페이지.

## Problem Frame

현재 시각화를 공유하려면 사이트 URL을 직접 방문해야 한다. 블로그 글이나 강의 자료에 코드 실행 흐름을 인라인으로 보여줄 수 없다. embed 페이지가 있으면 기술 블로거, 교육자가 자신의 콘텐츠에 인터랙티브 시각화를 삽입할 수 있고, 이는 서비스 노출과 향후 유료화(watermark 제거, 커스텀 테마)의 기반이 된다.

## Requirements Trace

- R1. `/embed` 라우트로 접근하면 헤더/푸터 없이 시각화만 표시
- R2. URL 쿼리 파라미터로 코드와 인자를 전달 (`?code=...&args=...`)
- R3. 프리셋 알고리즘도 id로 로드 가능 (`?preset=bubble-sort`)
- R4. 사용자가 step 이동, 재생/일시정지, 속도 조절 가능
- R5. 코드 수정은 불가 (읽기 전용)
- R6. iframe에서 정상 동작 (CORS, CSP 이슈 없음)
- R7. 다국어 지원 (기존 next-intl 구조 활용)
- R8. "Powered by Recursive" 링크 표시 (향후 유료 시 제거 옵션)

## Scope Boundaries

- 코드 편집 기능 없음 (읽기 전용 시각화만)
- 유료 기능(watermark 제거, 커스텀 테마)은 이 플랜 범위 밖
- embed 전용 API 엔드포인트 불필요 (클라이언트에서 직접 실행)
- 인자 수정 UI 없음 (URL로 전달된 인자 고정)

## Context & Research

### Relevant Code and Patterns

- `src/app/[locale]/visualize/playground/PlaygroundViewer.tsx` — 시각화 뷰어 컴포넌트. `result`, `codeHtml`, `hasRecursion` 등을 props로 받음
- `src/engine/executor.ts` — `executeCustomCode(code, args)` 하나로 실행 가능
- `src/shared/lib/shiki.ts` — `highlightCode(code)` 로 HTML 생성
- `src/app/[locale]/(main)/layout.tsx` — route group으로 Footer 조건부 표시 패턴
- `src/algorithm/presets/` — preset id로 코드/인자 로드 가능

### Institutional Learnings

- `docs/solutions/codepanel-first-render-highlight-2026-04-15.md` — CodePanel은 `React.memo`로 감싸야 하이라이트 유지. embed에서도 동일하게 적용 필요
- 시각화 뷰어를 별도 컴포넌트로 분리한 패턴이 이미 있음 (PlaygroundViewer, PresetViewer)

## Key Technical Decisions

- **기존 PlaygroundViewer 재사용**: embed 전용 뷰어를 새로 만들지 않고, PlaygroundViewer와 동일한 props 구조 사용. 코드 중복 방지
- **클라이언트 실행**: 서버 API 없이 브라우저에서 직접 코드 실행. 기존 Web Worker 파이프라인 그대로 사용
- **URL 파라미터**: code는 URL-safe base64 인코딩, args는 JSON. preset은 id 문자열
- **route group 패턴**: `embed/` 라우트는 `(main)` 밖에 두어 Header/Footer 자동 제외
- **X-Frame-Options**: Vercel 기본 설정이 iframe을 허용하므로 별도 설정 불필요

## Open Questions

### Resolved During Planning

- **코드 전달 방식**: URL 쿼리 파라미터 사용. code가 길 때 URL 길이 제한(~2000자)이 있지만, 대부분 알고리즘 코드는 이 안에 들어옴. preset id 방식으로도 전달 가능
- **다국어**: embed URL에 locale prefix 적용 (`/en/embed?...`). 기존 middleware가 처리

### Deferred to Implementation

- embed 페이지의 정확한 padding/margin 값
- base64 인코딩 시 특수문자 처리 edge case

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification.*

```
사용자 블로그:
<iframe src="https://recursive-ochre.vercel.app/embed?code=base64...&args=[5,3,8]" />

embed 페이지 흐름:
1. URL 파라미터 파싱 (code + args 또는 preset id)
2. executeCustomCode(code, args) → result
3. highlightCode(code) → codeHtml
4. EmbedViewer 렌더 (PlaygroundViewer 기반, 읽기 전용)
   ├── CodePanel (하이라이트)
   ├── VariablePanel
   ├── CallStack (재귀 시)
   ├── TreeView (재귀 시)
   ├── StepperControls
   └── "Powered by Recursive" 링크
```

## Implementation Units

- [ ] **Unit 1: embed 라우트 및 페이지**

  **Goal:** `/embed` 라우트를 만들고, URL 파라미터에서 코드/인자를 파싱하여 시각화를 렌더링

  **Requirements:** R1, R2, R3, R4, R5, R7

  **Dependencies:** None

  **Files:**
  - Create: `src/app/[locale]/embed/page.tsx`
  - Create: `src/app/[locale]/embed/EmbedClient.tsx`
  - Create: `src/app/[locale]/embed/embed.css.ts`
  - Test: `src/engine/__tests__/embed-params.test.ts`

  **Approach:**
  - `page.tsx`는 서버 컴포넌트, `EmbedClient.tsx`는 클라이언트 컴포넌트
  - URL 파라미터: `code` (base64 인코딩), `args` (JSON 문자열), `preset` (알고리즘 id)
  - `preset` 파라미터가 있으면 해당 preset의 code와 defaultArgs 사용
  - `code` 파라미터가 있으면 base64 디코딩 후 사용
  - 실행 후 PlaygroundViewer와 동일한 3패널 레이아웃 렌더
  - Header/Footer 없음 (embed 라우트가 `(main)` route group 밖)
  - 하단에 "Powered by Recursive" 링크 추가

  **Patterns to follow:**
  - `src/app/[locale]/visualize/playground/CustomVisualizerClient.tsx` — 코드 실행 + 뷰어 연결 패턴
  - `src/app/[locale]/visualize/playground/PlaygroundViewer.tsx` — 시각화 뷰어 props 구조

  **Test scenarios:**
  - Happy path: `?code=base64(bubbleSort코드)&args=[[5,3,8]]` → 시각화 정상 렌더
  - Happy path: `?preset=bubble-sort` → 프리셋 로드 후 시각화
  - Edge case: code와 preset 둘 다 없음 → 에러 메시지 표시
  - Edge case: 잘못된 base64 → 에러 메시지 표시
  - Edge case: 존재하지 않는 preset id → 에러 메시지 표시

  **Verification:** `/embed?preset=bubble-sort` 접속 시 헤더/푸터 없이 시각화 표시, step 이동 가능

---

- [ ] **Unit 2: Powered by Recursive 링크**

  **Goal:** embed 하단에 서비스 링크를 표시하여 브랜딩 및 트래픽 유입

  **Requirements:** R8

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/shared/ui/PoweredByBadge.tsx`
  - Create: `src/shared/ui/powered-by-badge.css.ts`
  - Modify: `src/shared/ui/index.ts`

  **Approach:**
  - 작고 눈에 거슬리지 않는 링크: "Powered by Recursive" + 로고 아이콘
  - 클릭 시 `https://recursive-ochre.vercel.app` 새 탭으로 열림
  - embed.css.ts에서 하단 고정

  **Patterns to follow:**
  - `src/shared/ui/Footer.tsx` — 링크 스타일 패턴

  **Test expectation:** none — 순수 UI 컴포넌트

  **Verification:** embed 페이지 하단에 링크 표시, 클릭 시 메인 사이트 열림

---

- [ ] **Unit 3: embed URL 생성 헬퍼**

  **Goal:** 시각화 페이지에서 "embed 코드 복사" 기능을 위한 URL 생성 유틸리티

  **Requirements:** R2, R3

  **Dependencies:** Unit 1

  **Files:**
  - Create: `src/shared/lib/embed-url.ts`
  - Test: `src/shared/lib/__tests__/embed-url.test.ts`

  **Approach:**
  - `buildEmbedUrl(code, args)` → 완성된 embed URL 반환
  - `buildEmbedUrl(presetId)` → preset 기반 embed URL 반환
  - code를 base64 인코딩, args를 JSON.stringify
  - base URL은 환경 변수 또는 상수에서 가져옴

  **Test scenarios:**
  - Happy path: code + args → 유효한 URL 생성, 디코딩 시 원본 복원
  - Happy path: preset id → `?preset=bubble-sort` 형태
  - Edge case: 특수문자 포함 코드 → 인코딩/디코딩 정상
  - Edge case: 빈 args → `args` 파라미터 생략

  **Verification:** 생성된 URL로 embed 페이지 접근 시 정상 동작

---

- [ ] **Unit 4: 프리셋 페이지에 embed 복사 버튼**

  **Goal:** 프리셋 시각화 페이지에서 iframe 코드를 클립보드에 복사하는 버튼 추가

  **Requirements:** R2, R3

  **Dependencies:** Unit 1, Unit 3

  **Files:**
  - Modify: `src/app/[locale]/visualize/[algorithm]/VisualizerClient.tsx`
  - Modify: `messages/ko.json`
  - Modify: `messages/en.json`

  **Approach:**
  - 헤더 영역에 "Embed" 또는 공유 아이콘 버튼
  - 클릭 시 `<iframe src="...embed?preset=..." width="100%" height="500"></iframe>` 클립보드 복사
  - 복사 완료 시 토스트 또는 버튼 텍스트 변경으로 피드백

  **Patterns to follow:**
  - `src/shared/ui/Header.tsx` — 헤더 right 슬롯에 버튼 추가

  **Test scenarios:**
  - Happy path: Embed 버튼 클릭 → 클립보드에 iframe 코드 복사
  - Happy path: 복사 후 시각적 피드백 표시

  **Verification:** 복사된 iframe 코드를 HTML에 붙여넣으면 embed 페이지 로드

## System-Wide Impact

- **라우트 추가**: `/embed` 라우트가 `[locale]` 아래에 추가됨. middleware가 자동으로 locale 처리
- **기존 기능 무변경**: 시각화 엔진, 플레이어, 기존 페이지는 수정하지 않음
- **번들 영향**: embed 페이지가 별도 chunk로 분리되므로 기존 페이지 번들에 영향 없음

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| URL 길이 제한 (code가 길 때) | preset id 방식 제공 + 향후 short URL 서비스 고려 |
| iframe CSP 차단 (일부 플랫폼) | Obsidian Publish는 허용. 차단되는 플랫폼은 직접 링크 대안 제공 |
| base64 인코딩/디코딩 깨짐 | URL-safe base64 (btoa/atob) 사용 + 테스트 커버리지 |

## Sources & References

- Related code: `src/app/[locale]/visualize/playground/PlaygroundViewer.tsx`
- Related code: `src/engine/executor.ts`
- Related doc: `docs/solutions/codepanel-first-render-highlight-2026-04-15.md`
