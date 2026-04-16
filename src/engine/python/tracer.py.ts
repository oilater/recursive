/**
 * Python tracer code as a string, embedded into the Pyodide Worker.
 * Uses sys.settrace() for line-by-line tracing + variable capture + recursion tree.
 */
export const PYTHON_TRACER = `
import sys
import copy
import json
import ast as _ast_module

_steps = []
_step_id = 0
_call_stack = []
_root_node = {"id": "root", "label": "", "args": "", "children": [], "status": "completed"}
_node_counter = 0
_recursive_func_name = None
_has_recursion = False
_max_steps = 5000
_max_depth = 200

def _detect_recursion(source, func_name):
    """Detect if a function calls itself."""
    try:
        tree = _ast_module.parse(source)
        for node in _ast_module.walk(tree):
            if isinstance(node, _ast_module.FunctionDef) and node.name == func_name:
                for child in _ast_module.walk(node):
                    if isinstance(child, _ast_module.Call):
                        if isinstance(child.func, _ast_module.Name) and child.func.id == func_name:
                            return True
    except:
        pass
    return False

def _find_top_function(source):
    """Find the first top-level function definition."""
    try:
        tree = _ast_module.parse(source)
        for node in tree.body:
            if isinstance(node, _ast_module.FunctionDef):
                return node.name
    except:
        pass
    return None

def _safe_serialize(val, depth=0):
    """Safely serialize a Python value for JSON transfer."""
    if depth > 3:
        return repr(val)
    if val is None or isinstance(val, (bool, int, float, str)):
        return val
    if isinstance(val, (list, tuple)):
        return [_safe_serialize(v, depth + 1) for v in val[:200]]
    if isinstance(val, dict):
        return {str(k): _safe_serialize(v, depth + 1) for k, v in list(val.items())[:50]}
    if isinstance(val, set):
        return [_safe_serialize(v, depth + 1) for v in list(val)[:200]]
    return repr(val)

def _get_active_path():
    path = [_root_node["id"]]
    for frame_info in _call_stack:
        path.append(frame_info["node"]["id"])
    return path

def _tracer(frame, event, arg):
    global _step_id, _node_counter, _has_recursion

    if frame.f_code.co_filename != "<exec>":
        return _tracer

    if _step_id >= _max_steps:
        raise RuntimeError(f"Step limit exceeded ({_max_steps})")

    fn_name = frame.f_code.co_name

    if event == "call" and fn_name == _recursive_func_name:
        _has_recursion = True
        _node_counter += 1
        args_dict = {}
        for k in frame.f_code.co_varnames[:frame.f_code.co_argcount]:
            if k in frame.f_locals:
                args_dict[k] = _safe_serialize(frame.f_locals[k])

        node = {
            "id": f"node-{_node_counter}",
            "label": fn_name,
            "args": ", ".join(f"{v}" for v in args_dict.values()),
            "children": [],
            "status": "active",
        }

        if _call_stack:
            _call_stack[-1]["node"]["children"].append(node)
        else:
            _root_node["children"].append(node)

        _call_stack.append({"node": node, "fn": fn_name})

        if len(_call_stack) > _max_depth:
            raise RuntimeError(f"Recursion depth exceeded ({_max_depth})")

        current_node_id = node["id"]
        active_path = _get_active_path()

        vars_snapshot = {}
        for k, v in frame.f_locals.items():
            if not k.startswith("_"):
                try:
                    vars_snapshot[k] = _safe_serialize(copy.deepcopy(v))
                except:
                    vars_snapshot[k] = repr(v)

        _steps.append({
            "id": _step_id,
            "type": "call",
            "codeLine": frame.f_lineno,
            "activeNodeId": current_node_id,
            "activePath": active_path[:],
            "variables": vars_snapshot,
            "description": f"{fn_name}({node['args']})"
        })
        _step_id += 1

    elif event == "return" and fn_name == _recursive_func_name and _call_stack:
        finished = _call_stack.pop()
        finished["node"]["status"] = "completed"

        current_node_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]
        active_path = _get_active_path()

        _steps.append({
            "id": _step_id,
            "type": "return",
            "codeLine": frame.f_lineno,
            "activeNodeId": current_node_id,
            "activePath": active_path[:],
            "variables": {},
            "description": f"return {_safe_serialize(arg)}"
        })
        _step_id += 1

    elif event == "line":
        current_node_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]
        active_path = _get_active_path()

        vars_snapshot = {}
        for k, v in frame.f_locals.items():
            if not k.startswith("_"):
                try:
                    vars_snapshot[k] = _safe_serialize(copy.deepcopy(v))
                except:
                    vars_snapshot[k] = repr(v)

        _steps.append({
            "id": _step_id,
            "type": "call",
            "codeLine": frame.f_lineno,
            "activeNodeId": current_node_id,
            "activePath": active_path[:],
            "variables": vars_snapshot,
            "description": ""
        })
        _step_id += 1

    return _tracer

def _run_traced(source, args_list):
    global _steps, _step_id, _call_stack, _root_node, _node_counter
    global _recursive_func_name, _has_recursion

    _steps = []
    _step_id = 0
    _call_stack = []
    _node_counter = 0
    _has_recursion = False
    _root_node = {"id": "root", "label": "", "args": "", "children": [], "status": "completed"}

    func_name = _find_top_function(source)
    if func_name:
        _recursive_func_name = func_name if _detect_recursion(source, func_name) else None
        _root_node["label"] = func_name
    else:
        _recursive_func_name = None

    console_logs = []
    original_print = print

    def captured_print(*args, **kwargs):
        text = " ".join(str(a) for a in args)
        console_logs.append({"text": text, "stepIdx": _step_id - 1 if _step_id > 0 else 0})

    exec_globals = {"print": captured_print, "__builtins__": __builtins__}

    sys.settrace(_tracer)
    final_return = None
    try:
        exec(source, exec_globals)
        if func_name and func_name in exec_globals:
            final_return = exec_globals[func_name](*args_list)
    finally:
        sys.settrace(None)

    return {
        "steps": _steps,
        "tree": _root_node,
        "hasRecursion": _has_recursion,
        "finalReturnValue": _safe_serialize(final_return),
        "consoleLogs": console_logs,
    }
`;
