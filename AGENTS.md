# AGENTS.md

이 프로젝트에서 코드를 작성·리팩토링할 때 반드시 지켜야 하는 원칙. 사용자가 같은 지적을 두 번 하지 않도록.

## 0. 핵심 철학

**역할과 책임의 분리. 컴포넌트는 순수하게.**

- 컴포넌트는 JSX 렌더링과 사용자 입력 처리만.
- 비즈니스 로직, 상태 관리, 외부 시스템 I/O는 **훅 또는 lib**.
- 같은 도메인 state는 **한 곳에서만** 정의 (단일 진리원천).
- 이름은 책임을 정확히. 책임이 바뀌면 이름도 바꾼다.

## 1. 명명 규칙

### 동음이의어는 도메인 prefix로 구분

| 의미 | 이름 | 예시 |
|---|---|---|
| 사용자 코드 언어 | `CodeLanguage` | `"javascript"`, `"python"` |
| UI 표시 언어 | `Locale` (next-intl) | `"ko"`, `"en"` |

`Language`라는 단순 이름 금지. 같은 일반 명사가 두 도메인을 가리키면 prefix로 구분.

### 이름은 책임을 거짓말하지 않는다

`HomeEditor`처럼 "에디터"라는 이름이 실제로는 액션바 + 실행 로직 + navigation까지 담당하는 패턴 금지. 이름이 책임을 가리지 못하면 — 책임을 분리하거나 이름을 바꾸기.

## 2. 책임 분리 가이드

다음이 컴포넌트 안에 있으면 의심하라.

| 항목 | 권장 위치 |
|---|---|
| `localStorage` I/O | `shared/lib/<도메인>-storage.ts` |
| 외부 시스템 초기화 (Worker, Pyodide) | `engine/`, `shared/lib/` 모듈 함수 |
| 상태 + 부수효과 | `shared/hooks/use<X>.ts` |
| AST 파싱, 코드 분석 | `engine/` |
| URL 빌드/인코딩 | `shared/lib/<도메인>-url.ts` |

UI 컴포넌트 파일에서 도메인 함수를 export하지 말 것. lib이 UI에 의존해서는 안 된다.

## 3. 분기 카탈로그를 어댑터로 흡수

**`if (codeLanguage === "python") ... else ...` 같은 분기가 코드베이스 곳곳에 반복되면 즉시 멈추고 어댑터(Strategy 패턴)로 통합하라.**

- 패턴 위치: `src/engine/code-language-adapter.ts`
- `Record<CodeLanguage, CodeLanguageAdapter>` 구조 — TypeScript가 새 언어 추가 시 누락 필드를 컴파일 에러로 잡아준다.
- 사용처는 `getCodeLanguageAdapter(lang).xxx()`로 분기 사라짐.

### 어댑터로 흡수하기 전에 분류

분기는 한 종류가 아니다. 각 패턴마다 답이 다르다.

| 패턴 | 예 | 처리 |
|---|---|---|
| 함수 lookup | `python === "python" ? python() : javascript()` | 어댑터 |
| 한쪽만 변환 | `lang === "javascript" ? normalize(c) : c` | 어댑터 (`prepareForExecution`) |
| 부수효과 트리거 | `if (lang === "python") preload()` | 어댑터 (`onSelected`) |
| 옵션 디스패치 (시그니처 다름) | `executeCode` 내부 if문 | 그대로 (어댑터 강요시 옵션까지 끌고 옴) |
| UI 메시지 | `lang === "python" ? "Loading..." : "Running..."` | i18n 키로 (어댑터 X) |
| 잔재 분기 (의미 없음) | `const lang = code === "python" ? "python" : "javascript"` | 그냥 삭제 |

**규칙: 5종 이상의 카테고리가 보이면 어댑터 도입. 1-2개면 케이스별 처리.**

## 4. 안티패턴 카탈로그

발견 시 즉시 알리고 재검토.

1. **죽은 useEffect**: deps `[]`인데 본문이 변하는 값 참조 → 마운트 시점 초기값으로만 동작 → 의도 미실현.
2. **이중 진리원천**: 같은 state를 두 컴포넌트가 따로 들고, write가 한쪽에서만 일어남.
3. **이중 실행**: 같은 작업을 도착 페이지에서 또 하는 pre-flight 잔재.
4. **매 키 입력마다 무거운 동기 분석**: try-catch로 silent 실패 삼키면서 acorn 풀 파싱 등.
5. **DOM 직접 찌르기**: `querySelector(".cm-content")` 같은 라이브러리 내부 클래스 의존.
6. **한 함수에 여러 책임**: normalize/실행/인코딩/빌드/라우팅을 한 핸들러에.
7. **모듈 경계 위반**: UI 컴포넌트 파일이 도메인 함수와 storage key를 export.
8. **이름과 책임의 불일치**: 컴포넌트 이름이 실제 책임을 가림 (HomeEditor 케이스).
9. **잔재 분기**: 양쪽 결과가 같은데 분기 형태만 남은 코드 (`x === "a" ? "a" : "b"` 같은 NOOP). 즉시 삭제.

## 5. 작업 시 체크리스트

새 컴포넌트나 리팩토링 직전에:

- [ ] 이름이 실제 책임을 정확히 표현하는가?
- [ ] 같은 일을 다른 곳에서 이미 하고 있지 않은가?
- [ ] 비즈니스 로직이 컴포넌트 안이라면 hook/lib으로 빼야 하는가?
- [ ] useEffect deps가 본문에서 사용하는 모든 값을 포함하는가?
- [ ] 같은 분기 패턴이 3곳 이상 반복되면 어댑터/lookup table로 흡수할 수 있는가?
- [ ] 새 타입/변수 이름이 기존 동음이의어와 충돌하지 않는가?

## 6. 사용자가 선호하는 작업 방식

- 결정 전에 **"왜"와 "과정"** 충분히 설명. "이렇게 해라" 금지.
- 답을 주기 전에 **사용자가 이미 가진 그림**을 먼저 묻기. 사용자 직관이 root cause를 가리키는 경우가 많다 ("왜 에디터에 LanguageSelect가 끼어있냐" 같은).
- 옵션은 2-3개로 좁히고 trade-off 명시. 결정은 사용자에게.
- 표면 스멜에 만족하지 말고 root cause 짚기.

## 7. 관련 문서

- `docs/how-it-was-built.md` — 프로젝트의 결정 히스토리
- `docs/architecture-walkthrough.md` — 코드 한 줄 단위 매핑
- `docs/plans/` — 과거 리팩토링 기록
- `docs/solutions/` — 과거 문제 해결의 문서화 (frontmatter의 `module`/`tags`/`problem_type`으로 검색 가능). 비슷한 영역에서 작업/디버깅 시 참조
