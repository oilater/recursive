/**
 * Python tracer code as a string, embedded into the Pyodide Worker.
 * Uses sys.settrace() for line-by-line tracing + variable capture + recursion tree.
 */
export const PYTHON_TRACER = `
import sys
import copy
import json
import ast as _ast_module
import types as _types_module

_steps = []
_step_id = 0
_call_stack = []
_root_node = {"id": "root", "label": "", "args": "", "children": [], "status": "completed"}
_node_counter = 0
_recursive_func_name = None
_has_recursion = False
_max_steps = 5000
_last_traced_line = -1
_max_depth = 200
def _find_recursive_func(source):
    """Find top-level func and any recursive func (including nested)."""
    try:
        tree = _ast_module.parse(source)
    except:
        return None, None

    top_func = None
    for node in tree.body:
        if isinstance(node, _ast_module.FunctionDef):
            top_func = node.name
            break

    if not top_func:
        return None, None

    for node in _ast_module.walk(tree):
        if isinstance(node, _ast_module.FunctionDef):
            fn_name = node.name
            for child in _ast_module.walk(node):
                if isinstance(child, _ast_module.Call):
                    if isinstance(child.func, _ast_module.Name) and child.func.id == fn_name:
                        return top_func, fn_name

    return top_func, None

def _safe_value(val, depth=0):
    if depth > 3:
        return str(val)
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        return val if len(val) < 200 else val[:200] + "..."
    if isinstance(val, list):
        return [_safe_value(v, depth + 1) for v in val[:100]]
    if isinstance(val, tuple):
        return [_safe_value(v, depth + 1) for v in val[:100]]
    if isinstance(val, set):
        return [_safe_value(v, depth + 1) for v in sorted(val, key=str)[:100]]
    if hasattr(val, 'items'):
        return dict({str(k): _safe_value(v, depth + 1) for k, v in list(val.items())[:50]})
    try:
        return str(val)
    except:
        return "?"

def _capture_vars(frame):
    result = {}
    for k, v in frame.f_locals.items():
        if k.startswith("_"):
            continue
        if isinstance(v, (_types_module.FunctionType, _types_module.BuiltinFunctionType,
                          _types_module.ModuleType, type)):
            continue
        if callable(v) and not isinstance(v, (list, dict, set, tuple)):
            continue
        try:
            result[k] = _safe_value(copy.deepcopy(v))
        except:
            try:
                result[k] = str(v)
            except:
                result[k] = "?"
    return result

def _get_active_path():
    path = [_root_node["id"]]
    for frame_info in _call_stack:
        path.append(frame_info["node"]["id"])
    return path

def _tracer(frame, event, arg):
    global _step_id, _node_counter, _has_recursion

    if frame.f_code.co_filename != "<user>":
        return _tracer

    fn_name = frame.f_code.co_name

    if _step_id >= _max_steps:
        raise RuntimeError("Step limit exceeded (" + str(_max_steps) + ")")

    if event == "call" and fn_name == _recursive_func_name:
        _has_recursion = True
        _node_counter += 1

        param_names = frame.f_code.co_varnames[:frame.f_code.co_argcount]
        args_str = ", ".join(
            str(_safe_value(frame.f_locals.get(p))) for p in param_names
        )

        node = {
            "id": "node-" + str(_node_counter),
            "label": fn_name,
            "args": args_str,
            "children": [],
            "status": "active",
        }

        if _call_stack:
            _call_stack[-1]["node"]["children"].append(node)
        else:
            _root_node["children"].append(node)

        _call_stack.append({"node": node, "fn": fn_name})

        if len(_call_stack) > _max_depth:
            raise RuntimeError("Recursion depth exceeded (" + str(_max_depth) + ")")

        _steps.append({
            "id": _step_id,
            "type": "call",
            "codeLine": frame.f_lineno,
            "activeNodeId": node["id"],
            "activePath": _get_active_path(),
            "variables": _capture_vars(frame),
            "description": fn_name + "(" + args_str + ")"
        })
        _step_id += 1
        return _tracer

    if event == "return" and fn_name == _recursive_func_name and _call_stack:
        finished = _call_stack.pop()
        finished["node"]["status"] = "completed"

        current_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]

        _steps.append({
            "id": _step_id,
            "type": "return",
            "codeLine": frame.f_lineno,
            "activeNodeId": current_id,
            "activePath": _get_active_path(),
            "variables": _capture_vars(frame),
            "description": "return " + str(_safe_value(arg))
        })
        _step_id += 1
        return _tracer

    if event == "line" and (fn_name != "<module>" or _recursive_func_name is None):
        global _last_traced_line
        line_no = frame.f_lineno

        if line_no == _last_traced_line and _steps:
            _steps[-1]["variables"] = _capture_vars(frame)
        else:
            current_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]
            _steps.append({
                "id": _step_id,
                "type": "call",
                "codeLine": line_no,
                "activeNodeId": current_id,
                "activePath": _get_active_path(),
                "variables": _capture_vars(frame),
                "description": ""
            })
            _step_id += 1
            _last_traced_line = line_no

    return _tracer

def _run_traced(source, args_list):
    global _steps, _step_id, _call_stack, _root_node, _node_counter
    global _recursive_func_name, _has_recursion, _last_traced_line

    _steps = []
    _step_id = 0
    _call_stack = []
    _node_counter = 0
    _has_recursion = False
    _last_traced_line = -1
    _root_node = {"id": "root", "label": "", "args": "", "children": [], "status": "completed"}

    func_name, rec_func_name = _find_recursive_func(source)
    _recursive_func_name = rec_func_name

    if func_name:
        _root_node["label"] = func_name

    console_logs = []

    def _captured_print(*a, **kw):
        text = " ".join(str(x) for x in a)
        console_logs.append({"text": text, "stepIdx": max(0, _step_id - 1)})

    exec_globals = {"print": _captured_print, "__builtins__": __builtins__}

    user_code = compile(source, "<user>", "exec")
    final_return = None

    if func_name:
        # define functions with tracer OFF (skip top-level print etc.)
        exec(user_code, exec_globals)
        if func_name in exec_globals:
            sys.settrace(_tracer)
            try:
                final_return = exec_globals[func_name](*args_list)
            finally:
                sys.settrace(None)
    else:
        # no function — trace the whole source directly
        sys.settrace(_tracer)
        try:
            exec(user_code, exec_globals)
        finally:
            sys.settrace(None)

    return {
        "steps": _steps,
        "tree": _root_node,
        "hasRecursion": _has_recursion,
        "finalReturnValue": _safe_value(final_return),
        "consoleLogs": console_logs,
    }
`;
