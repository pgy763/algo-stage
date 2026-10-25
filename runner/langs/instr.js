/**
 * C/C++ 与 Java 共用的"按行插桩"工具。
 *
 * 两个难点：
 * 1. 作用域：不能引用当前不可见的变量，否则编译不过 → 维护一个 scope 栈
 * 2. 类体：Java 的字段声明也在 {} 里，插桩会变成非法语句 → 标记 class 作用域并跳过
 */

const KEYWORD_BLOCK = /^(for|while|if|else|do|switch|case|default|try|catch|finally|synchronized)\b/
const CLASS_OPEN = /^\s*(?:public\s+|private\s+|protected\s+|static\s+|final\s+|abstract\s+)*(?:class|interface|enum|struct)\b/

/** 这一行适合在开头插一条 trace 吗 */
function shouldTrace(line) {
  const t = line.trim()
  if (!t) return false
  if (/^(\/\/|\*|\/\*|#|@)/.test(t)) return false
  if (t.startsWith('}')) return false
  if (/^else\b/.test(t)) return false
  // if 判断本身也值得记一帧，不然看不到"比较"这个动作
  // （for/while 不能这么干：循环变量在语句之后才可见）
  if (/^if\s*\(/.test(t)) return true
  if (!t.endsWith(';')) return false
  if (KEYWORD_BLOCK.test(t)) return false
  return true
}

/** 找出这一行里"同一语句声明的所有变量"（int a = 0, b = 0; 第二个也不能漏） */
function extraDeclared(line) {
  const names = []
  let depth = 0
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) {
      // 逗号后面跟一个标识符，且再往后是 = , ; 才算声明（排除枚举、模板参数等）
      const m = line.slice(i + 1).match(/^\s*([A-Za-z_]\w*)\s*(?=[=,;])/)
      if (m) names.push(m[1])
    }
  }
  return names
}

/** 从一行里找出新声明的变量名 */
function findDeclared(line, declRe) {
  const names = []
  // 函数/方法签名：没有 ; 和 =，以 ) 或 { 结尾
  const isSignature = !/[;=]/.test(line) && /\)\s*\{?\s*$/.test(line)
  declRe.lastIndex = 0
  let m
  while ((m = declRe.exec(line)) !== null) {
    const name = m[1]
    const after = line.slice(m.index + m[0].length)
    // "名字(" 通常说明这是函数名，但容器的构造函数式声明也长这样：
    //   vector<int> dp(rows, vector<int>(cols, 0));
    // 用"整行是不是签名"来区分
    if (/^\s*\(/.test(after) && isSignature) continue
    names.push(name)
  }
  // 有声明才继续找同一条语句里的后续变量，避免把 foo(a, b) 的实参当成变量
  if (names.length) {
    for (const n of extraDeclared(line)) {
      if (!names.includes(n)) names.push(n)
    }
  }
  return names
}

export function instrumentBraced(code, { declRe, call, maxVars = 12 }) {
  const lines = code.split('\n')
  // 每一层作用域：{ kind: 'block' | 'class', vars: Set }
  const scopes = [{ kind: 'block', vars: new Set() }]
  const out = []

  // 单语句循环/分支（for (...) x++; 没有花括号）的变量只在这条语句里可见，
  // 下一行就要销毁。不处理会让后面的 trace 引用到已失效的 i。
  let popAfterLine = 0

  // 类体里的字段不能算"所有方法都看得见"：静态方法引用实例字段会编译失败
  const visible = () => {
    const all = new Set()
    for (const s of scopes) {
      if (s.kind === 'class') continue
      for (const v of s.vars) all.add(v)
    }
    return [...all]
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const lineNo = i + 1
    const popNow = popAfterLine
    popAfterLine = 0

    // 1. 行首的 } 先闭合上一层
    const leadingClose = (raw.match(/^\s*\}/g) || []).length
    for (let k = 0; k < leadingClose && scopes.length > 1; k++) scopes.pop()

    // 2. 插桩
    //    - 全局作用域不插：那里只有声明，插了没意义，C++ 还会把它当成函数声明
    //    - 类体这一层不插：Java 的字段声明插了会变成非法语句
    const scopeKind = scopes[scopes.length - 1].kind
    const skipScope = scopes.length === 1 || scopeKind === 'class'
    if (!skipScope && shouldTrace(raw)) {
      const vars = visible().slice(0, maxVars)
      const indent = (raw.match(/^\s*/) || [''])[0]
      const snippet = call(lineNo, vars)
      if (snippet) out.push(`${indent}${snippet}`)
    }
    out.push(raw)

    // 3. 上一行那种"单语句循环"的变量到这里就该失效了（必须先弹，再压本行的作用域）
    if (popNow && !/^\s*\}/.test(raw) && scopes.length > 1) scopes.pop()

    // 4. 处理本行的 { 和 }
    const opens = (raw.match(/\{/g) || []).length
    const closes = (raw.match(/\}/g) || []).length - leadingClose
    const declared = findDeclared(raw, declRe)

    if (opens > 0) {
      const kind = CLASS_OPEN.test(raw) ? 'class' : 'block'
      const vars = new Set(declared)
      scopes.push({ kind, vars })
      for (let k = 1; k < opens; k++) {
        scopes.push({ kind: 'block', vars: new Set() })
      }
    } else if (/^\s*(for|while|if|else|switch|case)\b/.test(raw) && declared.length) {
      // 单语句控制结构：变量只在这条语句内可见。
      // 语句体就在同一行（for (...) x++;）时，这一行结束就该销毁。
      const inlineBody = /\)\s*[^{]*;\s*$/.test(raw)
      if (!inlineBody) {
        scopes.push({ kind: 'block', vars: new Set(declared) })
        popAfterLine = 1
      }
    } else if (declared.length) {
      const top = scopes[scopes.length - 1]
      for (const d of declared) top.vars.add(d)
    }

    for (let k = 0; k < Math.max(0, closes); k++) {
      if (scopes.length > 1) scopes.pop()
    }
  }

  return out.join('\n')
}

/** 从声明所在行开始，按大括号配对取出整个函数体（用于判断谁调用了谁） */
function extractBody(lines, startLine) {
  const out = []
  let depth = 0
  let opened = false
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i]
    out.push(line)
    for (const ch of line) {
      if (ch === '{') {
        depth++
        opened = true
      } else if (ch === '}') {
        depth--
      }
    }
    if (opened && depth <= 0) break
    // 只有声明没跟大括号（比如分号结尾）时别把整个文件吞进去
    if (!opened && i - startLine >= 2) break
  }
  return out.join('\n')
}

/** 找函数定义（返回 名字 + 参数串 + 函数体） */
export function findFunctions(code, lang) {
  const lines = code.split('\n')
  const fns = []
  const skip = /^\s*(if|for|while|switch|catch|return|else|do|case|new|throw)\b/

  const patterns =
    lang === 'java'
      ? [/^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?[\w<>[\], ]+?\s+(\w+)\s*\(([^)]*)\)\s*\{?\s*$/]
      : [/^\s*[A-Za-z_][\w:<>*&,\s]*?[\s*&]\s*(\w+)\s*\(([^)]*)\)\s*\{?\s*$/]

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i]
    if (!t.trim() || skip.test(t) || /^\s*(#|\/\/|\*|\/\*|@)/.test(t)) continue
    for (const re of patterns) {
      const m = t.match(re)
      if (m && m[1]) {
        // 同名的重复声明（比如先声明后定义）只留一次
        if (!fns.some((f) => f.name === m[1])) {
          // 声明行里名字前面那段就是返回类型（int* / void / std::vector<int> …）
          const namePos = m.index + Math.max(0, m[0].indexOf(`${m[1]}(`) >= 0
            ? m[0].indexOf(`${m[1]}(`)
            : m[0].lastIndexOf(m[1]))
          const ret = t.slice(0, namePos).replace(/\b(public|private|protected|static|final|inline|constexpr)\b/g, '').trim()
          fns.push({
            name: m[1],
            params: m[2].split(',').map((s) => s.trim()).filter(Boolean),
            ret,
            line: i,
            body: extractBody(lines, i)
          })
        }
        break
      }
    }
  }
  return fns
}

/**
 * 挑入口函数。
 *
 * 同一份代码里常常有好几个方法：LeetCode 那种 `findKthLargest` 里再调
 * `quickselect` 的写法，第一个声明的往往只是助手。按声明顺序取第一个会
 * 把助手当入口——参数对不上，函数第一行就 return 了，动画只有一帧。
 *
 * 规则：被别的函数调用过的排除，剩下的里面优先挑「自己会调用别人」的那个
 * （它是编排者），其次看参数里有没有数组、参数个数少不少。
 */
export function pickEntry(fns, prefer) {
  if (!fns.length) return null
  if (prefer) {
    const hit = fns.find((f) => f.name === prefer)
    if (hit) return prefer
  }

  const calls = new Map()
  for (const fn of fns) {
    const set = new Set()
    for (const other of fns) {
      if (other.name === fn.name) continue // 自身递归不算
      if (new RegExp(`\\b${other.name}\\s*\\(`).test(fn.body || '')) set.add(other.name)
    }
    calls.set(fn.name, set)
  }

  const callers = new Map()
  for (const set of calls.values()) {
    for (const callee of set) callers.set(callee, (callers.get(callee) || 0) + 1)
  }

  const free = fns.filter((f) => !callers.get(f.name))
  const pool = free.length ? free : fns

  const score = (f) => {
    const arrLike = /\[\s*\]|\b(nums|arr|array|list|grid|matrix|heights|prices|stones|ratings)\b/i.test(
      f.params.join(',')
    )
      ? 1
      : 0
    return (calls.get(f.name).size > 0 ? 100 : 0) + arrLike * 10 - f.params.length * 0.1
  }

  return [...pool].sort((a, b) => score(b) - score(a))[0].name
}
