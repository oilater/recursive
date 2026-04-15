---
title: "feat: Add i18n multi-language support (ko/en)"
type: feat
status: active
date: 2026-04-15
---

# feat: Add i18n multi-language support (ko/en)

## Overview

한국어 전용이던 Recursive에 영어를 추가하고, 향후 다른 언어도 쉽게 확장할 수 있는 i18n 인프라를 구축한다. next-intl 라이브러리를 사용하여 App Router와 서버 컴포넌트에 자연스럽게 통합하고, 사용자 언어에 맞는 번역 파일만 로드하여 번들 크기 영향을 최소화한다.

## Problem Frame

현재 48개 이상의 한국어 문자열이 14개 파일에 하드코딩되어 있다. 영어권 사용자가 접속하면 모든 UI가 한국어로 표시되어 사용이 어렵다. 레퍼런스 문서(`docs/multi-langs-reference.md`)의 가이드라인에 따라 사용자별로 필요한 언어 리소스만 제공하는 구조를 만든다.

## Requirements Trace

- R1. 한국어(기본) + 영어 두 언어를 지원한다
- R2. URL 기반 라우팅: 한국어는 `/`, 영어는 `/en/` (prefix_except_default)
- R3. 사용자 언어를 자동 감지한다 (Accept-Language → 쿠키 → 기본값)
- R4. 사용자가 수동으로 언어를 전환할 수 있다 (UI 제공)
- R5. 해당 언어의 번역 파일만 로드한다 (동적 import)
- R6. SEO: hreflang 태그, 언어별 메타데이터, sitemap 업데이트
- R7. 알고리즘 이름/설명도 다국어 지원한다
- R8. 새 언어 추가 시 번역 파일 + config 한 줄이면 충분한 구조

## Scope Boundaries

- 지원 언어: ko, en만 (일본어, 중국어 등은 이 플랜 범위 밖)
- 알고리즘 코드 자체는 번역하지 않음 (JS 코드는 언어 무관)
- Worker 에러 메시지는 이 단계에서 영어로 통일 (런타임 i18n은 복잡도 대비 가치 낮음)
- 도메인 라우팅(ko.example.com)은 사용하지 않음

## Context & Research

### 참고 문서 핵심 사항 (see origin: docs/multi-langs-reference.md)

- **언어 감지 우선순위**: URL 경로 → 쿠키 → Accept-Language → 기본 언어 (4-3-1-4)
- **라우팅 전략**: prefix_except_default가 기본 언어 사용자에게 짧은 URL 제공 + SEO 유리 (4-3-1-2-1)
- **코드 스플리팅**: next-intl의 동적 import로 해당 언어만 로드 (4-3-2-1-1)
- **쿠키 저장**: SSR에서 첫 HTML 생성 시 언어를 알 수 있어 로컬스토리지보다 유리 (4-3-1-3)
- **타입 안전성**: next-intl이 messages 구조 기반 타입 추론 지원 (4-3-2-1-3)

### 현재 코드베이스

- Next.js 16.2.3, App Router, React 19
- i18n 라이브러리 없음, middleware.ts 없음
- `<html lang="ko">` 하드코딩
- 메타데이터: 영어 제목 + 한국어 설명 혼재
- 라우트: `/`, `/visualize/[algorithm]`, `/visualize/custom`
- 하드코딩된 한국어 문자열 48개+, 14개 파일에 분산

### 문자열 분류

| 카테고리 | 개수 | 예시 |
|---------|------|------|
| UI 라벨/버튼 | 20 | "← 목록", "▶ 실행", "처음으로" |
| 알고리즘 메타데이터 | 8 | "버블 정렬 (Bubble Sort)", "인접한 두 원소를..." |
| SEO/메타데이터 | 4 | description, keywords |
| 에러 메시지 | 3 | "실행 시간이 N초를 초과했습니다" |
| 툴팁 | 5 | "한 단계 앞으로", "일시정지" |
| 빈 상태 메시지 | 2 | "스텝을 실행하면 Variables가 표시됩니다" |
| placeholder | 3 | "여기에 코드를 붙여넣으세요", "값을 입력하세요" |
| 난이도 라벨 | 3 | "쉬움", "보통", "어려움" (2곳 중복) |

## Key Technical Decisions

- **next-intl 사용**: App Router + RSC 지원, 동적 import 내장, 타입 안전, 경량 (see origin 4-3-2-1-1)
- **prefix_except_default 전략**: 한국어(기본)는 `/about`, 영어는 `/en/about`. 한국 사용자에게 짧은 URL, SEO에서 최상위 경로를 기본 언어로 인식 (see origin 4-3-1-2-1)
- **단일 네임스페이스**: 번역 키가 48개 수준이므로 페이지별 분리 불필요. `ko.json`, `en.json` 각각 하나
- **알고리즘 메타데이터 i18n**: preset 객체에 `nameKey`, `descriptionKey`를 두고 번역 파일에서 참조. 코드 자체는 변경 없음
- **난이도 라벨 통합**: `AlgorithmCard`와 `VisualizerClient`에 중복된 `difficultyLabels` 제거, 번역 파일로 이동
- **Worker 에러 메시지**: 영어로 통일. Worker 내부에서 i18n 컨텍스트 접근은 복잡하므로 제외

## Open Questions

### Resolved During Planning

- **언어 전환 UI 위치**: 홈페이지 상단 + 시각화 페이지 헤더. 드롭다운 or 토글 버튼 → 2개 언어이므로 심플한 토글 (`🇰🇷 / 🇺🇸` 또는 `KO / EN`)
- **알고리즘 코드 파일(.js)은 번역하나?**: 아니오. 코드는 JS이므로 언어 무관
- **기존 URL의 SEO 영향**: 한국어 기본이므로 기존 `/` 경로는 그대로 유지. 깨지는 링크 없음

### Deferred to Implementation

- next-intl 최신 버전의 정확한 설정 API (패키지 설치 후 확인)
- 언어 전환 토글의 정확한 스타일링 (구현 시 기존 디자인에 맞춤)

## Implementation Units

- [ ] **Unit 1: next-intl 설치 및 기본 설정**

  **Goal:** next-intl 라이브러리 설치, i18n 설정 파일 생성, 라우트 구조를 `[locale]` 세그먼트로 변경

  **Requirements:** R1, R2, R8

  **Dependencies:** None

  **Files:**
  - Create: `src/i18n/config.ts` (지원 언어, 기본 언어 상수)
  - Create: `src/i18n/request.ts` (next-intl의 getRequestConfig)
  - Create: `src/middleware.ts` (언어 감지 + 라우팅)
  - Modify: `src/app/layout.tsx` → `src/app/[locale]/layout.tsx`로 이동
  - Modify: `src/app/page.tsx` → `src/app/[locale]/page.tsx`로 이동
  - Modify: `src/app/visualize/` → `src/app/[locale]/visualize/`로 이동
  - Modify: `next.config.ts` (next-intl 플러그인 설정)

  **Approach:**
  - `[locale]` 동적 세그먼트를 앱 라우트 최상위에 추가
  - middleware.ts에서 URL → 쿠키 → Accept-Language → 기본값(ko) 순서로 감지
  - prefix_except_default: ko는 prefix 없이, en은 `/en/`으로 라우팅
  - `src/i18n/config.ts`에 `locales`, `defaultLocale` 상수 정의

  **Patterns to follow:**
  - 레퍼런스 문서 4-3-1-4 우선순위 전략
  - 레퍼런스 문서 4-3-2-1-1 next-intl 동적 import 패턴

  **Test scenarios:**
  - Happy path: `/` 접속 시 한국어 레이아웃 렌더링
  - Happy path: `/en` 접속 시 영어 레이아웃 렌더링
  - Happy path: `/en/visualize/custom` 경로가 정상 동작
  - Edge case: 지원하지 않는 locale (`/fr`) 접속 시 기본 언어(ko)로 리다이렉트
  - Integration: Accept-Language: en 헤더로 첫 방문 시 `/en/`으로 리다이렉트

  **Verification:** `pnpm build` 성공, 기존 모든 페이지가 동일하게 동작

---

- [ ] **Unit 2: 번역 파일 생성 및 문자열 추출**

  **Goal:** ko.json, en.json 번역 파일을 만들고, 모든 하드코딩 문자열을 번역 키로 교체

  **Requirements:** R1, R5, R7

  **Dependencies:** Unit 1

  **Files:**
  - Create: `messages/ko.json`
  - Create: `messages/en.json`
  - Modify: `src/app/[locale]/page.tsx` (9개 문자열)
  - Modify: `src/app/[locale]/visualize/[algorithm]/VisualizerClient.tsx` (4개 문자열 + difficultyLabels)
  - Modify: `src/app/[locale]/visualize/custom/CustomVisualizerClient.tsx` (3개 문자열)
  - Modify: `src/visualizer/stepper/StepperControls.tsx` (5개 툴팁)
  - Modify: `src/visualizer/call-stack/CallStack.tsx` (1개 빈 상태)
  - Modify: `src/visualizer/variable-panel/VariablePanel.tsx` (1개 빈 상태)
  - Modify: `src/algorithm/AlgorithmCard.tsx` (difficultyLabels 제거)
  - Modify: `src/editor/CodeEditor.tsx` (2개 placeholder)
  - Modify: `src/editor/ArgumentForm.tsx` (1개 placeholder)

  **Approach:**
  - 번역 파일 구조: 플랫한 네임스페이스 (`home.title`, `visualizer.backToList`, `stepper.play` 등)
  - 서버 컴포넌트: `getTranslations()` 사용
  - 클라이언트 컴포넌트: `useTranslations()` 사용
  - `difficultyLabels`를 두 곳에서 중복 정의하지 않고 번역 파일의 `difficulty.easy/medium/hard`로 통합
  - 알고리즘 name/description: preset 객체에 키를 저장하고 UI에서 `t(preset.nameKey)` 형태로 렌더링하거나, id 기반으로 `t(\`algorithm.${preset.id}.name\`)` 패턴 사용

  **Patterns to follow:**
  - next-intl `useTranslations` 훅 (클라이언트 컴포넌트)
  - next-intl `getTranslations` (서버 컴포넌트)

  **Test scenarios:**
  - Happy path: 홈페이지에서 모든 한국어 문자열이 정상 표시
  - Happy path: `/en` 경로에서 모든 영어 문자열이 정상 표시
  - Happy path: 알고리즘 카드의 이름, 설명, 난이도가 언어에 맞게 표시
  - Edge case: 번역 키가 누락된 경우 fallback 동작 확인
  - Integration: 시각화 페이지에서 모든 UI 요소(툴팁, 빈 상태, 라벨)가 올바른 언어로 표시

  **Verification:** 한국어/영어 각각 모든 페이지에서 하드코딩된 한국어가 남아있지 않음

---

- [ ] **Unit 3: 언어 전환 UI**

  **Goal:** 사용자가 언어를 수동으로 전환할 수 있는 토글 버튼 추가, 선택을 쿠키에 저장

  **Requirements:** R3, R4

  **Dependencies:** Unit 1, Unit 2

  **Files:**
  - Create: `src/shared/ui/LocaleToggle.tsx`
  - Create: `src/shared/ui/locale-toggle.css.ts`
  - Modify: `src/app/[locale]/page.tsx` (토글 배치)
  - Modify: `src/app/[locale]/visualize/[algorithm]/VisualizerClient.tsx` (토글 배치)
  - Modify: `src/app/[locale]/visualize/custom/CustomVisualizerClient.tsx` (토글 배치)

  **Approach:**
  - 2개 언어이므로 심플한 토글: `KO | EN` (활성 쪽에 accent 색상)
  - 클릭 시 next-intl의 `useRouter`로 locale 변경 + 쿠키 저장
  - 홈 상단 오른쪽, 시각화 페이지 헤더 오른쪽에 배치
  - 쿠키명: `NEXT_LOCALE` (next-intl 기본값)

  **Patterns to follow:**
  - 레퍼런스 문서 4-3-1-3 쿠키 저장 패턴
  - 기존 `src/shared/ui/Badge.tsx` 스타일 컨벤션

  **Test scenarios:**
  - Happy path: KO → EN 전환 시 URL이 `/en/...`으로 변경되고 UI가 영어로 바뀜
  - Happy path: EN → KO 전환 시 URL에서 `/en` prefix 제거되고 UI가 한국어로 바뀜
  - Happy path: 전환 후 새 탭/재방문 시 쿠키 기반으로 선택된 언어 유지
  - Edge case: 시각화 진행 중 언어 전환 시 현재 페이지 유지 (결과 리셋 허용)

  **Verification:** 모든 페이지에서 토글 visible, 전환 시 즉시 반영, 재방문 시 유지

---

- [ ] **Unit 4: SEO 및 메타데이터 다국어 처리**

  **Goal:** 언어별 메타데이터, hreflang 태그, sitemap 업데이트

  **Requirements:** R6

  **Dependencies:** Unit 1, Unit 2

  **Files:**
  - Modify: `src/app/[locale]/layout.tsx` (언어별 메타데이터, html lang 속성)
  - Modify: `src/app/sitemap.ts` (언어별 URL 포함)
  - Modify: `src/app/robots.ts` (필요 시)

  **Approach:**
  - layout.tsx에서 `generateMetadata`를 사용하여 locale에 따라 title, description, og:locale 동적 생성
  - `<html lang={locale}>` 동적 설정
  - hreflang alternate 링크 추가 (`ko` ↔ `en`)
  - sitemap에 각 언어별 URL 포함

  **Patterns to follow:**
  - Next.js Metadata API `generateMetadata` with params
  - 레퍼런스 문서 4-3-1-2 URL 기반 SEO 전략

  **Test scenarios:**
  - Happy path: 한국어 페이지의 `<html lang="ko">`, 영어 페이지의 `<html lang="en">`
  - Happy path: og:locale이 각 언어에 맞게 설정
  - Happy path: hreflang alternate 링크가 두 언어 모두 포함
  - Integration: sitemap.xml에 한국어/영어 URL 모두 포함

  **Verification:** 빌드 후 생성된 HTML에서 lang, hreflang, og 태그 확인

---

- [ ] **Unit 5: Worker 에러 메시지 영어 통일 및 정리**

  **Goal:** Worker/Engine 내부의 한국어 에러 메시지를 영어로 통일

  **Requirements:** R1

  **Dependencies:** None (독립적)

  **Files:**
  - Modify: `src/engine/build-worker-code.ts` (재귀 호출 초과 메시지)
  - Modify: `src/engine/executor.ts` (타임아웃, 알 수 없는 오류 메시지)

  **Approach:**
  - Worker 내부는 i18n 컨텍스트에 접근할 수 없으므로 영어로 통일
  - 에러 메시지가 UI에 표시될 때는 error boundary에서 처리 가능하지만, 현재 규모에서는 영어 메시지로 충분

  **Test scenarios:**
  - Happy path: 무한 재귀 시 영어 에러 메시지 표시
  - Happy path: 타임아웃 시 영어 에러 메시지 표시

  **Verification:** 각 에러 케이스 트리거 시 영어 메시지 확인

## System-Wide Impact

- **라우트 구조 변경**: 모든 페이지가 `[locale]/` 세그먼트 아래로 이동. 기존 한국어 URL은 prefix_except_default 덕분에 그대로 유지
- **SEO**: 기존 `/` 경로가 유지되므로 검색 순위 영향 없음. 영어 페이지가 추가되어 인덱싱 범위 확장
- **번들 크기**: next-intl ~12KB gzipped + 언어 파일 하나 ~2-3KB. 총 영향 미미
- **기존 기능 무변경**: 트레이싱 엔진, 플레이어, 시각화 로직은 전혀 수정하지 않음

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 라우트 이동 시 기존 import 경로 깨짐 | `[locale]` 세그먼트 추가는 app/ 내부 구조만 변경, src/ 모듈은 영향 없음 |
| next-intl + Next.js 16 호환성 | next-intl이 최신 App Router를 공식 지원함. 설치 후 빌드로 확인 |
| 번역 누락 | ko.json을 원본으로 en.json을 작성. 빌드 시 타입 체크로 누락 키 감지 |
| Vercel 배포 시 middleware 동작 | Vercel은 Edge Middleware를 네이티브 지원. prefix_except_default는 리다이렉트 최소화 |

## Sources & References

- next-intl 공식 문서: https://next-intl.dev
- Next.js i18n 가이드: https://nextjs.org/docs/app/building-your-application/routing/internationalization
