---
title: "refactor: preset/custom pipeline unification"
type: refactor
status: completed
date: 2026-04-14
---

# refactor: preset/custom pipeline unification

## Overview

프리셋 알고리즘(순열, 조합, 부분집합)과 커스텀 코드가 별도 파이프라인이었던 것을 단일 `executeCustomCode()` 파이프라인으로 통합.

## What Changed

### Before (두 개의 파이프라인)
- 프리셋: `StepGenerator` 함수를 직접 구현 (permutations.ts, combinations.ts 등)
- 커스텀: `executeCustomCode()` → analyzer → transformer → Worker
- `step-factory`, `parseLineMarkers` 등 프리셋 전용 인프라 존재

### After (단일 파이프라인)
- 프리셋 = `{ code: string, defaultArgs: unknown[] }` 데이터만
- 프리셋/커스텀 모두 `executeCustomCode(code, args)` 로 실행
- step-factory, parseLineMarkers, 개별 generateSteps 전부 삭제

### Deleted
- `src/features/preset-algorithms/permutations.ts` (개별 StepGenerator)
- `src/features/preset-algorithms/combinations.ts`
- `src/features/preset-algorithms/subsets.ts`
- `src/entities/algorithm/lib/step-factory.ts` (curried step/node 생성)
- `src/shared/lib/line-marker.ts` (@line:key 마커 파싱)
- `InputForm` 컴포넌트 + `InputConfig` 타입

### Result
- 코드 -1144줄, +420줄 (순감소 700+줄)
- 새 알고리즘 추가 = presets.ts에 `{ code, defaultArgs }` 한 줄 추가
