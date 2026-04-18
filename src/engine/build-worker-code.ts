export function buildWorkerCode(): string {
  return `
'use strict';
self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.importScripts = undefined;
self.WebSocket = undefined;
self.EventSource = undefined;

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
  var maxSteps = data.maxSteps || 10000;
  var lineOffset = data.lineOffset || 0;
  var userFunc = data.userTopLevelFuncName;
  var entryOwnVarNames = data.entryOwnVarNames || [];

  try {
    var steps = [];
    var stepId = 0;
    var nodeIdCounter = 0;
    var callCount = 0;
    var loopCount = 0;
    var callStack = [];

    var rootNode = {
      id: 'node-' + nodeIdCounter++,
      label: userFunc || entryFuncName,
      args: formatArgs(args),
      children: [],
      status: 'completed'
    };

    callStack.push({ funcName: entryFuncName, variables: {}, ownVarNames: entryOwnVarNames });

    var closureMap = new WeakMap();

    function deepClone(val) {
      if (val === null || val === undefined) return val;
      if (typeof val === 'function') {
        var fnMeta = closureMap.get(val);
        var closure = {};
        if (fnMeta && fnMeta.snapshot) {
          for (var ck in fnMeta.snapshot) {
            if (fnMeta.snapshot.hasOwnProperty(ck)) closure[ck] = deepClone(fnMeta.snapshot[ck]);
          }
        }
        return {
          __kind: 'function',
          funcName: (fnMeta && fnMeta.funcName) || val.name || 'anonymous',
          params: (fnMeta && fnMeta.paramNames) || [],
          closure: closure
        };
      }
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

    function getPath(activeNodeId) {
      var path = [];
      if (hasRecursion && rootNode.children.length > 0) path.push(rootNode.id);
      for (var i = 0; i < callStack.length; i++) {
        if (callStack[i].nodeId) path.push(callStack[i].nodeId);
      }
      if (activeNodeId && path[path.length - 1] !== activeNodeId) path.push(activeNodeId);
      return path;
    }

    function __guard() {
      loopCount++;
      if (loopCount > maxLoopIterations) {
        throw new Error('Loop iteration limit exceeded (' + maxLoopIterations + ').');
      }
    }

    var originalLineCount = data.originalLineCount || 9999;

    // Frames are replaced (not mutated), so a slice keeps each step's view stable.
    function snapshotFrames() {
      return callStack.slice();
    }

    function cloneFrame(frame) {
      var copy = {
        funcName: frame.funcName,
        variables: {},
        ownVarNames: frame.ownVarNames,
        lastLine: frame.lastLine,
      };
      for (var k in frame.variables) {
        if (frame.variables.hasOwnProperty(k)) copy.variables[k] = frame.variables[k];
      }
      if (frame.nodeId) { copy.nodeId = frame.nodeId; copy.node = frame.node; }
      return copy;
    }

    function ownerFrameIndex(varName, fromIdx) {
      for (var i = fromIdx; i >= 0; i--) {
        var owns = callStack[i].ownVarNames;
        if (owns && owns.indexOf(varName) !== -1) return i;
      }
      return -1;
    }

    function emitReturnStep() {
      if (steps.length >= maxSteps) return;
      if (callStack.length === 0) return;
      var topIdx = callStack.length - 1;
      var top = callStack[topIdx];
      var line = top.lastLine;
      if (typeof line !== 'number') return;

      var currentNodeId = null;
      for (var j = topIdx; j >= 0; j--) {
        if (callStack[j].nodeId) { currentNodeId = callStack[j].nodeId; break; }
      }
      if (!currentNodeId) currentNodeId = rootNode.id;

      steps.push({
        id: stepId++,
        type: 'return',
        codeLine: line,
        activeNodeId: currentNodeId,
        activePath: getPath(currentNodeId),
        frames: snapshotFrames(),
        description: ''
      });
    }

    function __traceLine(line, varsSnapshot) {
      if (steps.length >= maxSteps) {
        throw new Error('Step limit exceeded (' + maxSteps + '). Try smaller input.');
      }
      var correctedLine = line - lineOffset;
      if (correctedLine < 1 || correctedLine > originalLineCount) return;

      var topIdx = callStack.length - 1;
      var modified = {};

      function getOrClone(idx) {
        if (modified[idx]) return modified[idx];
        var clone = cloneFrame(callStack[idx]);
        modified[idx] = clone;
        return clone;
      }

      if (varsSnapshot) {
        for (var k in varsSnapshot) {
          if (!varsSnapshot.hasOwnProperty(k)) continue;
          var ownerIdx = ownerFrameIndex(k, topIdx);
          if (ownerIdx === -1) ownerIdx = topIdx;
          getOrClone(ownerIdx).variables[k] = deepClone(varsSnapshot[k]);
        }
      }

      var topClone = getOrClone(topIdx);
      topClone.lastLine = correctedLine;

      for (var idx in modified) {
        if (modified.hasOwnProperty(idx)) callStack[idx] = modified[idx];
      }
      var top = callStack[topIdx];

      var currentNodeId = null;
      for (var j = callStack.length - 1; j >= 0; j--) {
        if (callStack[j].nodeId) { currentNodeId = callStack[j].nodeId; break; }
      }
      if (!currentNodeId) currentNodeId = rootNode.id;

      var callerLine;
      if (topIdx > 0) {
        var parentFrame = callStack[topIdx - 1];
        if (typeof parentFrame.lastLine === 'number' && parentFrame.lastLine !== correctedLine) {
          callerLine = parentFrame.lastLine;
        }
      }

      steps.push({
        id: stepId++,
        type: 'call',
        codeLine: correctedLine,
        callerLine: callerLine,
        activeNodeId: currentNodeId,
        activePath: getPath(currentNodeId),
        frames: snapshotFrames(),
        description: ''
      });
    }

    function __createProxy(originalFunc, funcName, paramNames, ownVarNames, captureClosureFn) {
      funcName = funcName || (hasRecursion ? recursiveFuncName : (originalFunc.name || 'anonymous'));
      paramNames = paramNames || (hasRecursion ? recursiveParamNames : []);
      ownVarNames = ownVarNames || paramNames;

      var proxy = new Proxy(originalFunc, {
        apply: function(target, thisArg, argsList) {
          callCount++;
          if (callCount > maxCalls) {
            throw new Error('Function call count exceeded ' + maxCalls + ' calls.');
          }

          var nodeId = null;
          var node = null;
          if (hasRecursion && funcName === recursiveFuncName) {
            nodeId = 'node-' + nodeIdCounter++;
            node = {
              id: nodeId,
              label: funcName,
              args: formatArgs(argsList),
              children: [],
              status: 'idle'
            };
            var parentNode = rootNode;
            for (var p = callStack.length - 1; p >= 0; p--) {
              if (callStack[p].node) { parentNode = callStack[p].node; break; }
            }
            parentNode.children.push(node);
          }

          var seedVars = {};
          for (var i = 0; i < paramNames.length; i++) {
            seedVars[paramNames[i]] = deepClone(argsList[i]);
          }
          var frame = { funcName: funcName, variables: seedVars, ownVarNames: ownVarNames };
          if (nodeId) { frame.nodeId = nodeId; frame.node = node; }
          callStack.push(frame);

          var result;
          try {
            result = Reflect.apply(target, thisArg, argsList);
          } catch(err) {
            if (node) node.status = 'backtracked';
            callStack.pop();
            emitReturnStep();
            throw err;
          }

          if (node) node.status = 'completed';
          callStack.pop();
          emitReturnStep();
          return result;
        }
      });

      var meta = { funcName: funcName, paramNames: paramNames, snapshot: null };
      if (typeof captureClosureFn === 'function') {
        try {
          var snapshot = captureClosureFn();
          if (snapshot && typeof snapshot === 'object') meta.snapshot = snapshot;
        } catch (e) {}
      }
      closureMap.set(proxy, meta);

      return proxy;
    }

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

    var runCode;
    var hasArgs = userFunc && args.length > 0;
    if (hasArgs) {
      runCode = transformedCode + '\\nvar __fn = __entry__();\\nreturn __fn.apply(null, __args);\\n';
    } else {
      runCode = transformedCode + '\\n__entry__();\\n';
    }
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
