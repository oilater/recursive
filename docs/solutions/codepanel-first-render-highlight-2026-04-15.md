# CodePanel 첫 렌더 하이라이트 버그 리팩토링

## 증상

코드를 실행하면 첫 번째 step의 코드 라인에 하이라이트가 보이지 않는다. 수동으로 다음 step으로 갔다가 이전으로 돌아오면 그때는 보인다.

## 원인 분석 과정

### 1차 시도: useLayoutEffect

`useEffect`가 렌더 후에 비동기로 실행되니까 DOM이 아직 준비 안 된 거 아닐까? → `useLayoutEffect`로 바꿔봄.

결과: 하이라이트가 순간 보였다가 사라짐. DOM이 준비 안 된 게 아니라, **준비된 후에 누군가가 다시 덮어쓰는** 거라는 걸 알게 됨.

### 2차 시도: HTML 문자열에 class 직접 삽입

`dangerouslySetInnerHTML`과 DOM 조작이 충돌하는 거니까, HTML 문자열 자체에 `highlighted-line` class를 regex로 삽입하는 `useMemo` 방식을 시도.

결과: Shiki가 생성하는 HTML 구조와 regex가 안 맞아서 실패.

### 3차 시도: requestAnimationFrame

한 프레임 기다리면 모든 렌더가 끝난 후일 거라고 생각함.

결과: 한 프레임으로 부족. 이중 `requestAnimationFrame`으로 두 프레임 기다리니까 동작함. 하지만 hacky한 해결책.

### 근본 원인 발견

왜 두 프레임이나 기다려야 하는지를 추적하다가 렌더링 흐름을 정리함:

1. `setExec` + `setMode("visualize")` → React 자동 배칭 → **렌더 A** (CodePanel 마운트, `dangerouslySetInnerHTML`로 DOM 세팅)
2. 렌더 A 후 `useEffect` 실행 → `querySelector`로 `highlighted-line` class 추가 ✓
3. `useAlgorithmPlayer`의 `resetOnStepsChange` useEffect가 `RESET` dispatch → **렌더 B** 발생
4. 렌더 B에서 `currentIndex`는 여전히 0이고 `activeLine`도 동일하지만, **부모가 리렌더되면 자식도 리렌더**
5. CodePanel이 리렌더되면서 `dangerouslySetInnerHTML`이 같은 html로 DOM을 **다시 세팅** → 수동으로 추가한 `highlighted-line` class가 사라짐

핵심: `dangerouslySetInnerHTML`은 React의 virtual DOM diffing을 우회한다. 같은 문자열이어도 리렌더될 때마다 실제 DOM을 덮어쓴다. 거기에 수동으로 추가한 class는 매번 날아간다.

### 최종 해결: React.memo

문제의 본질은 **불필요한 리렌더**였다. `html`과 `activeLine`이 안 바뀌었는데 부모 리렌더 때문에 CodePanel이 다시 그려지는 것.

`React.memo`로 CodePanel을 감싸면, `html`과 `activeLine`이 실제로 바뀔 때만 리렌더된다. player의 RESET으로 부모가 리렌더되어도 CodePanel의 props가 동일하면 리렌더를 건너뛴다. DOM이 덮어쓰이지 않으니 `useEffect`에서 추가한 `highlighted-line` class가 유지된다.

```tsx
// Before: 부모 리렌더 → CodePanel 리렌더 → DOM 덮어쓰기 → 하이라이트 사라짐
export function CodePanel({ html, activeLine }: CodePanelProps) { ... }

// After: props 동일하면 리렌더 스킵 → DOM 유지 → 하이라이트 유지
export const CodePanel = memo(function CodePanel({ html, activeLine }: CodePanelProps) { ... });
```

이중 `requestAnimationFrame`은 제거하고, 일반 `useEffect`로 되돌림.

### 추가 개선: 컴포넌트 분리

`React.memo`로 문제를 해결한 뒤, 구조적으로도 개선했다. 기존에는 `CustomVisualizerClient` 하나가 에디터 모드, 로딩, 시각화 모드를 전부 관리하면서 `useAlgorithmPlayer`도 들고 있었다. player state가 바뀔 때마다 에디터 관련 state까지 포함한 전체 컴포넌트가 리렌더되는 구조였다.

시각화 부분을 별도 컴포넌트(`PlaygroundViewer`, `PresetViewer`)로 분리해서, player가 이 안에서만 존재하도록 변경했다.

```
// Before: 하나의 거대한 컴포넌트
CustomVisualizerClient (edit + loading + visualize + player)
  ├── CodePanel ← player 리렌더에 영향받음
  ├── CallStack
  └── StepperControls

// After: 모드별 분리
CustomVisualizerClient (edit + loading + 모드 전환만)
  └── PlaygroundViewer (player는 여기서만)
      ├── CodePanel ← 외부 리렌더와 격리
      ├── CallStack
      └── StepperControls
```

이렇게 하면 `React.memo`와 컴포넌트 분리가 **각각 다른 레벨의 문제를 해결**한다:
- **컴포넌트 분리** — 외부 state 변경(모드 전환, 코드 입력 등)이 시각화 영역에 영향 안 줌
- **`React.memo`** — 내부 player RESET으로 인한 CodePanel 불필요한 리렌더 방지

## 교훈

- `dangerouslySetInnerHTML` + DOM 직접 조작은 충돌할 수밖에 없다. 리렌더를 막거나, DOM 조작을 안 하거나 둘 중 하나.
- 타이밍 해킹(rAF, setTimeout)으로 해결되면 근본 원인을 다시 봐야 한다. 대부분 불필요한 리렌더가 원인이다.
- `React.memo`는 성능 최적화뿐 아니라, DOM 직접 조작과 React 렌더링의 충돌을 방지하는 데도 유효하다.
- 하나의 컴포넌트가 여러 모드를 관리하면서 훅을 공유하면, 관련 없는 state 변경이 서로 영향을 미친다. 역할별로 분리하면 memo 없이도 해결되는 문제가 많다.
