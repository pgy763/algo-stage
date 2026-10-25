"""
Python 追踪器：不插桩，直接用 sys.settrace 抓每一行的局部变量。
用法：python py_tracer.py <code文件> <结果输出> <input JSON> <入口函数名> [kind]

kind: array | string | matrix（不传按 array 处理）
结果写到输出文件（JSON），用户自己的 print 输出走 stdout。
"""
import sys
import json
import re
import io
import inspect
from contextlib import redirect_stdout

MAX_STEPS = 4000

TREE_CLASS = '''
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
'''

LIST_CLASS = '''
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
'''


def _is_tree(v):
    return hasattr(v, "val") and hasattr(v, "left") and hasattr(v, "right")


def _is_list(v):
    return hasattr(v, "val") and hasattr(v, "next") and not hasattr(v, "left")


def safe(v, depth=0):
    if isinstance(v, bool) or isinstance(v, (int, float, str)):
        return v
    if isinstance(v, (list, tuple)):
        if depth > 2:
            return "…"
        return [safe(x, depth + 1) for x in list(v)[:120]]
    if isinstance(v, dict):
        if depth > 2:
            return "…"
        return {str(k): safe(x, depth + 1) for k, x in list(v.items())[:30]}
    # 树 / 链表：序列化成前端能直接还原的形状
    if _is_tree(v):
        return {"__tree": _tree_vals(v)}
    if _is_list(v):
        return {"__list": _list_vals(v)}
    return None


def _tree_vals(root):
    vals = []
    q = [root]
    guard = 0
    while q and len(vals) < 300 and guard < 4000:
        guard += 1
        cur = q.pop(0)
        if cur is None:
            vals.append(None)
            continue
        vals.append(safe(cur.val))
        q.append(getattr(cur, "left", None))
        q.append(getattr(cur, "right", None))
    while vals and vals[-1] is None:
        vals.pop()
    return vals


def _list_vals(head):
    vals = []
    cur = head
    guard = 0
    while cur is not None and guard < 200:
        guard += 1
        vals.append(safe(cur.val))
        cur = getattr(cur, "next", None)
    return vals


def build_tree(cls, vals):
    if not vals or vals[0] is None:
        return None
    root = cls(vals[0])
    q = [root]
    i = 1
    while q and i < len(vals):
        cur = q.pop(0)
        if i < len(vals):
            if vals[i] is not None:
                node = cls(vals[i])
                cur.left = node
                q.append(node)
            i += 1
        if i < len(vals):
            if vals[i] is not None:
                node = cls(vals[i])
                cur.right = node
                q.append(node)
            i += 1
    return root


def build_list(cls, vals):
    head = None
    tail = None
    for v in vals:
        if v is None:
            break
        node = cls(v)
        if head is None:
            head = node
        else:
            tail.next = node
        tail = node
    return head


SHORT_STRING_NAMES = {"s", "t", "p", "l", "s1", "s2", "str", "text", "word", "pattern"}


def pick_kind(name, kind, names):
    """参数名能覆盖输入形态时以名字为准（比如树题的 root，即使输入是数组层序）"""
    low = name.lower()
    if any(k in low for k in ("tree", "root", "node")):
        return "tree"
    if any(k in low for k in ("head", "list")) or low in ("l", "l1", "l2"):
        return "list"
    # 短名字必须精确匹配：以前用 "s" in "nums" 就把数组当成字符串了
    if low in SHORT_STRING_NAMES or any(k in low for k in ("string", "text", "word", "pattern")):
        return "string"
    return kind


def build_args(fn, data, kind, globs, extras=None):
    try:
        sig = inspect.signature(fn)
        params = [p.name for p in sig.parameters.values()]
    except (ValueError, TypeError):
        return [data]

    def node_cls(name, fallback):
        return globs.get(name) or fallback

    extras = extras or {}

    def length():
        if kind == "string":
            return len(data)
        if kind == "matrix":
            return len(data)
        return len(data)

    if kind == "string" and params and re.search(
        r"(arr|nums|list|ratings|prices|height|heights|stones|weights|values)$", params[0], re.I
    ):
        raise TypeError(
            "这个函数要的是数组，但输入被当成了字符串。\n"
            "请填用英文逗号分隔的数字，比如 1,0,2"
        )

    out = []
    for idx, name in enumerate(params):
        k = pick_kind(name, kind, params) if idx == 0 else "scalar"
        low = name.lower()

        if idx == 0:
            if k == "tree":
                out.append(build_tree(globs.get("TreeNode"), data if kind == "array" else []))
            elif k == "list":
                out.append(build_list(globs.get("ListNode"), data if kind == "array" else []))
            elif k == "string" and kind == "string":
                out.append(data)
            else:
                out.append(data)
            continue

        # 输入里显式给了 k=2 这种参数，优先用它
        if name in extras:
            out.append(extras[name])
            continue

        total = length()
        # 单字母 / 短名先精确匹配：l / r 是左右边界，不认就会两个都变成 len
        if low in ("l", "i", "lo", "low", "left", "start", "begin", "from", "first"):
            out.append(0)
            continue
        if low in ("r", "j", "hi", "high", "right", "end", "last", "to"):
            out.append(max(0, total - 1))
            continue
        if low in ("mid", "middle", "m"):
            out.append(total // 2)
            continue

        if any(x in low for x in ("target", "key", "val", "value", "need", "search")):
            if kind == "string":
                out.append(data[total // 2] if total else "")
            elif isinstance(data, list) and total:
                mid = data[total // 2]
                out.append(mid if mid is not None else 0)
            else:
                out.append(0)
        elif any(x in low for x in ("lo", "low", "left", "start", "begin")):
            out.append(0)
        elif any(x in low for x in ("hi", "high", "right", "end", "last")):
            out.append(max(0, total - 1))
        else:
            out.append(total)
    return out


def main():
    code_path, out_path, input_json, entry = sys.argv[1:5]
    kind = sys.argv[5] if len(sys.argv) > 5 else "array"
    extras = json.loads(sys.argv[6]) if len(sys.argv) > 6 else {}
    with open(code_path, encoding="utf-8") as f:
        src = f.read()
    data = json.loads(input_json)

    steps = []
    truncated = [False]
    globs = {"__name__": "__main__", "__file__": "<user>"}

    # LeetCode 环境自带的节点类，本地要自己补齐。
    # Python 是动态类型，签名里看不到 ListNode 这种类型名，所以无条件注入；
    # 用户自己定义的同名类会在后面覆盖掉这里的。
    prefix = TREE_CLASS + "\n" + LIST_CLASS + "\n"

    def tracer(frame, event, arg):
        if event != "line":
            return tracer
        if frame.f_code.co_filename != "<user>":
            return tracer
        if len(steps) >= MAX_STEPS:
            truncated[0] = True
            return tracer
        snap = {}
        for k, v in list(frame.f_locals.items()):
            if k.startswith("__"):
                continue
            s = safe(v)
            if s is not None:
                snap[k] = s
        steps.append({"line": frame.f_lineno - 1, "vars": snap})
        return tracer

    result = {"ok": True}
    buf = io.StringIO()

    try:
        # 注入的节点类单独用 <lib> 文件名编译，这样 settrace 不会把它们的
        # __init__ 当成用户代码来追踪（否则首帧只有 {"val": 1}）
        exec(compile(prefix, "<lib>", "exec"), globs)
        compiled = compile(src, "<user>", "exec")
        exec(compiled, globs)  # 先把函数定义进去，不追踪

        fn = globs.get(entry)
        if fn is None or not callable(fn):
            result = {"ok": False, "error": "没有找到函数 " + entry}

        if result.get("ok"):
            with redirect_stdout(buf):
                sys.settrace(tracer)
                try:
                    ret = fn(*build_args(fn, data, kind, globs, extras))
                finally:
                    sys.settrace(None)
            result["result"] = safe(ret)
            result["entry"] = entry
    except Exception as e:  # noqa: BLE001
        sys.settrace(None)
        result = {"ok": False, "error": "%s: %s" % (type(e).__name__, e), "line": _err_line(e)}

    result["steps"] = steps
    result["stdout"] = buf.getvalue()[:4000]
    result["truncated"] = truncated[0]

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)


def _err_line(e):
    tb = e.__traceback__
    line = None
    while tb:
        if tb.tb_frame.f_code.co_filename == "<user>":
            line = tb.tb_lineno - 1
        tb = tb.tb_next
    return line


if __name__ == "__main__":
    main()
