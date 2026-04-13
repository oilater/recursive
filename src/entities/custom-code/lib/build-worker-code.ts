/**
 * 범용 코드 추적 Worker.
 *
 * 두 가지 추적 레이어:
 * 1. __traceLine(line, vars) — 모든 코드에서 라인 단위 실행 추적 + 변수 스냅샷
 * 2. __createProxy (선택) — 재귀 함수가 있을 때만 호출 트리 빌드
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
  var entryFuncName = data.entryFuncName;
  var args = data.args;
  var hasRecursion = data.hasRecursion;
  var recursiveFuncName = data.recursiveFuncName;
  var recursiveParamNames = data.recursiveParamNames || [];
  var maxCalls = data.maxCalls || 5000;
  var maxLoopIterations = data.maxLoopIterations || 100000;
  var funcStartLine = data.funcStartLine || 1;
  var funcEndLine = data.funcEndLine || 1;
  var lineOffset = data.lineOffset || 0;

  try {
    var steps = [];
    var stepId = 0;
    var nodeIdCounter = 0;
    var callCount = 0;
    var loopCount = 0;
    var callStack = [];

    // 트리 루트 (재귀 있을 때만 의미 있음)
    var rootNode = {
      id: 'node-' + nodeIdCounter++,
      label: hasRecursion ? (recursiveFuncName || entryFuncName) : entryFuncName,
      args: formatArgs(args),
      children: [],
      status: 'completed'
    };

    function deepClone(val) {
      if (val === null || val === undefined) return val;
      if (typeof val === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
      if (typeof val !== 'object') return val;
      if (Array.isArray(val)) return val.map(deepClone);
      try { return JSON.parse(JSON.stringify(val)); } catch(e) { return String(val); }
    }

    function formatArgs(argsList) {
      return argsList.map(function(a) {
        if (a === undefined) return 'undefined';
        if (a === null) return 'null';
        if (Array.isArray(a)) {
          if (a.length > 8) return '[' + a.slice(0, 3).join(',') + ',...(' + a.length + ')]';
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
      if (hasRecursion && rootNode.children.length > 0) path.push(rootNode.id);
      for (var i = 0; i < stack.length; i++) path.push(stack[i].nodeId);
      if (nodeId) path.push(nodeId);
      return path;
    }

    function __guard() {
      loopCount++;
      if (loopCount > maxLoopIterations) {
        throw new Error('루프 반복 횟수가 ' + maxLoopIterations + '회를 초과했습니다');
      }
    }

    // ── 라인 추적 (모든 코드에서 동작) ──
    function __traceLine(line, varsSnapshot) {
      var currentNodeId = callStack.length > 0 ? callStack[callStack.length - 1].nodeId : rootNode.id;
      var activePath = callStack.length > 0 ? getPath(callStack, currentNodeId) : [rootNode.id];

      var variables = {};
      if (varsSnapshot) {
        for (var k in varsSnapshot) {
          if (varsSnapshot.hasOwnProperty(k)) {
            variables[k] = deepClone(varsSnapshot[k]);
          }
        }
      }

      steps.push({
        id: stepId++,
        type: 'call',
        codeLine: Math.max(1, line - lineOffset),
        activeNodeId: currentNodeId,
        activePath: activePath.slice(),
        variables: variables,
        description: '라인 ' + Math.max(1, line - lineOffset) + ' 실행'
      });
    }

    // ── 재귀 Proxy (재귀가 있을 때만 사용) ──
    function __createProxy(originalFunc) {
      if (!hasRecursion) return originalFunc;

      return new Proxy(originalFunc, {
        apply: function(target, thisArg, argsList) {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error('재귀 호출 횟수가 ' + maxCalls + '회를 초과했습니다.');
          }

          var nodeId = 'node-' + nodeIdCounter++;
          var node = {
            id: nodeId,
            label: recursiveFuncName,
            args: formatArgs(argsList),
            children: [],
            status: 'idle'
          };

          // 부모 연결
          if (callStack.length === 0) {
            rootNode.children.push(node);
          } else {
            callStack[callStack.length - 1].node.children.push(node);
          }

          var activePath = getPath(callStack, nodeId);
          var variables = {};
          for (var i = 0; i < recursiveParamNames.length; i++) {
            variables[recursiveParamNames[i]] = deepClone(argsList[i]);
          }

          steps.push({
            id: stepId++,
            type: 'call',
            codeLine: Math.max(1, funcStartLine - lineOffset),
            activeNodeId: nodeId,
            activePath: activePath.slice(),
            variables: variables,
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
            codeLine: Math.max(1, funcEndLine - lineOffset),
            activeNodeId: nodeId,
            activePath: returnPath,
            variables: returnVars,
            description: recursiveFuncName + '(' + formatArgs(argsList) + ') → ' + (result !== undefined ? (typeof result === 'object' ? JSON.stringify(result) : String(result)) : 'undefined')
          });

          return result;
        }
      });
    }

    // console.log 캡처 — 각 로그를 직전 stepId에 연결
    var consoleLogs = [];
    var fakeConsole = {
      log: function() {
        var args = Array.prototype.slice.call(arguments);
        var text = args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ');
        consoleLogs.push({ text: text, stepIdx: stepId - 1 });
      },
      warn: function() { fakeConsole.log.apply(null, arguments); },
      error: function() { fakeConsole.log.apply(null, arguments); },
      info: function() { fakeConsole.log.apply(null, arguments); }
    };

    // 항상 __entry__() 호출. 사용자 함수 호출은 __entry__ 안에 이미 삽입됨.
    var runCode = transformedCode + '\\nreturn __entry__();\\n';
    var runFn = new Function('__guard', '__createProxy', '__traceLine', '__args', 'console', runCode);
    var finalReturnValue = runFn(__guard, __createProxy, __traceLine, args, fakeConsole);

    self.postMessage({
      type: 'success',
      result: { steps: steps, tree: rootNode },
      finalReturnValue: deepClone(finalReturnValue),
      consoleLogs: consoleLogs
    });

  } catch(err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};
`;
}
