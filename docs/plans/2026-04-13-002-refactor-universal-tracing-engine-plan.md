---
title: "refactor: universal code tracing engine"
type: refactor
status: completed
date: 2026-04-13
---

# refactor: universal code tracing engine

## Overview

Proxy 기반 재귀 전용 추적에서 __traceLine 기반 범용 코드 추적으로 전환. 재귀/비재귀 코드 모두 동일한 파이프라인으로 실행.

## Key Decisions

### Proxy → __traceLine 전환
- **이전**: Proxy apply trap이 CALL/RETURN step 생성 + 트리 빌드 담당
- **이후**: __traceLine이 모든 라인별 step 생성, Proxy는 트리 빌드만 담당
- **이유**: Proxy는 함수 경계만 감지. 함수 내부 로직(if, for, 변수 할당)은 추적 불가. __traceLine을 AST 변환으로 매 statement 앞에 삽입하면 라인 단위 추적 가능.

### 변수 캡처: try-catch per variable
- `__captureVars = function() { var __v = {}; try { __v.x = x } catch(__e) { __v.x = "-" } ... return __v; }`
- 인라인 함수로 클로저 스코프 접근. 변수별 개별 try-catch로 미선언 변수도 안전 처리.
- `new Function` 방식은 스코프 격리 때문에 클로저 변수 접근 불가 → 인라인 함수가 유일한 방법.

### __entry__ 래핑
- 모든 코드를 항상 `function __entry__() { ... }` 로 래핑
- 함수가 있으면 마지막에 `return funcName;`으로 참조 반환, Worker가 외부에서 호출
- 함수가 없으면 (bare 코드) 그냥 래핑 → Worker가 `__entry__()` 직접 호출
- `lineOffset = 1` 고정으로 라인 번호 보정

### 루프 추적
- 루프 body **끝**에 while/for 라인 trace 삽입 (시작에 넣으면 중복)
- 흐름: while(진입) → body → ... → while(반복) → body → ...

## Resolved Issues

- FunctionDeclaration/EmptyStatement 앞에는 __traceLine 삽입하지 않음 (선언은 실행이 아님)
- 원본 코드 범위 밖 라인은 Worker에서 필터 (injected return 등)
- 콜백 파라미터 (_, j) 제외 — FunctionDeclaration 파라미터만 수집
- console.log를 stepIdx에 연결하여 스텝별 출력
