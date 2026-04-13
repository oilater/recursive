---
title: "refactor: FSD to domain-centric structure"
type: refactor
status: completed
date: 2026-04-14
---

# refactor: FSD to domain-centric structure

## Overview

Feature-Sliced Design (entities/features/shared)에서 도메인 중심 평탄 구조로 전환.

## Why

FSD는 이 프로젝트 규모(~50 파일)에 과도:
- `entities/algorithm/model/types.ts` — 3단계 깊이에 파일 1개
- `features/player/model/useAlgorithmPlayer.ts` — 훅 하나에 폴더 3개
- 폴더마다 역할이 다름 (어디엔 훅, 어디엔 로직, 어디엔 컴포넌트만)

## New Structure

```
src/
├── app/              # Pages
├── engine/           # Code tracing (analyzer, transformer, executor, worker, constants)
├── algorithm/        # Presets (definitions, registry, types, card UI)
├── visualizer/       # Visualization components (TreeView, CodePanel, Stepper, etc.)
├── editor/           # Code input (CodeEditor, ArgumentForm)
├── player/           # Playback hook (useAlgorithmPlayer)
└── shared/           # Styles, UI primitives, utilities
```

Each folder = one domain, depth 1, clear purpose.

## Also Changed
- useAlgorithmPlayer: useState 13개 → useReducer (reducer 순수 함수)
- AST 노드 생성 보일러플레이트 → ast-builders.ts 순수 빌더 함수 추출
- 매직 스트링 "__entry__" 등 → engine/constants.ts 상수화
- prettier → oxfmt (Rust 기반 포매터)
