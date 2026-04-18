# Barrel Exports — 트레이드오프와 우리 규칙

## TL;DR

- **앱 내부 코드(`src/`)에서는 직접 경로 import가 기본.** Barrel(`index.ts` re-export)은 잘못 쓰면 클라이언트 번들을 깨뜨리거나, 타입 하나 가지러 갔다가 메가바이트짜리 모듈을 끌고 온다.
- **라이브러리 public API에서는 barrel이 정당하다.** 외부 사용자에게 안정적인 surface를 제공하기 위함.
- 우리 프로젝트에선 환경 종속(node `fs`, pyodide 등) 모듈은 barrel에서 제외한다. 자세한 규칙은 맨 아래 참조.

---

## Barrel이 뭐야

```ts
// src/algorithm/index.ts
export type { Step, Frame } from "./types";
export { registerAlgorithm } from "./registry";
export { AlgorithmCard } from "./ui/AlgorithmCard";
export { initializeAlgorithms } from "./presets/index";
```

이렇게 한 폴더의 여러 export를 모은 `index.ts` 파일을 **barrel file**이라 한다. 사용자는 `import { Step, Frame, registerAlgorithm } from "@/algorithm"` 한 줄로 다 가져올 수 있다.

## 왜 안 좋다고 하는가

### 1. Side-effect 전염 — 가장 치명적

Barrel에서 한 심볼이라도 import하면, **bundler는 barrel 파일 전체를 평가해야 한다.** Tree-shaking이 모든 하위 모듈을 분석할 수 있다는 보장이 있어야 동작하는데, 보통은 그렇지 못하다.

우리 프로젝트의 실제 사고:

```ts
// VariablePanel.tsx (client component, "use client")
import { findPrevFrame, isVisibleFrame } from "@/algorithm";
```

이 한 줄이 다음 체인을 발생시킴:

```
@/algorithm
  → ./presets/index (initializeAlgorithms 때문에 re-export됨)
  → ./presets/recursion
  → ./presets/load-code
  → import { readFileSync } from "fs"  ← 클라이언트 번들에 fs!
```

결과: `Module not found: Can't resolve 'fs'`. 빌드 깨짐.

타입 하나만 가지러 갔는데 node-only 모듈을 끌고 옴.

### 2. Tree-shaking 한계

이론상 ES modules는 tree-shakeable이다. 그런데 실전에선:
- 모든 하위 모듈이 **side-effect-free**여야 (각 모듈에 `"sideEffects": false` 명시 또는 bundler가 정적 분석으로 확인 가능해야)
- side-effect가 의심되는 한 모듈만 있어도 tree-shaking이 무력화될 수 있음
- Webpack/Next.js의 모듈 그래프 분석은 항상 보수적

특히 우리 프로젝트의 `presets/recursion.ts` 같은 파일은 import 시점에 `registerAlgorithm()`을 호출하는 side-effect가 있다. Bundler는 이 모듈을 안전하게 elide할 수 없다고 판단해버린다.

### 3. 빌드/HMR 비용

Barrel을 통해 import한 파일이 수정되면, **barrel을 import하는 모든 모듈의 의존 그래프가 무효화될 수 있음.** 작은 수정에도 빌드/HMR 그래프가 비대해진다.

### 4. 순환 의존 숨기기

Barrel을 통하면 `A → barrel → B → barrel → A` 같은 cycle이 IDE/bundler에 잘 안 잡힌다. 직접 경로면 즉시 보임.

### 5. IDE auto-import 노이즈

같은 심볼이 직접 경로와 barrel 경로 두 가지로 노출되면 auto-import 제안이 시끄럽고 일관성이 깨진다.

---

## 그런데 라이브러리들은 다 쓰던데?

`react`, `lodash-es`, `@tanstack/react-query` 같은 라이브러리는 barrel을 적극 활용한다. 왜?

### 라이브러리에는 정당한 이유가 있다

1. **공개 API surface 정의**
   - 외부 사용자가 의존할 수 있는 안정적인 API를 한 군데에 모아야 한다.
   - 내부 파일 구조가 바뀌어도 `import from "react"`는 안 깨져야 한다.
   - 직접 경로(`import from "react/internal/Fiber"`)는 "private, 깨질 수 있음"의 신호.

2. **버전 관리/문서화의 단위**
   - "v18에서 새로 export된 것"을 한눈에 보기 위해.

3. **번들러 최적화 가정**
   - 라이브러리 작성자는 자기 코드가 tree-shakeable이 되도록 신경 쓴다 (`"sideEffects": false`, ESM-only 빌드, 순수 함수 우선).
   - `lodash-es`는 정확히 이 이유로 `lodash`보다 권장됨.

4. **소비자가 "필요한 것만" 가져간다는 가정이 합리적**
   - 라이브러리는 외부 환경 종속이 거의 없다 (fs, DB 같은 거 안 씀).
   - barrel을 평가해도 부작용이 적다.

### 앱 내부 코드는 다르다

1. **자기 자신만 사용한다.** Public API를 안정시킬 이유가 없음.
2. **환경 종속이 흔하다.** server-only 모듈 (`fs`, `process`), 무거운 클라이언트 모듈 (Pyodide, Three.js), DB 클라이언트 등이 자유롭게 섞여 있다.
3. **리팩토링 비용이 작다.** 직접 경로 import는 "rename file" 기능으로 자동 갱신됨.

즉, **라이브러리에서 barrel이 정당한 이유들이 앱 내부에선 거의 적용되지 않는다.**

---

## 우리 프로젝트의 규칙

### 기본: 앱 내부에서는 직접 경로

```ts
// 좋음
import type { Step } from "@/algorithm/types";
import { findPrevFrame } from "@/algorithm/frames";
import { CodePanel } from "@/visualizer/code-panel/CodePanel";

// 피하기 (특히 server-only/heavy 모듈을 끌어오는 barrel일 때)
import { Step, findPrevFrame } from "@/algorithm";
```

### Barrel을 유지해도 되는 경우

다음 모두를 만족할 때:
1. 같은 환경에서만 사용 (모두 client 전용 또는 모두 server 전용)
2. 무거운 의존성(pyodide, fs, DB) 없음
3. 함께 자주 사용되는 응집도 높은 그룹 (예: UI primitive 모음)

우리 프로젝트의 안전한 barrel 예시:
- `@/visualizer` — 모두 `"use client"` React 컴포넌트
- `@/shared/ui` — UI primitive
- `@/player` — 단일 hook + type
- `@/editor` — client component + type

### 절대 barrel에 넣지 말 것

- `fs`, `path`, `child_process` 등 node-only 모듈을 transitive하게 끌어오는 모듈
- Pyodide, WebContainer 같은 무거운 런타임을 transitive하게 끌어오는 모듈
- Database client, ORM 모듈
- "초기화" 함수 (e.g., `initializeAlgorithms`) — server-only setup으로 격리

이런 심볼은 사용처에서 직접 경로로 import한다.

### Type-only import 권장

값이 아닌 타입만 필요하면:

```ts
import type { Step } from "@/algorithm/types";
```

`import type`은 컴파일 시 완전히 제거되어 런타임 의존이 0. Barrel을 거쳐도 일부 bundler에선 안전하지만, 직접 경로를 권장.

### 새 barrel 만들 때 체크리스트

- [ ] 모든 하위 모듈이 같은 환경 (client/server)인가?
- [ ] 어떤 하위 모듈도 fs/pyodide/DB 등 무거운 의존성을 transitive하게 갖지 않는가?
- [ ] 사용처들이 실제로 여러 심볼을 함께 쓰는가? (한두 심볼만 쓰면 직접 경로가 더 나음)
- [ ] `"sideEffects": false`를 package.json에 명시할 수 있는 수준인가?

하나라도 NO면 barrel 만들지 말 것.

---

## 참고 자료

- [Webpack Tree Shaking docs](https://webpack.js.org/guides/tree-shaking/) — `sideEffects` 필드 설명
- [Next.js docs on barrel files](https://nextjs.org/docs/app/building-your-application/optimizing/package-bundling) — Next.js의 자동 최적화도 한계 있음
- 우리 프로젝트의 실제 사고: `feat: stack-frame variable tracking` PR (#13)에서 `@/algorithm` barrel을 통해 client component가 fs를 끌어와 빌드 깨진 사례
