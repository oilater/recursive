# Recursive는 어떻게 만들어졌나

> 이 문서는 알고리즘 시각화 도구 **Recursive**가 처음 아이디어에서 완성까지 어떤 과정을 거쳐 구현되었는지를 설명하듯 풀어 쓴 글입니다.

---

## 1. 아이디어: "재귀를 눈으로 보고 싶다"

처음 출발점은 단순했습니다. 코딩 테스트를 준비하다 보면 재귀 함수의 호출 흐름이 머릿속에서 잘 그려지지 않을 때가 있잖아요. 순열, 조합, 부분집합 같은 알고리즘은 코드 자체는 짧은데, 실제로 어떤 순서로 호출되고 어떤 값이 들어가는지 추적하려면 손으로 직접 트리를 그려야 합니다. "이걸 코드만 넣으면 자동으로 그려주는 사이트가 있으면 좋겠다"는 생각에서 시작했습니다.

초기에 정한 핵심 요구사항은 세 가지였습니다.

1. 코드의 실행 흐름을 한 줄 한 줄 따라갈 수 있어야 한다
2. 재귀 함수라면 호출 트리를 시각적으로 보여줘야 한다
3. 각 단계에서 변수가 어떤 값인지 실시간으로 확인할 수 있어야 한다

---

## 2. MVP: 프리셋 알고리즘 4개로 시작

가장 먼저 한 건 데이터 구조를 정하는 것이었습니다. 시각화라는 게 결국 "어떤 데이터를 화면에 그리느냐"의 문제이기 때문에, 데이터 모델이 곧 프로젝트의 뼈대가 됩니다.

핵심은 **Step**이라는 개념이에요. 코드가 한 줄 실행될 때마다 하나의 Step이 만들어집니다. Step은 그 순간의 스냅샷이라고 생각하면 됩니다.

```typescript
interface Step {
  id: number;
  type: "call" | "return";
  codeLine: number;
  activeNodeId: string;
  activePath: string[];
  variables: Record<string, unknown>;
  description: string;
}
```

각 필드가 하는 역할을 설명하면 이렇습니다.

- **id** — Step의 순서 번호입니다. 0번부터 시작해서, 코드가 실행되는 순서대로 1씩 증가합니다. 나중에 StepperControls에서 "23/150" 같은 진행률을 보여줄 때 사용합니다.
- **type** — `"call"` 또는 `"return"` 두 가지입니다. 재귀 함수가 호출되는 시점이면 `"call"`, 리턴되는 시점이면 `"return"`입니다. 비재귀 코드에서는 일반 라인 실행도 `"call"` 타입으로 기록됩니다.
- **codeLine** — 현재 실행 중인 코드의 줄 번호입니다. CodePanel에서 이 줄을 하이라이팅합니다. 사용자가 보는 코드 기준의 번호여야 하기 때문에, 내부적으로 래핑한 줄 수만큼 보정이 필요합니다 (이건 뒤에서 자세히 다룹니다).
- **activeNodeId** — 호출 트리에서 현재 활성화된 노드의 ID입니다. TreeView에서 이 노드를 노란색으로 표시하고, 카메라를 이 노드 쪽으로 이동시킵니다.
- **activePath** — 루트에서 현재 노드까지의 경로를 ID 배열로 담고 있습니다. 예를 들어 `["root", "node-1", "node-1-2"]`처럼요. TreeView에서 이 경로에 포함되지 않는 노드들은 opacity를 낮춰서, 현재 추적 중인 가지만 또렷하게 보이게 합니다.
- **variables** — 현재 스코프에 있는 모든 변수의 값을 담은 객체입니다. `{ arr: [1,2,3], i: 2, used: [true, false, true] }` 같은 형태예요. VariablePanel이 이걸 보여주고, 이전 Step의 variables와 비교해서 바뀐 값을 노란색으로 강조합니다.
- **description** — 이 Step에 대한 설명 텍스트입니다. 재귀 호출이면 `"dfs([1, 2])"` 같은 함수 호출 표현이, 일반 라인이면 빈 문자열이 들어갑니다. StepperControls의 하단에 표시됩니다.

이제 트리 노드를 보겠습니다. 재귀 함수가 호출될 때마다 `TreeNode`가 하나 생기고, 부모-자식 관계로 연결됩니다.

```typescript
interface TreeNode {
  id: string;
  label: string;
  args: string;
  children: TreeNode[];
  status: "idle" | "active" | "completed" | "backtracked";
}
```

- **id** — 노드의 고유 식별자입니다. `"root"`, `"root-0"`, `"root-0-1"` 같은 형태로, 부모 ID에 자식 인덱스를 붙여서 만듭니다. Step의 `activeNodeId`와 `activePath`가 이 ID를 참조합니다.
- **label** — 노드에 표시할 텍스트입니다. 보통 함수 이름이 들어갑니다. `"dfs"`, `"permutation"` 같은 값이에요.
- **args** — 함수에 전달된 인자를 문자열로 표현한 것입니다. `"[1, 2], 0"` 같은 형태로, TreeView의 노드 아래에 표시됩니다. 사용자가 "이 호출에 어떤 값이 들어갔지?"를 바로 확인할 수 있게 해줍니다.
- **children** — 이 호출 내부에서 다시 재귀 호출된 자식 노드들의 배열입니다. `permutation([1,2,3], 2)`가 `dfs([])`를 호출하고, `dfs([])`가 `dfs([1])`, `dfs([2])`, `dfs([3])`를 호출하면, children이 3개인 트리가 만들어집니다.
- **status** — 노드의 현재 상태를 나타냅니다. 네 가지 값이 있어요.
  - `"idle"` — 아직 실행되지 않은 노드 (회색)
  - `"active"` — 지금 실행 중인 노드 (노란색)
  - `"completed"` — 실행이 끝나고 정상 리턴된 노드 (초록색)
  - `"backtracked"` — 백트래킹으로 되돌아간 노드 (빨간색)

이 네 가지 상태가 TreeView에서 노드 색상으로 표현됩니다. 스텝을 하나씩 넘길 때마다 노드 상태가 바뀌면서, 재귀가 어떤 순서로 진행되고 어디서 되돌아가는지를 시각적으로 추적할 수 있습니다.

Step과 TreeNode가 어떻게 연결되는지 정리하면, **Step 배열은 시간 축** (0번 Step → 1번 Step → ... → 마지막 Step), **TreeNode는 공간 축** (호출 트리의 구조)입니다. Step의 `activeNodeId`가 TreeNode의 `id`를 가리키면서 두 축이 연결됩니다. 스텝을 앞으로 넘기면 시간이 흐르고, 그에 따라 트리의 어떤 노드가 활성화되는지가 바뀌는 거예요.

간단한 예제로 보면 더 와닿을 겁니다. 아래 코드를 실행한다고 해볼게요.

```javascript
function factorial(n) {    // 1번 줄
  if (n <= 1) return 1;    // 2번 줄
  return n * factorial(n - 1); // 3번 줄
}
```

`factorial(3)`을 넣으면, 이런 Step 배열이 만들어집니다.

```
Step 0: { codeLine: 2, type: "call",   activeNodeId: "root",   variables: { n: 3 }, description: "factorial(3)" }
Step 1: { codeLine: 3, type: "call",   activeNodeId: "root",   variables: { n: 3 } }
Step 2: { codeLine: 2, type: "call",   activeNodeId: "root-0", variables: { n: 2 }, description: "factorial(2)" }
Step 3: { codeLine: 3, type: "call",   activeNodeId: "root-0", variables: { n: 2 } }
Step 4: { codeLine: 2, type: "call",   activeNodeId: "root-0-0", variables: { n: 1 }, description: "factorial(1)" }
Step 5: { codeLine: 2, type: "return", activeNodeId: "root-0-0", variables: { n: 1 } }
Step 6: { codeLine: 3, type: "return", activeNodeId: "root-0", variables: { n: 2 } }
Step 7: { codeLine: 3, type: "return", activeNodeId: "root",   variables: { n: 3 } }
```

Step 0에서 사용자가 ▶ 버튼을 누르면, CodePanel은 2번 줄을 하이라이팅하고, VariablePanel은 `n = 3`을 보여주고, TreeView는 `"root"` 노드를 노란색(active)으로 표시합니다. Step 2로 넘어가면 `"root-0"` 노드가 새로 생기면서 활성화되고, `n`이 `2`로 바뀐 게 노란색으로 강조됩니다. Step 5에서 `factorial(1)`이 리턴되면 `"root-0-0"` 노드가 초록색(completed)으로 바뀌고, 다시 부모 노드로 돌아가는 흐름이 눈에 보입니다.

이때 TreeNode 구조는 이렇게 됩니다.

```
factorial(3)          ← root
  └── factorial(2)    ← root-0
        └── factorial(1)  ← root-0-0
```

Step을 앞뒤로 움직이면서 이 트리의 노드들이 idle → active → completed 순서로 상태가 바뀌는 걸 보는 것, 그게 이 시각화 도구의 핵심 경험입니다.

MVP에서는 순열, 조합, 부분집합, N-Queen 네 가지 알고리즘을 프리셋으로 넣었습니다. 각 알고리즘마다 `generateSteps()`라는 함수를 직접 작성해서, 알고리즘 로직 안에 Step을 push하는 코드를 수동으로 넣었어요. 지금 생각하면 굉장히 원시적인 방법이었지만, 일단 동작하는 것을 먼저 만들고 나중에 개선하는 게 맞았습니다.

시각화 컴포넌트는 다섯 가지를 만들었습니다.

- **CodePanel** — Shiki로 하이라이팅된 코드에서 현재 실행 줄을 강조
- **TreeView** — d3-hierarchy로 트리 레이아웃을 계산하고 SVG로 렌더링
- **CallStack** — 현재 호출 스택을 프레임 단위로 표시
- **VariablePanel** — 현재 Step의 변수 상태를 보여주고, 이전 Step과 비교해서 변경된 값을 강조
- **StepperControls** — 재생/일시정지, 앞/뒤 이동, 속도 조절

재생 로직은 `useAlgorithmPlayer`라는 커스텀 훅으로 분리했습니다. 이 훅이 currentIndex를 관리하고, 모든 시각화 컴포넌트는 `player.currentStep`을 받아서 렌더링합니다.

---

## 3. 커스텀 코드 실행: "아무 코드나 넣으면 동작해야 한다"

프리셋 4개만으로는 한계가 명확했습니다. 사용자가 자기 코드를 붙여넣고 바로 시각화할 수 있어야 진짜 유용한 도구가 됩니다. 문제는, 임의의 JavaScript 코드를 받아서 실행 흐름을 추적하려면 어떻게 해야 하느냐는 거였어요.

접근법은 **AST(추상 구문 트리) 변환**이었습니다. 사용자 코드를 파싱해서 AST로 만들고, 모든 statement 앞에 추적 코드를 삽입한 뒤, 변환된 코드를 실행하는 방식입니다.

구체적으로 설명하면 이렇습니다.

**1단계 — 분석 (analyzer.ts)**

acorn이라는 파서로 코드를 AST로 변환합니다. AST를 순회하면서 함수 목록, 재귀 여부, 각 함수의 매개변수와 지역 변수를 수집합니다. 예를 들어 `function permutation(nums, r) { ... }` 같은 코드를 넣으면, "permutation이라는 함수가 있고, nums와 r을 매개변수로 받고, 내부에서 자기 자신을 호출하니까 재귀 함수다"라는 정보를 뽑아냅니다.

**2단계 — 변환 (transformer.ts)**

AST의 모든 실행 가능한 statement 앞에 `__traceLine(라인번호, __captureVars())`를 삽입합니다. `__captureVars`는 현재 스코프의 모든 변수 값을 캡처하는 함수입니다. 재귀 함수가 있으면 `__createProxy()`로 감싸서, 호출될 때마다 트리 노드를 생성하도록 합니다. 무한 루프 방지를 위해 모든 반복문에는 `__guard()`도 삽입합니다.

변환된 코드를 astring이라는 라이브러리로 다시 JavaScript 문자열로 만듭니다.

**3단계 — 실행 (executor.ts + Web Worker)**

변환된 코드는 Web Worker 안에서 실행됩니다. 메인 스레드에서 실행하면 무한 루프가 걸렸을 때 브라우저 전체가 멈추니까요. Worker에서는 5초 타임아웃과 5000회 호출 제한을 걸어뒀습니다. fetch나 XMLHttpRequest 같은 위험한 API도 Worker 내부에서 삭제합니다.

Worker가 코드를 실행하면서 `__traceLine`이 호출될 때마다 Step을 쌓아가고, 실행이 끝나면 `{ steps, tree }`를 메인 스레드로 돌려보냅니다.

이 과정에서 TypeScript도 지원하고 싶었는데, sucrase라는 라이브러리로 타입만 깔끔하게 제거하는 방식을 택했습니다. 타입 체크는 안 하지만, `function add(a: number, b: number): number` 같은 코드도 문제 없이 실행됩니다.

---

## 4. 변수 캡처의 함정

변수 캡처에서 꽤 까다로운 문제를 만났습니다. 처음에는 모든 변수를 하나의 try-catch로 감쌌는데, 변수 하나라도 아직 선언되지 않은 상태면 전체 캡처가 실패해서 모든 변수가 사라져버렸습니다. VariablePanel이 깜빡이는 현상이 생겼어요.

해결책은 **변수마다 개별 try-catch**를 두는 것이었습니다.

```javascript
function __captureVars() {
  var __v = {};
  try { __v.arr = arr } catch(__e) { __v.arr = "-" }
  try { __v.n = n } catch(__e) { __v.n = "-" }
  try { __v.i = i } catch(__e) { __v.i = "-" }
  return __v;
}
```

이렇게 하면 아직 선언되지 않은 변수는 `"-"`로 표시되고, 나머지 변수는 정상적으로 캡처됩니다. 코드가 좀 장황해 보이지만, 안정성 면에서 확실한 방법이었습니다.

---

## 5. Proxy로 호출 트리 만들기

재귀 호출 트리는 JavaScript의 Proxy를 활용해서 만듭니다. 재귀 함수를 `Proxy`의 `apply` 트랩으로 감싸면, 함수가 호출될 때마다 가로채서 TreeNode를 생성하고, 호출이 끝나면 상태를 `completed`로 바꿀 수 있습니다.

```javascript
const proxy = new Proxy(originalFunc, {
  apply(target, thisArg, args) {
    // 호출 시: 새 TreeNode 생성, callStack에 push
    const result = Reflect.apply(target, thisArg, args);
    // 리턴 시: callStack에서 pop, 상태를 completed로
    return result;
  }
});
```

여기서 중요한 건, Proxy는 **트리 구축에만** 사용하고 실행 추적은 `__traceLine`이 담당한다는 점입니다. 역할을 명확히 분리한 덕분에, 재귀가 아닌 코드도 동일한 파이프라인으로 시각화할 수 있게 되었습니다.

---

## 6. 코드 래핑과 라인 번호 보정

사용자가 코드를 넣는 방식은 크게 두 가지입니다. 하나는 함수 형태로 넣는 것이고, 다른 하나는 그냥 코드를 그대로 넣는 것입니다.

```javascript
// 케이스 1: 함수 형태
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// 케이스 2: 그냥 코드
const arr = [3, 1, 2];
arr.sort((a, b) => a - b);
console.log(arr);
```

프리셋 알고리즘은 항상 케이스 1이지만, 커스텀 코드 페이지에서는 어떤 형태든 들어올 수 있습니다. 문제는 이 두 가지를 하나의 파이프라인으로 처리해야 한다는 거예요.

Web Worker에서 코드를 실행하려면 "호출할 수 있는 무언가"가 있어야 합니다. 함수 형태라면 그 함수를 호출하면 되지만, 케이스 2처럼 그냥 코드가 나열된 경우에는 호출할 대상이 없습니다. 그래서 **모든 사용자 코드를 `function __entry__() { ... }`로 감싸는** 방법을 택했습니다.

```javascript
// 케이스 1이 들어오면 이렇게 변환됩니다
function __entry__() {
  function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
  }
  return factorial;  // ← 함수를 리턴해서 Worker가 인자를 넣어 호출
}

// 케이스 2가 들어오면 이렇게 변환됩니다
function __entry__() {
  const arr = [3, 1, 2];
  arr.sort((a, b) => a - b);
  console.log(arr);
  // ← 리턴 없음. __entry__() 자체가 실행되면서 코드가 돌아감
}
```

Worker는 `__entry__()`를 호출하고, 리턴값이 함수이면 그 함수에 사용자 인자를 넣어서 한 번 더 호출합니다. 리턴값이 함수가 아니면 이미 코드가 실행된 것이므로 그대로 끝냅니다. 이렇게 하면 어떤 형태의 코드가 들어와도 동일한 흐름으로 처리할 수 있습니다.

다만 이렇게 감싸면 부작용이 하나 생깁니다. `function __entry__() {`가 1줄로 추가되니까 라인 번호가 1줄씩 밀립니다. 사용자가 보는 코드의 3번째 줄이 실제로는 4번째 줄이 되는 거죠.

이걸 보정하기 위해 `lineOffset = 1`을 적용하고, Worker 내부에서는 원본 코드의 줄 수(`originalLineCount`)를 넘어가는 라인은 필터링합니다. 변환 과정에서 삽입된 `return` 문 같은 게 Step에 잡히지 않도록요.

FunctionDeclaration과 EmptyStatement 앞에는 `__traceLine`을 삽입하지 않는 것도 중요한 결정이었습니다. 함수 선언은 "실행"이 아니라 "정의"니까, 추적할 필요가 없습니다. 이걸 안 했을 때는 함수 선언 줄에서 유령 Step이 생겨서 혼란스러웠어요.

---

## 7. 루프 추적 위치의 미묘함

반복문에서 `__traceLine`을 어디에 넣느냐도 중요합니다. 처음에는 루프 body의 **시작**에 넣었는데, while문에서 문제가 생겼습니다. `while → while → if` 같은 이상한 순서로 Step이 찍히더라고요. while 조건 체크와 body 진입이 겹쳐서 중복 Step이 생긴 거였습니다.

해결은 간단했어요. `__traceLine`을 body의 **끝**에 넣는 겁니다. 그러면 흐름이 `while(진입) → body → ... → while(반복) → body → ...` 으로 자연스러워집니다.

---

## 8. 범용 추적 엔진으로의 전환

처음에는 재귀 함수만 시각화하려고 했는데, 만들다 보니 "재귀가 아닌 코드도 똑같이 시각화할 수 있지 않을까?"라는 생각이 들었습니다. 이미 `__traceLine`이 모든 statement를 추적하고 있으니까, Proxy(트리 구축)를 빼면 그냥 범용 코드 추적기가 됩니다.

실제로 버블 정렬 같은 비재귀 알고리즘을 넣으면, 호출 트리 대신 코드 하이라이팅 + 변수 추적만 보여주는 모드로 동작합니다. `hasRecursion` 플래그 하나로 트리/콜스택 UI를 조건부 렌더링하면 됩니다.

이건 설계상 중요한 전환점이었습니다. "재귀 시각화 도구"에서 "범용 알고리즘 시각화 도구"로 확장된 순간이에요.

---

## 9. 파이프라인 통합: 두 개의 경로를 하나로

MVP에서는 프리셋 알고리즘마다 `generateSteps()` 함수를 직접 작성했습니다. 커스텀 코드는 AST 변환 → Worker 실행 파이프라인을 탔고요. 즉 같은 일을 하는 두 가지 경로가 있었던 겁니다.

이걸 하나로 합치는 리팩토링이 가장 임팩트가 컸습니다. 프리셋 알고리즘의 `generateSteps()` 함수를 전부 삭제하고, 프리셋을 단순한 데이터로 바꿨습니다.

```typescript
// Before: 각 알고리즘마다 100줄짜리 generateSteps() 함수
// After: 코드 문자열 + 기본 인자만
{
  id: "permutations",
  code: loadCode("permutations.js"),
  defaultArgs: [[1, 2, 3], 2],
}
```

프리셋이든 커스텀이든 전부 `executeCustomCode(code, args)` 하나로 실행됩니다. 이 변경으로 약 700줄 이상의 코드가 사라졌고, 새 알고리즘을 추가할 때 `.js` 파일 하나 + 메타데이터 한 줄이면 충분해졌습니다.

---

## 10. 트리 시각화: d3-hierarchy + SVG

호출 트리는 d3-hierarchy의 Reingold-Tilford 알고리즘으로 레이아웃을 계산합니다. 이 알고리즘은 트리 노드의 x, y 좌표를 보기 좋게 배치해주는데, 형제 노드 간 간격, 서브트리 간 간격을 자동으로 조절합니다.

계산된 좌표를 바탕으로 SVG `<circle>`과 `<line>`으로 렌더링합니다. Canvas 대신 SVG를 선택한 건, 개별 노드에 이벤트를 붙이거나 스타일을 바꾸기 쉽기 때문입니다.

활성 경로(`activePath`)에 속하지 않는 노드는 opacity를 0.2로 낮춰서, 현재 추적 중인 경로가 한눈에 들어오게 했습니다. 순열처럼 노드가 700개 가까이 되는 트리에서도 현재 위치를 바로 파악할 수 있습니다.

---

## 11. 재생 훅: useState에서 useReducer로

처음에 `useAlgorithmPlayer`는 `useState` 13개 + `useCallback` + `useMemo`로 이루어진 꽤 복잡한 훅이었습니다. 상태 간 의존성이 얽혀 있어서 버그가 나기 쉬웠어요. 예를 들어 "재생 중에 속도를 바꾸면 interval을 다시 설정해야 하고, steps가 바뀌면 index를 리셋해야 하고..." 이런 조합이 많았습니다.

`useReducer`로 전환하면서 상태 로직이 순수 함수 하나로 모였습니다. 액션 타입이 11개 정의되어 있고, reducer 함수가 모든 상태 전이를 관리합니다. 컴포넌트에서는 `dispatch({ type: "PLAY" })` 같은 호출만 하면 됩니다. 테스트하기도 쉽고, 상태 간 불일치가 생길 여지가 없어졌습니다.

---

## 12. 배포와 분석

Vercel에 배포하고, SEO 최적화(메타데이터, sitemap, robots.txt, OG 이미지)를 추가했습니다. 분석 도구는 두 가지를 붙였는데, Vercel Analytics는 페이지뷰와 성능 메트릭을, PostHog는 사용자 행동 이벤트를 추적합니다. 어떤 알고리즘이 많이 실행되는지, 커스텀 코드를 얼마나 쓰는지를 알아야 다음 기능 우선순위를 정할 수 있으니까요.

---

## 13. 리팩토링 과정: 더 나은 구조를 향해

프로젝트를 만들면서 여러 차례 큰 리팩토링을 거쳤습니다. 처음부터 완벽한 구조를 잡은 게 아니라, 실제로 부딪히면서 개선해 나간 과정이에요. 이 과정을 이해하는 게 코드 자체보다 더 중요할 수 있습니다.

### 13-1. FSD → 도메인 중심 구조

처음에는 **Feature-Sliced Design (FSD)** 아키텍처를 적용했습니다. FSD는 `entities/`, `features/`, `shared/` 같은 레이어로 코드를 나누는 방법론인데, 대규모 프로젝트에서는 효과적이지만 이 프로젝트에는 과했습니다.

파일이 50개 남짓인 프로젝트에서 `src/entities/algorithm/model/types.ts` 같은 3단계 깊이의 경로가 생기니까 오히려 복잡해졌어요. "이 파일이 entities에 있어야 하나 features에 있어야 하나?" 같은 분류 고민에 시간을 쓰게 되고, 한 기능을 수정하려면 여러 레이어를 오가야 했습니다.

그래서 **도메인 중심의 flat 구조**로 전환했습니다. `engine/`, `algorithm/`, `visualizer/`, `editor/`, `player/`, `shared/` — 각 폴더가 하나의 도메인이고, 깊이는 1단계입니다. 폴더 이름만 봐도 뭐가 들어있는지 알 수 있고, 새 파일을 어디에 넣을지 고민할 일이 없어졌습니다.

> 기록: `docs/plans/2026-04-14-002-refactor-domain-structure-plan.md`

### 13-2. 파이프라인 통합

앞서 9번 섹션에서 설명한 내용입니다. 프리셋용 `generateSteps()`와 커스텀용 `executeCustomCode()`가 공존하던 구조를 하나로 합쳤습니다. step-factory, parseLineMarkers, 개별 알고리즘 생성 함수 등 700줄 이상의 코드가 사라졌고, InputForm/InputConfig 같은 프리셋 전용 컴포넌트도 삭제할 수 있었습니다.

이 리팩토링의 핵심은 "프리셋은 특별한 코드가 아니라 그냥 데이터다"라는 인식의 전환이었습니다.

> 기록: `docs/plans/2026-04-14-001-refactor-pipeline-unification-plan.md`

### 13-3. AST 빌더 추출

transformer.ts에서 AST 노드를 만드는 코드가 반복적이고 장황했습니다. `{ type: "Identifier", name: "foo" }` 같은 객체 리터럴을 매번 직접 썼거든요. 이걸 `ast-builders.ts`라는 파일로 추출해서 순수 함수로 만들었습니다.

```typescript
// Before
{ type: "Identifier", name: "foo" }

// After
id("foo")
```

`id`, `literal`, `call`, `assign`, `member`, `expr`, `block`, `varDecl`, `tryCatch` 등의 빌더 함수를 만들었더니, transformer가 303줄에서 128줄로 줄었습니다. AST를 다루는 코드가 훨씬 읽기 쉬워졌어요.

### 13-4. useReducer 전환

13개의 `useState`와 여러 `useCallback`/`useMemo`로 얽혀 있던 `useAlgorithmPlayer`를 `useReducer` 하나 + `useEffect` 3개로 정리했습니다. 상태 전이 로직이 순수 함수 안에 모여 있으니 디버깅이 쉬워졌고, 의도치 않은 상태 조합이 생길 수가 없어졌습니다.

### 13-5. 매직 넘버/스트링 상수화

코드 곳곳에 흩어져 있던 `"__entry__"`, `"__traceLine"`, `5000`, `100000` 같은 값들을 `engine/constants.ts`로 모았습니다. 나중에 제한값을 바꾸거나 함수 이름을 바꿀 때 한 곳만 수정하면 됩니다.

### 13-6. 코드 파일 분리

프리셋 알고리즘의 코드가 `.ts` 파일 안에 템플릿 리터럴로 들어가 있었는데, 알고리즘이 늘어날수록 파일이 지저분해지는 문제가 있었습니다. 코드를 `presets/codes/` 폴더에 독립된 `.js` 파일로 분리하고, 서버 사이드에서 `fs.readFileSync`로 읽어오는 방식으로 바꿨습니다.

```typescript
// Before
{ code: `function bubbleSort(arr) { ... 20줄 ... }` }

// After
{ code: loadCode("bubble-sort.js") }
```

이렇게 하면 알고리즘 코드를 에디터에서 `.js` 파일로 열어서 편집할 수 있고, 메타데이터 파일은 깔끔하게 유지됩니다.

### 13-7. 도구 전환: Prettier → oxfmt

코드 포매터를 Prettier에서 oxfmt(Rust 기반)로 바꿨습니다. 속도가 훨씬 빠르고, 린터도 ESLint 대신 oxlint를 사용합니다. `pnpm fix` 한 번이면 린트 + 포매팅이 끝납니다.

---

## 마무리

돌아보면, 이 프로젝트에서 가장 중요했던 건 "일단 동작하게 만들고, 문제가 보이면 고친다"는 태도였습니다. 처음부터 완벽한 구조를 잡으려 했다면 오히려 늦어졌을 거예요. FSD를 적용했다가 과하다는 걸 느끼고 걷어낸 것, 프리셋별 생성 함수를 만들었다가 통합한 것, 이런 시행착오가 결국 더 좋은 구조로 이어졌습니다.

핵심 기술적 결정을 정리하면 이렇습니다.

| 결정 | 이유 |
|------|------|
| AST 변환 + `__traceLine` | 임의의 코드를 라인 단위로 추적 가능 |
| Proxy는 트리 구축 전용 | 역할 분리 → 비재귀 코드도 동일 파이프라인 |
| Web Worker 실행 | 무한 루프/악성 코드로부터 메인 스레드 보호 |
| 프리셋 = 데이터 | 새 알고리즘 추가 비용 최소화 |
| 변수별 try-catch | 선언 전 변수 접근 시에도 나머지 변수 정상 캡처 |
| useReducer | 복잡한 재생 상태를 순수 함수로 관리 |
| 도메인 중심 flat 구조 | 프로젝트 규모에 맞는 단순한 구조 |

각 결정에 대한 상세한 기록은 `docs/plans/` 폴더에 남아 있으니, 더 깊이 알고 싶다면 참고하시면 됩니다.

---

## 14. Python 지원: Pyodide와 sys.settrace

JavaScript 엔진은 AST 변환으로 코드를 직접 수정해서 추적 코드를 삽입하는 방식이었습니다. Python을 지원하려면 같은 방식을 Python AST로 다시 구현해야 할까? 그럴 필요가 없었습니다.

Python에는 `sys.settrace()`라는 CPython 내장 API가 있어서, 코드를 수정하지 않고도 매 줄 실행될 때마다 콜백을 받을 수 있습니다. JavaScript 엔진에서 `__traceLine`을 코드에 삽입하는 것과 같은 효과를 코드 변환 없이 얻는 거죠.

Pyodide는 CPython 인터프리터를 WebAssembly로 컴파일한 것입니다. 브라우저에서 진짜 Python이 돌아가는 거라 `sys.settrace`도 정상 동작합니다. 서버 없이 사용자 브라우저에서 Python을 실행하니까 서버 비용이 0입니다.

핵심 구현 포인트는 세 가지였습니다.

첫째, **사용자 코드와 트레이서 코드의 분리**. `exec(source)`로 실행하면 트레이서 자체의 내부 함수도 `sys.settrace`에 잡힙니다. 이걸 해결하기 위해 사용자 코드를 `compile(source, "<user>", "exec")`로 컴파일했습니다. 이렇게 하면 사용자 코드의 모든 함수가 `co_filename == "<user>"`를 가지게 되고, 트레이서에서 `frame.f_code.co_filename != "<user>"`인 프레임은 무시하면 됩니다.

둘째, **함수가 있는 코드와 없는 코드의 분기**. `def factorial(n): ...`처럼 함수가 있으면, 먼저 트레이서 OFF 상태에서 `exec`으로 함수를 정의하고, 트레이서 ON 상태에서 함수를 호출합니다. 이렇게 해야 소스에 `print(factorial(5))` 같은 top-level 호출이 있어도 이중 실행을 방지할 수 있습니다. 함수가 없는 코드(`a = 1; b = 2`)는 트레이서 ON 상태에서 `exec`을 바로 실행합니다.

셋째, **같은 줄 반복 이벤트 합치기**. 리스트 컴프리헨션 `[x for x in range(10)]`은 한 줄이지만 `sys.settrace`가 반복마다 "line" 이벤트를 발생시킵니다. 같은 줄 번호가 연속으로 나오면 새 step을 만들지 않고 마지막 step의 변수만 업데이트해서 JS 엔진과 동일한 동작을 만들었습니다.

---

## 15. 성능 최적화: Pyodide 로딩 전략

Pyodide의 가장 큰 약점은 초기 로딩 시간입니다. CPython 바이너리(~5MB gzipped)를 CDN에서 다운로드하고 WebAssembly를 컴파일하는 데 2-5초가 걸립니다. 이 대기 시간을 최소화하기 위해 여러 전략을 적용했습니다.

**CDN dns-prefetch + preconnect**. layout.tsx의 `<head>`에 `<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />`와 `<link rel="preconnect" ...>`를 추가해서, 페이지가 로드되는 순간 CDN과의 DNS 조회와 TLS 핸드셰이크를 미리 수행합니다.

**기본 언어가 Python이면 페이지 로드 시 즉시 Worker 초기화**. localStorage에 저장된 기본 언어가 Python이면, 사용자가 코드를 입력하기도 전에 Pyodide Worker를 백그라운드에서 로드합니다. 사용자가 코드를 작성하는 동안 Pyodide가 준비되므로, 실행 버튼을 누를 때는 이미 로드가 끝나있습니다.

**Python 탭 hover 시 preload**. 사용자가 언어 선택 토글에서 Python 버튼 위에 마우스를 올리면 `ensurePyodideWorker()`를 호출해서 로드를 시작합니다. 클릭하기 전에 1-2초 hover하는 동안 다운로드가 시작됩니다.

**영속 Worker 재사용**. Pyodide Worker를 한 번 초기화하면 이후 실행에서 재사용합니다. 매번 Worker를 새로 만들면 5MB를 다시 다운로드해야 하지만, 한 번 로드된 Worker는 즉시 실행 가능합니다.

**immutable 변수 deepcopy 스킵**. `sys.settrace`의 "line" 이벤트에서 매번 `copy.deepcopy()`를 호출하면 성능이 크게 떨어집니다. `int`, `float`, `str`, `bool`, `None` 같은 immutable 타입은 복사할 필요가 없으므로 바로 저장합니다. `deepcopy`는 리스트, 딕셔너리 같은 mutable 타입에만 적용합니다.

이런 최적화들의 결과, 첫 방문 시 Pyodide 로딩 2-3초를 제외하면 일반적인 교육용 코드(100줄 이내, 재귀 깊이 100 이내)의 실행은 1초 이내에 완료됩니다. 두 번째 실행부터는 JavaScript와 거의 동일한 체감 속도입니다.
