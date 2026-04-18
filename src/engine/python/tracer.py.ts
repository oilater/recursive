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

def _capture_closure(fn):
    closure = {}
    if fn.__closure__:
        free_vars = fn.__code__.co_freevars
        for name, cell in zip(free_vars, fn.__closure__):
            try:
                closure[name] = _safe_value(cell.cell_contents)
            except:
                pass
    return closure

def _function_marker(fn):
    argcount = fn.__code__.co_argcount
    params = list(fn.__code__.co_varnames[:argcount])
    return {
        "__kind": "function",
        "funcName": fn.__name__,
        "params": params,
        "closure": _capture_closure(fn),
    }

def _capture_vars(frame):
    result = {}
    for k, v in frame.f_locals.items():
        if k.startswith("_"):
            continue
        if isinstance(v, _types_module.FunctionType):
            result[k] = _function_marker(v)
            continue
        if isinstance(v, (_types_module.BuiltinFunctionType, _types_module.ModuleType, type)):
            continue
        if callable(v) and not isinstance(v, (list, dict, set, tuple)):
            continue
        try:
            if isinstance(v, (int, float, str, bool, type(None))):
                result[k] = v
            else:
                result[k] = _safe_value(copy.deepcopy(v))
        except:
            try:
                result[k] = str(v)
            except:
                result[k] = "?"
    return result

def _frame_label(frame):
    name = frame.f_code.co_name
    return "__entry__" if name == "<module>" else name

def _capture_frames(frame):
    chain = []
    f = frame
    while f is not None:
        if f.f_code.co_filename == "<user>":
            chain.append({
                "funcName": _frame_label(f),
                "variables": _capture_vars(f),
            })
        f = f.f_back
    chain.reverse()
    return chain

def _caller_line(frame):
    f = frame.f_back
    while f is not None:
        if f.f_code.co_filename == "<user>":
            return f.f_lineno
        f = f.f_back
    return None

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

        caller_line = _caller_line(frame)
        step = {
            "id": _step_id,
            "type": "call",
            "codeLine": frame.f_lineno,
            "activeNodeId": node["id"],
            "activePath": _get_active_path(),
            "frames": _capture_frames(frame),
            "description": fn_name + "(" + args_str + ")"
        }
        if caller_line is not None and caller_line != frame.f_lineno:
            step["callerLine"] = caller_line
        _steps.append(step)
        _step_id += 1
        return _tracer

    if event == "return" and fn_name == _recursive_func_name and _call_stack:
        finished = _call_stack.pop()
        finished["node"]["status"] = "completed"

        current_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]

        caller_line = _caller_line(frame)
        step = {
            "id": _step_id,
            "type": "return",
            "codeLine": frame.f_lineno,
            "activeNodeId": current_id,
            "activePath": _get_active_path(),
            "frames": _capture_frames(frame),
            "description": "return " + str(_safe_value(arg))
        }
        if caller_line is not None and caller_line != frame.f_lineno:
            step["callerLine"] = caller_line
        _steps.append(step)
        _step_id += 1
        return _tracer

    if event == "line" and (fn_name != "<module>" or _recursive_func_name is None):
        global _last_traced_line
        line_no = frame.f_lineno

        if line_no == _last_traced_line and _steps:
            _steps[-1]["frames"] = _capture_frames(frame)
        else:
            current_id = _call_stack[-1]["node"]["id"] if _call_stack else _root_node["id"]
            caller_line = _caller_line(frame)
            step = {
                "id": _step_id,
                "type": "call",
                "codeLine": line_no,
                "activeNodeId": current_id,
                "activePath": _get_active_path(),
                "frames": _capture_frames(frame),
                "description": ""
            }
            if caller_line is not None and caller_line != line_no:
                step["callerLine"] = caller_line
            _steps.append(step)
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

    _safe_builtins = {
        k: v for k, v in __builtins__.items()
        if k not in (
            "open", "eval", "exec", "compile", "__import__",
            "globals", "locals", "breakpoint", "exit", "quit",
            "input", "help", "copyright", "credits", "license",
        )
    } if isinstance(__builtins__, dict) else {
        k: getattr(__builtins__, k) for k in dir(__builtins__)
        if k not in (
            "open", "eval", "exec", "compile", "__import__",
            "globals", "locals", "breakpoint", "exit", "quit",
            "input", "help", "copyright", "credits", "license",
        ) and not k.startswith("_")
    }
    _safe_builtins["print"] = _captured_print
    _safe_builtins["__build_class__"] = __builtins__.__build_class__ if hasattr(__builtins__, "__build_class__") else __builtins__["__build_class__"]

    exec_globals = {"__builtins__": _safe_builtins}

    user_code = compile(source, "<user>", "exec")
    final_return = None

    if func_name and args_list:
        # define functions with tracer OFF (skip top-level print etc.)
        exec(user_code, exec_globals)
        if func_name in exec_globals:
            sys.settrace(_tracer)
            try:
                final_return = exec_globals[func_name](*args_list)
            finally:
                sys.settrace(None)

            # add final step with return value
            if _steps:
                last_line = _steps[-1]["codeLine"]
                last_frames = [dict(f) for f in _steps[-1]["frames"]]
                _steps.append({
                    "id": _step_id,
                    "type": "call",
                    "codeLine": last_line,
                    "activeNodeId": _root_node["id"],
                    "activePath": [_root_node["id"]],
                    "frames": last_frames,
                    "description": ""
                })
                _step_id += 1
    else:
        # no function — trace the whole source directly
        sys.settrace(_tracer)
        try:
            exec(user_code, exec_globals)
        finally:
            sys.settrace(None)

        # capture final variable state after last line
        if _steps:
            final_vars = {}
            for k, v in exec_globals.items():
                if k.startswith("_") or k == "__builtins__":
                    continue
                if isinstance(v, _types_module.FunctionType):
                    final_vars[k] = _function_marker(v)
                    continue
                if isinstance(v, (_types_module.BuiltinFunctionType, _types_module.ModuleType, type)):
                    continue
                if callable(v) and not isinstance(v, (list, dict, set, tuple)):
                    continue
                try:
                    if isinstance(v, (int, float, str, bool, type(None))):
                        final_vars[k] = v
                    else:
                        final_vars[k] = _safe_value(copy.deepcopy(v))
                except:
                    final_vars[k] = str(v)

            last_line = _steps[-1]["codeLine"]
            _steps.append({
                "id": _step_id,
                "type": "call",
                "codeLine": last_line,
                "activeNodeId": _root_node["id"],
                "activePath": [_root_node["id"]],
                "frames": [{"funcName": "__entry__", "variables": final_vars}],
                "description": ""
            })
            _step_id += 1

    return {
        "steps": _steps,
        "tree": _root_node,
        "hasRecursion": _has_recursion,
        "finalReturnValue": _safe_value(final_return),
        "consoleLogs": console_logs,
    }
`;
