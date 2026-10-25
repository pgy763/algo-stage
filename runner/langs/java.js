import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { instrumentBraced, findFunctions, pickEntry } from './instr.js'

const exec = promisify(execFile)

/** 先按 UTF-8 读，出现替换字符就说明其实是 GBK */
function decodeAuto(buf) {
  if (!buf || !buf.length) return ''
  const utf8 = Buffer.from(buf).toString('utf8')
  return utf8.includes('\uFFFD') ? decodeGbk(buf) : utf8
}

/** javac 在 Windows 上输出 GBK，直接按 utf8 读会变成乱码 */
function decodeGbk(buf) {
  if (!buf || !buf.length) return ''
  try {
    return new TextDecoder('gbk').decode(buf)
  } catch {
    return Buffer.from(buf).toString('utf8')
  }
}

const DECL_RE =
  /\b(?:int|long|short|double|float|char|boolean|byte|String|Integer|Long|Double|TreeNode|ListNode|Node|List\s*<[^>]*>|ArrayList\s*<[^>]*>|Map\s*<[^>]*>)\s*(?:\[\s*\]\s*)*\s+([A-Za-z_]\w*)/g

const MAIN_TEMPLATE = `import java.lang.reflect.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        String entry = __ENTRY__;
        Integer[] nums = __NUMS__;
        Integer[][] grid = __GRID__;
        String text = __TEXT__;
        java.util.Map<String, Integer> extras = new java.util.HashMap<>();
__EXTRAS__

        Class<?> cls = Class.forName(__CLASS__);
        Method target = null;
        for (Method m : cls.getDeclaredMethods()) {
            if (m.getName().equals(entry) && !m.isSynthetic()) { target = m; break; }
        }
        if (target == null) {
            System.out.println("@@ERR@@没有找到方法 " + entry + "，请检查方法名是否写对");
            return;
        }
        target.setAccessible(true);

        Class<?> treeCls = null;
        Class<?> listCls = null;
        try { treeCls = Class.forName("TreeNode"); } catch (Throwable ignore) {}
        try { listCls = Class.forName("ListNode"); } catch (Throwable ignore) {}

        int len = nums != null ? nums.length : (text != null ? text.length() : (grid != null ? grid.length : 0));
        Class<?>[] types = target.getParameterTypes();
        Parameter[] params = target.getParameters();
        Object[] callArgs = new Object[types.length];

        // 输入形态和参数类型对不上时，先说清楚，别拿空数组硬跑出一个 0
        boolean needArr = false, needMat = false, needStr = false;
        for (Class<?> t : types) {
            if (t == int[].class || t == long[].class || t == double[].class || t == Integer[].class) needArr = true;
            if (t == char[].class || t == String.class || t == CharSequence.class) needStr = true;
            if (t == int[][].class || t == char[][].class) needMat = true;
        }
        if (needArr && nums == null) {
            System.out.println("@@ERR@@这个方法要的是数组，但输入被当成"
                    + (text != null ? "字符串（" + (text.length() > 20 ? text.substring(0, 20) + "…" : text) + "）" : "空值")
                    + "。请填用英文逗号分隔的数字，比如 1,0,2（中文逗号我也认，但别再混字母）");
            return;
        }
        if (needMat && grid == null) {
            System.out.println("@@ERR@@这个方法要二维数组（int[][]）。输入请写成 [[1,2],[3,4]] 或 1,2; 3,4");
            return;
        }
        if (needStr && text == null) {
            System.out.println("@@ERR@@这个方法要字符串参数，把字符串直接填进输入框就行，比如 abcabcbb");
            return;
        }

        for (int i = 0; i < types.length; i++) {
            Class<?> t = types[i];
            String name = params[i].isNamePresent() ? params[i].getName().toLowerCase() : "";

            if (t == int[].class) {
                callArgs[i] = toIntArray(nums);
            } else if (t == long[].class) {
                callArgs[i] = toLongArray(nums);
            } else if (t == double[].class) {
                callArgs[i] = toDoubleArray(nums);
            } else if (t == Integer[].class) {
                callArgs[i] = nums;
            } else if (t == char[].class) {
                callArgs[i] = text != null ? text.toCharArray() : new char[0];
            } else if (t == int[][].class) {
                callArgs[i] = toIntMatrix(grid);
            } else if (t == char[][].class) {
                callArgs[i] = toCharMatrix(grid, text);
            } else if (t == String.class || t == CharSequence.class) {
                callArgs[i] = text != null ? text : "";
            } else if (t == char.class || t == Character.class) {
                callArgs[i] = text != null && !text.isEmpty() ? text.charAt(len / 2)
                        : (nums != null && len > 0 && nums[len / 2] != null ? (char) (int) nums[len / 2] : 'a');
            } else if (treeCls != null && t.equals(treeCls)) {
                callArgs[i] = buildTree(nums, treeCls);
            } else if (listCls != null && t.equals(listCls)) {
                callArgs[i] = buildList(nums, listCls);
            } else if (t == int.class || t == Integer.class) {
                Integer ex = extras.get(name);
                callArgs[i] = ex != null ? ex : scalarInt(name, nums, text, len);
            } else if (t == long.class || t == Long.class) {
                Integer ex = extras.get(name);
                callArgs[i] = (long) (ex != null ? ex : scalarInt(name, nums, text, len));
            } else if (t == double.class || t == Double.class) {
                Integer ex = extras.get(name);
                callArgs[i] = (double) (ex != null ? ex : scalarInt(name, nums, text, len));
            } else if (t == boolean.class || t == Boolean.class) {
                callArgs[i] = false;
            } else if (List.class.isAssignableFrom(t)) {
                callArgs[i] = nums != null ? new ArrayList<>(Arrays.asList(nums)) : new ArrayList<>();
            } else {
                System.out.println("@@ERR@@第 " + (i + 1) + " 个参数的类型是 " + t.getSimpleName()
                        + "，实验台支持 int[]/long[]/double[]/char[]/String/int[][]/char[][]/TreeNode/ListNode 以及基本类型。");
                return;
            }
        }

        Object instance = Modifier.isStatic(target.getModifiers())
                ? null
                : cls.getDeclaredConstructor().newInstance();
        Object ret = target.invoke(instance, callArgs);
        if (ret != null) {
            System.out.println("@@RET@@" + Trace.json(ret));
        }
    }

    /** 标量按参数名推断，规则和另外四种语言保持一致 */
    static int scalarInt(String name, Integer[] nums, String text, int len) {
        String n = name.toLowerCase();
        // 单字母 / 短名先精确匹配：quickselect(nums, l, r, k) 里 l/r 是左右边界，
        // 认不出来就两个都退化成 len，「if (l == r)」直接成立，函数第一行就 return
        if (n.matches("l|i|lo|low|left|start|begin|from|first|a|p")) return 0;
        if (n.matches("r|j|hi|high|right|end|last|to|b|q")) return Math.max(0, len - 1);
        if (n.matches("mid|middle|m")) return len / 2;
        if (name.matches(".*(target|key|val|value|need|search).*")) {
            if (nums != null && len > 0) return nums[len / 2] == null ? 0 : nums[len / 2];
            return text != null ? text.charAt(len / 2) : 0;
        }
        if (n.matches("l|lo|low|left|start|begin|i")) return 0;
        if (n.matches("r|hi|high|right|end|last|j")) return Math.max(0, len - 1);
        return len;
    }

    static int[] toIntArray(Integer[] vals) {
        if (vals == null) return new int[0];
        int[] out = new int[vals.length];
        for (int i = 0; i < vals.length; i++) out[i] = vals[i] == null ? 0 : vals[i];
        return out;
    }

    static long[] toLongArray(Integer[] vals) {
        if (vals == null) return new long[0];
        long[] out = new long[vals.length];
        for (int i = 0; i < vals.length; i++) out[i] = vals[i] == null ? 0 : vals[i];
        return out;
    }

    static double[] toDoubleArray(Integer[] vals) {
        if (vals == null) return new double[0];
        double[] out = new double[vals.length];
        for (int i = 0; i < vals.length; i++) out[i] = vals[i] == null ? 0 : vals[i];
        return out;
    }

    static int[][] toIntMatrix(Integer[][] grid) {
        if (grid == null) return new int[0][0];
        int[][] out = new int[grid.length][];
        for (int i = 0; i < grid.length; i++) out[i] = toIntArray(grid[i]);
        return out;
    }

    static char[][] toCharMatrix(Integer[][] grid, String text) {
        if (grid != null) {
            char[][] out = new char[grid.length][];
            for (int i = 0; i < grid.length; i++) {
                Integer[] row = grid[i];
                out[i] = new char[row.length];
                for (int j = 0; j < row.length; j++) {
                    out[i][j] = row[j] == null ? ' ' : (char) (int) row[j];
                }
            }
            return out;
        }
        if (text == null) return new char[0][0];
        return new char[][]{ text.toCharArray() };
    }

    static Object buildTree(Integer[] vals, Class<?> cls) throws Exception {
        if (vals == null || vals.length == 0 || vals[0] == null) return null;
        Constructor<?> ctor = cls.getConstructor(int.class);
        Field fLeft = cls.getField("left");
        Field fRight = cls.getField("right");
        Object root = ctor.newInstance(vals[0]);
        Deque<Object> q = new ArrayDeque<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < vals.length) {
            Object cur = q.poll();
            if (i < vals.length) {
                Integer v = vals[i++];
                if (v != null) {
                    Object l = ctor.newInstance(v);
                    fLeft.set(cur, l);
                    q.add(l);
                }
            }
            if (i < vals.length) {
                Integer v = vals[i++];
                if (v != null) {
                    Object r = ctor.newInstance(v);
                    fRight.set(cur, r);
                    q.add(r);
                }
            }
        }
        return root;
    }

    static Object buildList(Integer[] vals, Class<?> cls) throws Exception {
        if (vals == null || vals.length == 0) return null;
        Constructor<?> ctor = cls.getConstructor(int.class);
        Field fNext = cls.getField("next");
        Object head = null;
        Object tail = null;
        for (Integer v : vals) {
            if (v == null) break;
            Object node = ctor.newInstance(v);
            if (head == null) head = node;
            else fNext.set(tail, node);
            tail = node;
        }
        return head;
    }
}
`

const TREE_NODE_CLASS = `public class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;

    public TreeNode() {}

    public TreeNode(int val) {
        this.val = val;
    }

    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
`

const LIST_NODE_CLASS = `public class ListNode {
    public int val;
    public ListNode next;

    public ListNode() {}

    public ListNode(int val) {
        this.val = val;
    }

    public ListNode(int val, ListNode next) {
        this.val = val;
        this.next = next;
    }
}
`

/** Java 里字符串字面量要转义 */
function javaString(s) {
  return (
    '"' +
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') +
    '"'
  )
}

function numsLiteral(arr) {
  if (!Array.isArray(arr) || !arr.length) return 'null'
  return `new Integer[]{${arr.map((v) => (v === null || v === undefined ? 'null' : v)).join(', ')}}`
}

function gridLiteral(grid) {
  if (!Array.isArray(grid) || !grid.length) return 'null'
  const rows = grid.map((r) => `{${r.map((v) => (v === null || v === undefined ? 'null' : v)).join(', ')}}`)
  return `new Integer[][]{${rows.join(', ')}}`
}

export async function runJava({ code, input, inputKind, inputRaw, extras, entry, dir }) {
  const classMatch = code.match(/(?:^|\n)\s*(?:public\s+)?(?:final\s+)?class\s+(\w+)/)
  const hasClass = !!classMatch
  const className = hasClass ? classMatch[1] : 'UserCode'

  // 用户只贴了方法时，包一层类
  const userSource = hasClass ? code : `public class ${className} {\n${code}\n}`

  // 用了 TreeNode / ListNode 但没自己定义 → 自动补一个，省得用户从 LeetCode 里翻
  const needsTreeNodeClass = /\bTreeNode\b/.test(code) && !/class\s+TreeNode\b/.test(code)
  const needsListNodeClass = /\bListNode\b/.test(code) && !/class\s+ListNode\b/.test(code)

  const fns = findFunctions(userSource, 'java')
  // main 不算入口（它是驱动，参数还是 String[]）
  const candidates = fns.filter((f) => f.name !== 'main')
  const entryName = pickEntry(candidates.length ? candidates : fns, entry)
  if (!entryName) {
    return {
      ok: false,
      error: '没能识别出方法。请把算法写成一个方法，比如 void bubbleSort(int[] arr) { ... }'
    }
  }

  const instrumented = instrumentBraced(userSource, {
    declRe: DECL_RE,
    call: (line, vars) =>
      vars.length ? `Trace.t(${line}${vars.map((v) => `, "${v}", ${v}`).join('')});` : `Trace.t(${line});`
  })

  const arr = inputKind === 'matrix' ? null : Array.isArray(input) ? input : null
  const grid = inputKind === 'matrix' && Array.isArray(input) ? input : null
  // 字符串参数：优先用用户原样输入（"123" 这种纯数字串也能保真）
  const str =
    inputKind === 'string'
      ? typeof input === 'string'
        ? input
        : String(inputRaw || '')
      : inputRaw && inputRaw.trim()
        ? inputRaw.trim()
        : null

  const extraLines = Object.entries(extras || {})
    .map(([k, v]) => `        extras.put(${JSON.stringify(String(k).toLowerCase())}, ${Number(v)});`)
    .join('\n')

  const mainSrc = MAIN_TEMPLATE.replace('__EXTRAS__', extraLines)
    .replace('__ENTRY__', JSON.stringify(entryName))
    .replace('__CLASS__', JSON.stringify(className))
    .replace('__NUMS__', numsLiteral(arr))
    .replace('__GRID__', gridLiteral(grid))
    .replace('__TEXT__', str === null ? 'null' : javaString(str))

  const here = path.dirname(fileURLToPath(import.meta.url))
  await fs.writeFile(path.join(dir, `${className}.java`), instrumented, 'utf8')
  await fs.writeFile(path.join(dir, 'Main.java'), mainSrc, 'utf8')
  await fs.copyFile(path.join(here, 'Trace.java'), path.join(dir, 'Trace.java'))

  const extraFiles = []
  if (needsTreeNodeClass) {
    await fs.writeFile(path.join(dir, 'TreeNode.java'), TREE_NODE_CLASS, 'utf8')
    extraFiles.push('TreeNode.java')
  }
  if (needsListNodeClass) {
    await fs.writeFile(path.join(dir, 'ListNode.java'), LIST_NODE_CLASS, 'utf8')
    extraFiles.push('ListNode.java')
  }

  const compileArgs = [
    '-parameters', '-encoding', 'UTF-8', '-nowarn', '-d', 'classes',
    `${className}.java`, 'Trace.java', 'Main.java', ...extraFiles
  ]

  try {
    await exec('javac', compileArgs, { cwd: dir, timeout: 60000, maxBuffer: 4 * 1024 * 1024 })
  } catch {
    let msg = ''
    try {
      const rb = await exec('javac', compileArgs, {
        cwd: dir,
        timeout: 60000,
        encoding: 'buffer',
        maxBuffer: 4 * 1024 * 1024
      })
      msg = decodeGbk(rb.stderr)
    } catch (e2) {
      msg = decodeGbk(e2.stderr) || e2.message || ''
    }
    return { ok: false, error: '编译失败：\n' + msg.slice(0, 1500) }
  }

  let stdout = ''
  try {
    const r = await exec(
      'java',
      ['-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-cp', 'classes', 'Main'],
      { cwd: dir, timeout: 6000, maxBuffer: 8 * 1024 * 1024, encoding: 'buffer' }
    )
    stdout = decodeAuto(r.stdout)
  } catch (e) {
    if (e.killed || e.signal) {
      return { ok: false, error: '运行超过 6 秒被终止，检查是不是有循环没有退出条件。' }
    }
    stdout = decodeAuto(e.stdout)
    if (!stdout) return { ok: false, error: '运行出错：' + (decodeAuto(e.stderr) || e.message || '').slice(0, 800) }
  }

  const steps = []
  const userOut = []
  let runtimeError = null
  let ret = null
  for (const line of stdout.split('\n')) {
    if (line.startsWith('@@T@@')) {
      try {
        steps.push(JSON.parse(line.slice(5)))
      } catch {
        /* 跳过坏行 */
      }
    } else if (line.startsWith('@@RET@@')) {
      try {
        ret = JSON.parse(line.slice(7))
      } catch {
        ret = line.slice(7)
      }
    } else if (line.startsWith('@@ERR@@')) {
      runtimeError = line.slice(7)
    } else if (line.trim()) {
      userOut.push(line)
    }
  }

  if (runtimeError) return { ok: false, error: runtimeError }

  return {
    ok: true,
    steps,
    entry: entryName,
    className,
    result: ret,
    stdout: userOut.join('\n').slice(0, 2000),
    truncated: steps.length >= 4000
  }
}
