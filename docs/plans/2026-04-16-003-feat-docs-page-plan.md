---
title: "feat: Add documentation page"
type: feat
status: active
date: 2026-04-16
---

# feat: Add documentation page

## Overview

처음 방문한 사용자가 서비스를 이해하고 사용할 수 있도록 `/docs` 페이지를 추가한다. 헤더에 Docs 탭을 넣고, 기능 소개 + 사용 방법 + 지원 언어 + 제한 사항을 한 페이지에 정리한다.

## Problem Frame

현재 사이트에 들어오면 코드 에디터만 보이고, 어떤 기능이 있는지, 어떻게 사용하는지 설명이 없다. README에는 있지만 사이트 안에서는 안내가 없어서 이탈률이 높을 수 있다.

## Requirements Trace

- R1. `/docs` 라우트에서 기능 소개, 사용 방법, 지원 언어, 제한 사항 표시
- R2. 헤더에 Docs 네비게이션 링크 추가
- R3. 다국어 지원 (ko/en)
- R4. Footer가 있는 `(main)` route group에 배치
- R5. 모바일 반응형

## Scope Boundaries

- 정적 콘텐츠 페이지 (MDX나 CMS 없이 컴포넌트로 직접 작성)
- 검색 기능 없음
- 사이드바 네비게이션 없음 (한 페이지에 스크롤)

## Key Technical Decisions

- **컴포넌트 기반**: MDX 대신 TSX 컴포넌트로 작성. i18n 번역 키와 자연스럽게 통합
- **`(main)` route group**: Footer 포함. 홈, 알고리즘 페이지와 동일한 레이아웃
- **스크롤 기반 단일 페이지**: 섹션이 5-6개 정도라 사이드바 없이 스크롤로 충분
- **앵커 링크**: 각 섹션에 id를 달아서 `#features`, `#usage` 같은 직접 링크 가능

## Docs 페이지 콘텐츠 구조

### 1. Hero
- "Recursive Docs" 타이틀
- 간단한 소개 한 줄

### 2. Features (주요 기능)
- 코드를 붙여넣으면 입력 값 Input이 자동 생성
- 재귀 함수 → 호출 트리 시각화
- breakpoint 없이 디버깅
- 라인 하이라이팅 + 수동/자동 재생
- 함수 하나 또는 일반 코드 모두 지원

### 3. Supported Languages (지원 언어)
- Python
- JavaScript / TypeScript
- 각 언어의 특징 (Python: sys.settrace 기반, JS: AST 변환 기반)

### 4. How to Use (사용 방법)
- Step 1: 언어 선택
- Step 2: 코드 입력 또는 붙여넣기
- Step 3: 매개변수 입력 (자동 감지)
- Step 4: ▶ 실행
- Step 5: 스텝 이동, 재생, 변수 추적
- 프리셋 알고리즘 사용법

### 5. Embed (임베드)
- 블로그/Obsidian에 iframe 삽입 방법
- Notion에서 /embed로 삽입 방법
- 높이 조절

### 6. Limitations (제한 사항)
- 비동기 코드 (setTimeout, Promise, async/await) 미지원
- 클래스 (class) 미지원 (JS)
- 최대 재귀 호출 1000회, 최대 step 10000개
- Python: numpy 등 외부 패키지 미지원
- Python 첫 로드 시 2-5초 소요 (Pyodide)

## Implementation Units

- [ ] **Unit 1: Docs 페이지 생성**

  **Goal:** `/docs` 라우트에 문서 페이지 생성

  **Requirements:** R1, R4, R5

  **Dependencies:** None

  **Files:**
  - Create: `src/app/[locale]/(main)/docs/page.tsx`
  - Create: `src/app/[locale]/(main)/docs/docs.css.ts`

  **Approach:**
  - `(main)` route group 안에 배치 (Footer 포함)
  - 각 섹션에 id 속성으로 앵커 링크
  - 반응형: 모바일에서 패딩/폰트 조절

  **Patterns to follow:**
  - `src/app/[locale]/(main)/algorithms/page.tsx` — (main) 안의 페이지 구조

  **Test expectation:** none — 정적 콘텐츠 페이지

  **Verification:** `/docs` 접속 시 모든 섹션 표시, 모바일에서도 정상

---

- [ ] **Unit 2: 다국어 콘텐츠**

  **Goal:** 한국어/영어 번역 키 추가

  **Requirements:** R3

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `messages/ko.json`
  - Modify: `messages/en.json`

  **Approach:**
  - `docs` 네임스페이스로 번역 키 추가
  - 각 섹션 제목 + 본문

  **Test expectation:** none — 정적 번역

---

- [ ] **Unit 3: 헤더에 Docs 링크 추가**

  **Goal:** 헤더 네비게이션에 Docs 탭 추가

  **Requirements:** R2

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `src/shared/ui/Header.tsx`
  - Modify: `messages/ko.json` (nav 라벨)
  - Modify: `messages/en.json`

  **Approach:**
  - 기존 Playground, 알고리즘 학습 옆에 Docs 링크 추가
  - 모바일 햄버거 메뉴에도 추가

  **Test expectation:** none — UI 변경

  **Verification:** 헤더에서 Docs 클릭 → `/docs` 페이지 이동

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 콘텐츠가 너무 길어서 읽기 싫음 | 섹션별 간결하게, 코드 예시 최소화 |
| 다국어 번역 키가 많아짐 | docs 네임스페이스로 분리 |
