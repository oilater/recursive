/**
 * Worker 내부에서 실행될 코드를 문자열로 생성합니다.
 *
 * 중첩 재귀 지원:
 * - entryFuncName이 있으면 (예: exist → backtrack)
 *   루트 노드 = exist(...), backtrack 호출들은 자식 노드
 * - entryFuncName이 없으면 (예: fibonacci)
 *   첫 호출이 루트 노드가 됨
 */
export function buildWorkerCode(): string {
  return `
'use strict';

self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.importScripts = undefined;

self.onmessage = function(e) {
  var data = e.data;
  var transformedCode = data.transformedCode;
  var recursiveFuncName = data.recursiveFuncName;
  var entryFuncName = data.entryFuncName;
  var args = data.args;
  var recursiveParamNames = data.recursiveParamNames || [];
  var maxCalls = data.maxCalls || 5000;
  var maxLoopIterations = data.maxLoopIterations || 100000;
  var funcStartLine = data.funcStartLine || 1;
  var funcEndLine = data.funcEndLine || 1;
  var hasEntry = !!entryFuncName;

  var callFuncName = entryFuncName || recursiveFuncName;

  try {
    var steps = [];
    var stepId = 0;
    var nodeIdCounter = 0;
    var callCount = 0;
    var loopCount = 0;
    var callStack = [];
    var firstTopLevelCall = true;

    // 루트 노드 설정
    var rootNode;
    if (hasEntry) {
      // 중첩 패턴: 진입 함수가 루트
      rootNode = {
        id: 'node-' + nodeIdCounter++,
        label: entryFuncName,
        args: formatArgs(args),
        children: [],
        status: 'completed'
      };
    } else {
      // 단일 패턴: 첫 재귀 호출이 루트 (나중에 교체됨)
      rootNode = {
        id: 'node-0',
        label: recursiveFuncName,
        args: '',
        children: [],
        status: 'idle'
      };
      nodeIdCounter++;
    }

    function deepClone(val) {
      if (val === null || val === undefined) return val;
      if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') return val;
      try { return JSON.parse(JSON.stringify(val)); } catch(e) { return String(val); }
    }

    function formatArgs(argsList) {
      return argsList.map(function(a) {
        if (a === undefined) return 'undefined';
        if (a === null) return 'null';
        if (Array.isArray(a)) {
          if (a.length > 8) return '[' + a.slice(0, 3).join(',') + ',...(' + a.length + ')]';
          // 2D array
          if (a.length > 0 && Array.isArray(a[0])) return '[[...]](' + a.length + 'x' + a[0].length + ')';
          return '[' + a.join(',') + ']';
        }
        if (typeof a === 'object') {
          var s = JSON.stringify(a);
          return s.length > 20 ? s.slice(0, 17) + '...' : s;
        }
        return String(a);
      }).join(', ');
    }

    function getPath(stack, nodeId) {
      var path = [];
      if (hasEntry) path.push(rootNode.id);
      for (var i = 0; i < stack.length; i++) path.push(stack[i].nodeId);
      path.push(nodeId);
      return path;
    }

    function __guard() {
      loopCount++;
      if (loopCount > maxLoopIterations) {
        throw new Error('루프 반복 횟수가 ' + maxLoopIterations + '회를 초과했습니다');
      }
    }

    function __createProxy(originalFunc) {
      return new Proxy(originalFunc, {
        apply: function(target, thisArg, argsList) {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error('재귀 호출 횟수가 ' + maxCalls + '회를 초과했습니다. 종료 조건을 확인해주세요.');
          }

          var nodeId = 'node-' + nodeIdCounter++;
          var node = {
            id: nodeId,
            label: recursiveFuncName,
            args: formatArgs(argsList),
            children: [],
            status: 'idle'
          };

          // 부모-자식 연결
          if (callStack.length === 0) {
            if (hasEntry) {
              // 중첩 패턴: 루트(진입 함수)의 자식으로 추가
              rootNode.children.push(node);
            } else if (firstTopLevelCall) {
              // 단일 패턴: 첫 호출이 루트 노드를 교체
              rootNode.id = nodeId;
              rootNode.label = node.label;
              rootNode.args = node.args;
              node = rootNode;
              firstTopLevelCall = false;
            } else {
              // 단일 패턴인데 여러 번 호출? (보통 없지만 안전장치)
              rootNode.children.push(node);
            }
          } else {
            callStack[callStack.length - 1].node.children.push(node);
          }

          var activePath = getPath(callStack, nodeId);

          // 변수 스냅샷
          var variables = {};
          for (var i = 0; i < recursiveParamNames.length; i++) {
            variables[recursiveParamNames[i]] = deepClone(argsList[i]);
          }

          steps.push({
            id: stepId++,
            type: 'call',
            codeLine: funcStartLine,
            activeNodeId: nodeId,
            activePath: activePath.slice(),
            variables: Object.assign({}, variables),
            description: recursiveFuncName + '(' + formatArgs(argsList) + ') 호출'
          });

          callStack.push({ nodeId: nodeId, node: node });

          var result;
          try {
            result = Reflect.apply(target, thisArg, argsList);
          } catch(err) {
            node.status = 'backtracked';
            callStack.pop();
            throw err;
          }

          node.status = 'completed';
          callStack.pop();

          var returnPath = getPath(callStack, nodeId);

          var returnVars = Object.assign({}, variables);
          returnVars['returnValue'] = deepClone(result);

          steps.push({
            id: stepId++,
            type: 'return',
            codeLine: funcEndLine,
            activeNodeId: nodeId,
            activePath: returnPath,
            variables: returnVars,
            description: recursiveFuncName + '(' + formatArgs(argsList) + ') → ' + (result !== undefined ? (typeof result === 'object' ? JSON.stringify(result) : String(result)) : 'undefined')
          });

          return result;
        }
      });
    }

    var runCode = transformedCode + '\\nvar __result = ' + callFuncName + '.apply(null, __args);\\nreturn __result;\\n';
    var runFn = new Function('__guard', '__createProxy', '__args', runCode);
    var finalReturnValue = runFn(__guard, __createProxy, args);

    self.postMessage({
      type: 'success',
      result: { steps: steps, tree: rootNode },
      finalReturnValue: deepClone(finalReturnValue)
    });

  } catch(err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};
`;
}
