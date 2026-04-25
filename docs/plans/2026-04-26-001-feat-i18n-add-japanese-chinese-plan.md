---
title: "feat: Add Japanese and Chinese (Simplified) i18n locales"
type: feat
status: active
date: 2026-04-26
---

# feat: Add Japanese and Chinese (Simplified) i18n locales

## Overview

Recursive 사이트는 현재 next-intl 기반으로 한국어(`ko`) + 영어(`en`) 두 locale을 지원한다. 이 플랜은 **일본어(`ja`)와 중국어 간체(`zh`)** 두 locale을 추가한다. 사용자 지시:

1. 번역해야 할 텍스트를 전부 찾고
2. ja, zh 두 언어로 번역
3. 두 언어 번역은 **subagent를 병렬로 spawn**해서 동시 수행 — 각 subagent는 "다국어 번역 전문가" 페르소나로 번역만 수행 (메인 agent가 locale config/UI/build 등 코드 작업은 모두 책임)
4. 번역 종료 후 **테스트 + 린트 + 빌드** 무결성 확인

## Problem Frame

현재 구조:
- `src/i18n/config.ts` — `locales = ["ko", "en"] as const`
- `messages/en.json`, `messages/ko.json` — 동일한 키 구조의 번역 사전 (각 162줄)
- `src/i18n/request.ts` — 동적 import (`messages/${locale}.json`). **새 locale 파일을 추가하면 자동 로드됨**
- `src/middleware.ts` — `routing` 객체 사용 → 자동 확장
- `src/i18n/navigation.ts` — `routing` 객체 사용 → 자동 확장

수동 변경이 필요한 surface:
- `src/i18n/config.ts` — `locales` 배열에 `"ja"`, `"zh"` 추가
- `src/app/[locale]/layout.tsx` — `og:locale` 분기 (`ko_KR`/`en_US` → ja/zh도 매핑) + `alternates.languages` 객체에 ja/zh URL 추가
- `src/shared/ui/LocaleToggle.tsx` — `LOCALES` 배열 + 정규식 `/^\/(ko|en)(\/|$)/` 두 곳에 ja/zh 추가
- `src/shared/ui/Header.tsx` — locale 비교 분기 점검 (현재 `locale === "ko"` 한 줄 — 모바일 토글 active 표시)
- `src/app/[locale]/(main)/docs/page.tsx` — `BUBBLE_SORT_KO` / `BUBBLE_SORT_EN` 코드 샘플의 한 자리. ja/zh 코드 주석 변형 추가 (또는 EN 폴백 결정)

폰트는 의도적으로 out-of-scope. 현재 `pretendard`(한국어 최적화)와 Plus Jakarta Sans / Geist Mono(라틴) 사용. ja/zh 글자는 시스템 fallback 폰트로 렌더링됨 — 시각적 결함이 있을 수 있지만 이번 플랜의 "번역만" 범위에서 벗어남.

## Requirements Trace

- **R1.** `messages/ja.json`, `messages/zh.json` 두 파일이 `messages/en.json`과 **완전히 동일한 키 구조**로 생성됨 (top-level + nested 모두 일치). 누락 키 없음.
- **R2.** 번역 품질이 자연스러움 — 기계적인 직역이 아니라 각 언어 사용자가 보기에 어색하지 않은 표현. 기술 용어(JavaScript, TypeScript, Python, GitHub, iframe 등) 영문 보존.
- **R3.** Locale 등록 + UI 스위처 + metadata가 ja/zh를 포함하도록 코드 변경. 두 locale 페이지(`/ja`, `/zh`)가 정상 라우팅되며 LocaleToggle에서 선택 가능.
- **R4.** **Subagent는 번역만 수행.** 코드 변경, 파일 이동, 빌드, 테스트 등 부수 작업 금지. 번역 외 작업은 메인 agent가 직접 수행.
- **R5.** ja와 zh 번역은 **병렬 subagent로 동시 실행** — 두 작업 사이 의존성 없음. 메인 agent가 두 결과를 모은 뒤 통합.
- **R6.** 작업 완료 후 `pnpm test` + `pnpm lint:check` + `pnpm build` 모두 무결 통과. 회귀 없음.
- **R7.** 기존 ko/en 페이지 동작 byte-identical (regression 없음).
- **R8.** `docs/page.tsx`의 코드 샘플(`BUBBLE_SORT_KO`/`BUBBLE_SORT_EN`)에 대해 ja/zh 분기 정책 결정 — 이 플랜은 **코드 주석을 각 언어로 번역한 새 상수 추가**를 채택 (Key Decisions 참조).

## Scope Boundaries

**In scope:**
- `messages/ja.json`, `messages/zh.json` 신규 생성 (en/ko 키 구조 1:1 매핑)
- `src/i18n/config.ts` — locale 배열 확장
- `src/app/[locale]/layout.tsx` — metadata 매핑 확장 (`og:locale`, `alternates.languages`)
- `src/shared/ui/LocaleToggle.tsx` — UI 스위처 ja/zh 옵션 추가
- `src/shared/ui/Header.tsx` — locale 분기 점검 및 필요 시 확장
- `src/app/[locale]/(main)/docs/page.tsx` — `BUBBLE_SORT_JA`, `BUBBLE_SORT_ZH` 코드 상수 추가 + locale 분기 확장
- 빌드/테스트/린트 통과 검증

**Out of scope:**
- **폰트 추가** (Noto Sans JP/SC 등). 현재 fallback에 맡김. 시각 품질 우려 시 별도 후속 PR.
- 알고리즘 preset 코드(`src/algorithm/presets/codes/`)의 다국어화 — 알고리즘 코드 자체는 locale-independent
- `LocaleToggle` 외 UI 디자인 변경
- 라우팅 정책 변경 (`localePrefix: "as-needed"` 그대로)
- 한국어/영어 번역 수정 (이번 작업은 ja/zh 추가만)
- `zh-TW`(번체) 지원 — 본 플랜은 `zh` = 간체로 정의. 번체 필요 시 별도 후속.
- E2E/시각 회귀 테스트 자동화 — 수동 smoke로 갈음

## Context & Research

### Relevant Code and Patterns

- **`src/i18n/config.ts`** — Locale 등록 단일 source of truth. `as const` 튜플로 타입 자동 도출.
- **`src/i18n/request.ts`** — 동적 `import('../../messages/${locale}.json')`. 새 파일만 추가하면 즉시 로드됨.
- **`messages/en.json`, `messages/ko.json`** — 키 구조 reference. top-level 8개 namespace: `home`, `visualizer`, `run`, `custom`, `editor`, `difficulty`, `algorithm`, `docs`, `metadata`. 키 셋이 완전히 동일.
- **`src/app/[locale]/layout.tsx:55-76`** — metadata 빌더에 locale 분기 두 곳: `openGraph.locale` (현재 `ko_KR`/`en_US`) + `alternates.languages` (ko/en 두 url).
- **`src/shared/ui/LocaleToggle.tsx`** — 클라이언트 toggle. `LOCALES` 배열 + `switchTo`의 정규식 두 곳에 새 locale 코드 추가 필요.
- **`src/shared/ui/Header.tsx:124`** — `locale === "ko" ? styles.mobileLocaleActive : ""` 한 줄. 모바일에서 KO 활성 표시 — 다국어 확장 시 logic 일반화 필요할지 점검.
- **`src/app/[locale]/(main)/docs/page.tsx:1-65`** — `BUBBLE_SORT_KO`/`BUBBLE_SORT_EN` 코드 샘플 상수. 코드 자체는 동일하고 주석만 ko/en. ja/zh 추가 시 동일 패턴.
- **`pnpm test` / `pnpm lint:check` / `pnpm build`** — `package.json` scripts. 빌드는 `next build --webpack`. 린트는 `oxlint src/`.

### Pattern Reference: 동음이의어 (메모리)

메모리 `project_language_terminology.md` 참조: "language"는 두 의미가 공존 — `CodeLanguage`(JS/Python) vs `Locale`(ko/en/...). 이 플랜은 **`Locale` 도메인 확장만** 수행. `CodeLanguage` 변동 없음. 두 개념 혼동 주의.

### Subagent Topology

사용자 지시 "각 언어별로 3개의 subagent" 해석:
- 두 언어(ja, zh) × 3 = 6 subagent는 **작업 분할 의미 없음** (한 언어 번역은 162줄 단일 JSON + 코드 주석 한 묶음으로 자연 분할 어려움)
- "각 언어별" 강조구문으로 해석 → **언어당 1 subagent, 총 2개를 병렬 실행** 으로 단순화
- 사용자가 의도적으로 "3개"를 원하면 (a) 번역 1 + 검수 1 + 자연스러움 패스 1로 분할 가능. 이 경우 plan을 살짝 손봐야 함. → 실행 시점 사용자 확인 1회.

## Key Technical Decisions

- **`zh` = 간체 (Simplified Chinese)**: next-intl convention상 `zh` 단독은 종종 간체로 해석됨. 사용 인구가 더 많고 글로벌 SaaS 표준. 번체 필요 시 후속 `zh-TW`로 별도 추가. 파일명은 `zh.json` 단순 형태 유지.
- **subagent는 번역만**: 메인 agent가 locale config/UI 토글/metadata/docs page 코드 분기 등 모든 코드 변경 담당. subagent는 입력으로 en.json + 코드 주석 원문 받고 출력으로 번역된 JSON + 번역된 코드 주석만 반환.
- **번역 입력 source 통일**: ko가 아닌 **`en.json`을 source로 사용**. 이유: (1) 영어가 기술 용어 표현이 명확, (2) 메시지 톤이 ko보다 기계 번역에 친화적, (3) ko에는 한국어 특유 문장 어순/조사가 있어 ja/zh 번역 시 잡음 가능. 단, 한국 algorithm 사이트 컨텍스트는 en에 잘 보존돼 있음.
- **`docs/page.tsx`의 코드 샘플은 주석을 각 언어로 번역**: `BUBBLE_SORT_JA`, `BUBBLE_SORT_ZH` 두 상수 추가, locale === "ja"/"zh" 분기 추가. 코드 본문 (`function bubbleSort(arr)` 등 식별자)은 그대로, 주석만 번역.
- **폰트는 안 건드림**: 시스템 fallback에 의존. 시각 품질 회귀 위험 있음 — Risk 표에 명시.
- **번역 키 구조 1:1**: ja.json/zh.json은 en.json과 완전히 동일한 key tree. 누락/추가 금지. 검증은 별도 스크립트 없이 수동 diff 또는 빌드 시 next-intl warning으로 감지.
- **기술 용어 보존**: "JavaScript", "TypeScript", "Python", "GitHub", "iframe", "Notion", "Obsidian", "JSON", "Math", "Array", "collections", "functools" 같은 고유명사/API 이름은 영문 그대로. 번역 가이드라인에 명시.
- **이모지 보존**: `▶`, `→`, `✨`, `⭐` 같은 이모지/기호는 그대로.

## Open Questions

### Resolved During Planning

- **Q: zh 간체 vs 번체?** → 간체(`zh.json`). 번체는 별도 후속.
- **Q: ja/zh 폰트?** → 시스템 fallback. 별도 폰트 추가는 후속.
- **Q: subagent 토폴로지?** → 언어당 1개, 총 2개 병렬. 사용자가 명시적으로 "각 언어 3개"를 원하면 1번역 + 1검수 + 1자연스러움 패스로 재분할 (실행 시 1회 확인).
- **Q: 번역 source는 en/ko 중 어느 쪽?** → `en.json` (기술 용어 표현이 더 명확).
- **Q: 알고리즘 preset 코드 다국어화?** → out-of-scope. 알고리즘 코드는 locale-independent.

### Deferred to Implementation

- **Header.tsx의 `locale === "ko"` 분기 일반화 방식**: 단순 active 표시라 `locale === "ja"` / `locale === "zh"` 분기를 조건 더 추가할지, 또는 `LOCALES`-driven loop로 바꿀지 — 구현 시 가장 단순한 방향 선택.
- **`docs/page.tsx`의 코드 주석 번역 분량**: bubbleSort 함수 주석은 짧음. 정확한 번역 문구는 subagent 출력에 의존.

## Implementation Units

- [ ] **Unit 1: Generate ja.json and zh.json via parallel translation subagents**

**Goal:** `messages/ja.json` + `messages/zh.json` 두 파일을 신규 생성. en.json 키 구조 1:1 보존 + 자연스러운 ja/zh 번역.

**Requirements:** R1, R2, R4, R5

**Dependencies:** None

**Files:**
- Create: `messages/ja.json`
- Create: `messages/zh.json`
- (Read source) `messages/en.json`

**Approach:**
- 메인 agent가 `messages/en.json` 전체 내용을 읽음.
- **2개 subagent를 병렬로 spawn** (ja 번역 1개, zh 번역 1개).
- 각 subagent에게 다음 prompt 전달:
  > 너는 지금부터 다국어 번역 전문가야. 위의 내용을 바탕으로 [일본어 / 중국어 간체]로 번역해. 다음 규칙을 지켜줘:
  > - 입력 JSON의 키 구조를 100% 동일하게 보존. 키 이름은 영문 그대로.
  > - 값(value)만 번역. JSON 형식 valid 유지.
  > - 기술 용어 보존: JavaScript, TypeScript, Python, GitHub, iframe, Notion, Obsidian, JSON, Math, Array, collections, functools, async, Promise, setTimeout 등 고유명사/API 이름은 영문 그대로.
  > - 이모지/기호 보존: `▶`, `→`, `✨`, `⭐`, `💡` 등 그대로.
  > - `<link>...</link>` 태그 보존 — 태그 안 텍스트만 번역.
  > - 자연스러운 표현 우선. 기계적 직역 금지.
  > - 번역만 수행. 다른 작업(설명, 주석, 코드 변경) 금지.
  > - 출력은 valid JSON 단일 블록.
- 두 subagent 결과 받아서 메인 agent가 각각 `messages/ja.json`, `messages/zh.json`으로 저장.
- 저장 후 키 구조 검증 (재귀 비교): en.json과 ja.json/zh.json의 모든 key path가 일치하는지.

**Execution note:** Spawn the two translation subagents in a **single message with two parallel Agent tool calls** so they run concurrently. Subagents have **translation-only authority** — they must not write files, run commands, or modify code. Main agent owns all file I/O.

**Patterns to follow:**
- `messages/en.json`의 키 구조와 namespace 분리
- `messages/ko.json`의 톤 (informal, 친근함) — 같은 톤 유지

**Test scenarios:**
- Happy path: en.json key path 셋 = ja.json key path 셋 = zh.json key path 셋 (재귀 비교 통과)
- Happy path: 두 새 파일 모두 valid JSON (parse 시 에러 없음)
- Edge case: 모든 string value가 비어 있지 않음 (빈 string 0건)
- Edge case (보존 검증): "JavaScript", "TypeScript", "Python", "GitHub" 같은 영문 기술 용어가 두 파일에 그대로 등장 (각 ≥1회)
- Edge case (이모지 보존): `▶`, `→` 가 적절한 자리에 보존됨
- Edge case (link 태그): `<link>...</link>` 태그가 docs.heroStar/heroSponsor/changelogDesc 등에서 보존됨

**Verification:**
- `cat messages/ja.json | python3 -m json.tool > /dev/null` — JSON 파싱 통과
- `cat messages/zh.json | python3 -m json.tool > /dev/null` — JSON 파싱 통과
- 키 구조 재귀 비교 (간단한 jq 또는 직접 비교): `diff <(jq 'paths(strings) | join(".")' messages/en.json | sort) <(jq 'paths(strings) | join(".")' messages/ja.json | sort)` 결과 빈 차집합
- zh.json도 동일 비교 통과

---

- [ ] **Unit 2: Register ja and zh in locale config**

**Goal:** `Locale` 타입과 routing이 새 두 locale을 인식하도록 단일 source of truth(`config.ts`) 확장.

**Requirements:** R3

**Dependencies:** Unit 1 (메시지 파일이 먼저 존재해야 dev 서버에서 페이지가 깨지지 않음)

**Files:**
- Modify: `src/i18n/config.ts`

**Approach:**
- `locales` 배열에 `"ja"`, `"zh"` 추가. `as const` 유지.
- `defaultLocale`은 `"ko"` 그대로.
- routing.ts / request.ts / navigation.ts / middleware.ts는 자동 확장 (이 파일들 모두 `routing.locales`를 참조).

**Test scenarios:**
- Test expectation: none -- pure config addition. 회귀 검증은 Unit 5에서.

**Verification:**
- `npx tsc --noEmit` 에러 없음 (Locale 타입 자동 확장 확인)
- dev 서버 띄워 `/ja` / `/zh` 진입 시 메시지 페이지 200 응답

---

- [ ] **Unit 3: Update layout metadata + LocaleToggle + Header for ja/zh**

**Goal:** UI에서 ja/zh가 선택 가능하고, OG metadata와 hreflang에도 반영.

**Requirements:** R3, R7

**Dependencies:** Unit 2

**Files:**
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `src/shared/ui/LocaleToggle.tsx`
- Modify: `src/shared/ui/Header.tsx`

**Approach:**
- **`layout.tsx`**:
  - `openGraph.locale` 분기를 매핑으로 일반화 (예: `LOCALE_OG_MAP: Record<Locale, string>` — `ko_KR`, `en_US`, `ja_JP`, `zh_CN`).
  - `alternates.languages` 객체에 `ja: "${SITE_URL}/ja"`, `zh: "${SITE_URL}/zh"` 추가.
- **`LocaleToggle.tsx`**:
  - `LOCALES` 배열에 `{ code: "ja", label: "JA" }`, `{ code: "zh", label: "ZH" }` 추가.
  - `switchTo`의 정규식 `/^\/(ko|en)(\/|$)/` → `/^\/(ko|en|ja|zh)(\/|$)/` 확장.
- **`Header.tsx:124`**: `locale === "ko"` 단일 분기 → 4 locale 모두 active 분기 가능하도록. 단순 active 표시면 `locale === currentMobileLocale` 패턴이 자연스러움. 구현 시 최소 변경.

**Test scenarios:**
- Test expectation: none -- UI/metadata mechanical extension.
- 수동: LocaleToggle 열어 ja/zh 옵션 보임, 클릭 시 URL이 `/ja` / `/zh`로 전환.
- 수동: `/ja` 페이지 source view에서 `<html lang="ja">`, `og:locale = ja_JP`, `<link rel="alternate" hreflang="ja" href=".../ja">` 확인.

**Verification:**
- `npx tsc --noEmit` 에러 없음
- `pnpm lint:check` 에러 없음
- 수동 smoke (Unit 5 체크리스트의 S1~S4)

---

- [ ] **Unit 4: Add Japanese and Chinese translations of bubble-sort code comments in docs page**

**Goal:** `docs/page.tsx`의 코드 샘플 분기에 ja/zh 변형 추가. 코드 주석만 번역, 코드 본문은 그대로.

**Requirements:** R8, R7

**Dependencies:** Unit 1 (subagent 한 번 더 spawn 가능 — 코드 주석은 분량 적어 인라인으로도 가능)

**Files:**
- Modify: `src/app/[locale]/(main)/docs/page.tsx`

**Approach:**
- `BUBBLE_SORT_JA`, `BUBBLE_SORT_ZH` 두 상수 추가. 코드 본문은 `BUBBLE_SORT_EN`과 동일, 주석만 ja/zh 번역.
- locale 분기 확장: 현재 `locale === "ko" ? BUBBLE_SORT_KO : BUBBLE_SORT_EN` → 4-way map 또는 `Record<Locale, string>` 패턴.
- 번역 위탁: subagent 1개로 두 언어 동시 가능 (분량 작음). 또는 Unit 1의 subagent에게 함께 위탁 (en.json과 같이 묶어서). 구현 시 효율적인 쪽 선택.

**Test scenarios:**
- Test expectation: none -- mechanical addition + translation.
- 수동: `/ja/docs` 페이지의 bubbleSort 코드 블록 주석이 일본어, `/zh/docs`는 중국어, ko/en 페이지는 변동 없음.

**Verification:**
- `npx tsc --noEmit` 에러 없음
- 수동 smoke (Unit 5의 S5)

---

- [ ] **Unit 5: Verification — test, lint, build, manual smoke**

**Goal:** 모든 작업 완료 후 회귀 검사 + 사용자 지시 (`테스트, 린트, 빌드`) 충족.

**Requirements:** R6, R7

**Dependencies:** Unit 1, 2, 3, 4

**Files:**
- 코드 변경 없음. 검증만 수행.

**Approach:**
- `pnpm test` (vitest 전체) — 모두 pass
- `pnpm lint:check` (oxlint) — clean
- `pnpm build` (`next build --webpack`) — 성공
- 수동 smoke 체크리스트 수행.

**Manual smoke checklist:**

| # | URL | 시나리오 | 기대 |
|---|---|---|---|
| S1 | `/ja` | 일본어 home 페이지 | 자연스러운 일본어 텍스트, 라우팅 200 |
| S2 | `/zh` | 중국어 home 페이지 | 자연스러운 중국어 텍스트, 라우팅 200 |
| S3 | LocaleToggle (any page) | KO/EN/JA/ZH 4개 옵션 보임 | 클릭 시 해당 locale로 URL 전환 |
| S4 | `/ja` 페이지 source | `<html lang="ja">`, `og:locale=ja_JP`, hreflang ja/zh 포함 | metadata 정상 |
| S5 | `/ja/docs`, `/zh/docs` | bubbleSort 코드 주석이 각 언어로 번역돼 보임 | 코드 본문은 동일 |
| S6 | `/ko`, `/en` 모든 페이지 | 기존 한국어/영어 동작 변함 없음 | 회귀 0 |
| S7 | next-intl warning | 콘솔에 "missing translation key" 경고 0건 (모든 locale 모든 namespace) | 키 누락 없음 |

**Test scenarios:**
- Test expectation: none -- this unit IS the verification.

**Verification:**
- 모든 수동 시나리오 회귀 없음
- `pnpm test` 전체 pass / `pnpm lint:check` clean / `pnpm build` 성공
- 회귀 발견 시 해당 unit으로 reflow

## System-Wide Impact

- **Interaction graph:** 새 메시지 파일은 next-intl이 동적 import. 기존 페이지/컴포넌트 코드 변경 없음. LocaleToggle만 새 옵션 노출.
- **Error propagation:** 메시지 키 누락 시 next-intl이 콘솔 warning + 영문 fallback. 빌드는 실패하지 않음. Unit 1의 키 구조 검증으로 사전 차단.
- **State lifecycle risks:** 없음. SSR/CSR 양쪽 모두 동일 흐름.
- **API surface parity:** `Locale` 타입이 4개 값으로 확장 — `Locale`을 사용하는 모든 곳(`LocaleToggle`, `layout.tsx`, `docs/page.tsx`, `Header.tsx`)이 자동으로 새 값을 인지해야 함. tsc가 누락 분기를 잡음.
- **Integration coverage:** 단위 테스트 없음. 수동 smoke가 유일한 회귀 가드 — Unit 5 충실 수행.
- **Unchanged invariants:**
  - 한국어/영어 페이지 동작 byte-identical
  - 기존 routing 정책 (`localePrefix: "as-needed"`) 그대로
  - `defaultLocale` = `"ko"` 그대로
  - `pretendard` 한국어 폰트 그대로 (ja/zh는 시스템 fallback)
  - 알고리즘 preset / engine / worker / 시각화 컴포넌트 모두 무영향

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| ja/zh 폰트 fallback이 시각적으로 어색 | 사용자 명시 "번역만" → 별도 폰트 PR로 분리. 이 PR에서 시각 품질 평가 후 issue 생성 |
| 번역 품질이 자연스럽지 않거나 기술 용어 오역 | Unit 1 subagent prompt에 보존 규칙 명시 + 메인 agent가 출력 한 번 검토. 미흡 시 사용자에게 review 요청 |
| 키 구조 누락 (subagent가 일부 키 빠뜨림) | Unit 1 verification에 jq 기반 path diff 강제 |
| `<link>...</link>` 태그가 번역 중 손상 | Subagent prompt에 명시 + 사후 검증으로 검출 |
| Header.tsx의 locale 분기를 일반화 안 하면 향후 locale 추가 시 또 손대야 함 | Unit 3에서 단순 분기 확장 vs 패턴화 중 적절한 쪽 선택 (가장 작은 변경 우선) |
| `docs/page.tsx`의 ja/zh 코드 주석 번역이 길어져 plan 단위 깨짐 | bubbleSort 한 함수 분량 작아 risk 낮음. 길면 Unit 1 subagent에게 함께 위탁 |
| pretendard CSS가 ja/zh에서 일부 글자 깨짐 (예: pretendard subset이 한글만 포함) | 이미 fallback 폰트로 렌더링됨. 시각 검토 필요 |
| 빌드 시 next-intl이 누락 키 fail (strict mode) | 현재 strict mode 아님 (warn만). 그러나 안전을 위해 Unit 1 검증 강화 |
| zh-TW 사용자가 zh-CN 페이지에서 어색함 호소 | 별도 후속 zh-TW 추가로 해결. 현재는 zh = 간체 명시 |

## Documentation / Operational Notes

- README ja/zh 페이지 안내 추가 여부는 별도 결정. 본 플랜 범위 외.
- `docs/architecture-walkthrough.md`에 i18n 구조 설명이 있다면 ja/zh 추가 한 줄 반영.
- 폰트 후속 PR 시 `pretendard` 외 `Noto Sans JP` + `Noto Sans SC` 추가 검토.

## Sources & References

- Target files (translation): `messages/ja.json` (new), `messages/zh.json` (new)
- Target files (config): `src/i18n/config.ts`, `src/app/[locale]/layout.tsx`, `src/shared/ui/LocaleToggle.tsx`, `src/shared/ui/Header.tsx`, `src/app/[locale]/(main)/docs/page.tsx`
- Reference: `messages/en.json`, `messages/ko.json`
- next-intl docs: https://next-intl.dev/ (already adopted; no external research needed)
- Memory: `project_language_terminology.md` (Locale vs CodeLanguage 구분 주의)
- AGENTS.md §1 동음이의어 규칙 — 이 플랜은 Locale 도메인 확장만, CodeLanguage 무관
