import * as acorn from 'acorn'

/**
 * 把用户代码插桩成"可记录状态"的版本。
 *
 * 思路：用 acorn 解析成 AST，找到每一段语句列表，在每条语句前面插一句
 *   __t(行号, () => ({ i: __v(() => i), j: __v(() => j), arr: __v(() => arr) }));
 * 用字符串插入的方式改回源码，这样原始缩进和注释都能保留。
 *
 * __v 逐变量 try/catch，是为了兼容 TDZ（let 声明后、初始化前访问会抛错）。
 */

const MAX_VARS = 14

/** 通用 AST 遍历（acorn 的 AST 没有环，直接递归即可） */
function visit(node, handler) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) visit(item, handler)
    return
  }
  if (typeof node.type !== 'string') return
  handler(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'range') continue
    visit(node[key], handler)
  }
}

/** 收集所有可观测的变量名（变量声明 + 函数参数） */
function collectNames(ast, functionNames) {
  const names = []
  const seen = new Set()
  visit(ast, (node) => {
    if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier') {
      push(node.id.name)
    }
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      for (const p of node.params || []) {
        if (p.type === 'Identifier') push(p.name)
      }
    }
  })
  function push(name) {
    if (seen.has(name) || functionNames.has(name)) return
    seen.add(name)
    names.push(name)
  }
  return names.slice(0, MAX_VARS)
}

/** 找所有函数声明，用来挑入口 */
function collectFunctions(ast) {
  const fns = []
  visit(ast, (node) => {
    const callsOf = (body) => {
      const set = new Set()
      if (!body) return set
      visit(body, (n) => {
        if (n.type === 'CallExpression' && n.callee) {
          if (n.callee.type === 'Identifier') set.add(n.callee.name)
          else if (n.callee.type === 'MemberExpression' && n.callee.property)
            set.add(n.callee.property.name)
        }
      })
      return set
    }

    if (node.type === 'FunctionDeclaration' && node.id) {
      fns.push({
        name: node.id.name,
        paramCount: (node.params || []).length,
        paramNames: (node.params || []).map((p) => (p.type === 'Identifier' ? p.name : '_')),
        bodyLines: node.body && node.body.body ? node.body.body.length : 0,
        calls: callsOf(node.body)
      })
    }
    if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier' && node.init) {
      const init = node.init
      if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
        fns.push({
          name: node.id.name,
          paramCount: (init.params || []).length,
          paramNames: (init.params || []).map((p) => (p.type === 'Identifier' ? p.name : '_')),
          bodyLines: init.body && init.body.body ? init.body.body.length : 1,
          calls: callsOf(init.body)
        })
      }
    }
  })
  return fns
}

const ENTRY_HINTS = /^(main|solve|start|run|sort|quickSort|mergeSort|bubbleSort|insertionSort|selectionSort|heapSort|binarySearch|search)$/i

function pickEntry(fns) {
  if (!fns.length) return null

  // 被别的函数调用的就是助手（findKthLargest 内部的 quickselect），不能当入口
  const callers = new Map()
  for (const fn of fns) {
    for (const callee of fn.calls || []) {
      if (callee !== fn.name) callers.set(callee, (callers.get(callee) || 0) + 1)
    }
  }

  const useful = fns.filter((f) => f.name !== 'main')
  const base = useful.length ? useful : fns
  const free = base.filter((f) => !callers.get(f.name))
  const pool = free.length ? free : base

  const score = (f) => {
    const arrLike = /^(nums|arr|array|list|grid|matrix|heights|prices|head|root|s|str)$/i.test(
      (f.paramNames || []).join(',')
    )
      ? 1
      : 0
    return (
      ((f.calls ? f.calls.size : 0) > 0 ? 100 : 0) +
      arrLike * 10 +
      (ENTRY_HINTS.test(f.name) ? 5 : 0) +
      f.bodyLines * 0.01
    )
  }

  return [...pool].sort((a, b) => score(b) - score(a))[0]
}

export function buildInstrumented(source, options = {}) {
  let ast
  try {
    ast = acorn.parse(source, { ecmaVersion: 2022, locations: true, allowAwaitOutsideFunction: true })
  } catch (e) {
    return { ok: false, error: `语法错误：${e.message}` }
  }

  const fns = collectFunctions(ast)
  if (!fns.length) {
    return { ok: false, error: '没找到函数。请把算法写成一个函数，比如 function sort(arr) { ... }' }
  }

  const entry = options.entry ? fns.find((f) => f.name === options.entry) || fns[0] : pickEntry(fns)
  const functionNames = new Set(fns.map((f) => f.name))
  const names = collectNames(ast, functionNames)

  const inserts = new Map()
  const add = (pos, text) => {
    if (!inserts.has(pos)) inserts.set(pos, '')
    inserts.set(pos, inserts.get(pos) + text)
  }

  const snap = (line) => {
    if (!names.length) return `__t(${line}, () => ({}));`
    const props = names.map((n) => `${n}: __v(() => ${n})`).join(', ')
    return `__t(${line}, () => ({${props}}));`
  }

  const skipSnap = new Set(['FunctionDeclaration', 'FunctionDeclaration2'])

  const handleList = (statements) => {
    for (const stmt of statements) {
      if (!stmt || !stmt.loc) continue
      if (stmt.type === 'FunctionDeclaration') continue
      add(stmt.start, snap(stmt.loc.start.line))
    }
  }

  const wrapBody = (node, key) => {
    const body = node[key]
    if (!body || !body.loc) return
    if (body.type === 'BlockStatement') return
    // else if 链不能包块，否则语法会变
    if (key === 'alternate' && body.type === 'IfStatement') return
    add(body.start, `{${snap(body.loc.start.line)}`)
    add(body.end, '}')
  }

  visit(ast, (node) => {
    switch (node.type) {
      case 'Program':
        handleList(node.body)
        break
      case 'BlockStatement':
        handleList(node.body)
        break
      case 'SwitchCase':
        handleList(node.consequent || [])
        break
      case 'IfStatement':
        wrapBody(node, 'consequent')
        wrapBody(node, 'alternate')
        break
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
      case 'LabeledStatement':
        wrapBody(node, 'body')
        break
      default:
        break
    }
  })

  // 从后往前插入，保证位置不失效
  const positions = [...inserts.keys()].sort((a, b) => b - a)
  let out = source
  for (const pos of positions) {
    out = out.slice(0, pos) + inserts.get(pos) + out.slice(pos)
  }

  return {
    ok: true,
    code: out,
    entry: entry.name,
    names,
    functions: fns,
    paramCount: entry.paramCount,
    paramNames: entry.paramNames
  }
}

/** 按参数名 + 输入形态推断该怎么传参（和另外四种语言的规则保持一致） */
export function inferArgs(paramNames, input, kind = 'array', extras = {}) {
  const n = paramNames.length
  if (n === 0) return []
  const list = Array.isArray(input) ? input : []
  const joined = paramNames.join(',').toLowerCase()

  const buildTree = (vals) => {
    if (!vals || !vals.length || vals[0] === null) return null
    const root = { val: vals[0], left: null, right: null }
    const q = [root]
    let i = 1
    while (q.length && i < vals.length) {
      const node = q.shift()
      if (i < vals.length) {
        const v = vals[i++]
        if (v !== null && v !== undefined) {
          node.left = { val: v, left: null, right: null }
          q.push(node.left)
        }
      }
      if (i < vals.length) {
        const v = vals[i++]
        if (v !== null && v !== undefined) {
          node.right = { val: v, left: null, right: null }
          q.push(node.right)
        }
      }
    }
    return root
  }

  const buildList = (vals) => {
    let head = null
    let tail = null
    for (const v of vals) {
      if (v === null || v === undefined) break
      const node = { val: v, next: null }
      if (!head) head = node
      else tail.next = node
      tail = node
    }
    return head
  }

  // 第一个参数：按名字判断是树 / 链表 / 字符串，否则按输入形态
  const firstName = (paramNames[0] || '').toLowerCase()
  let first
  if (/root|tree/.test(firstName)) first = buildTree(list)
  else if (/head|l1$|l2$|list/.test(firstName)) first = buildList(list)
  else if (/^(s|str|text|word|p|t|pattern)$/.test(firstName) && kind === 'string') first = input
  else if (kind === 'string') first = input
  else first = input

  if (n === 1) return [first]

  const len = typeof first === 'string' ? first.length : Array.isArray(first) ? first.length : list.length
  const rest = []
  for (let i = 1; i < n; i++) {
    const name = (paramNames[i] || '').toLowerCase()
    if (Object.prototype.hasOwnProperty.call(extras, name)) {
      rest.push(extras[name])
      continue
    }
    // 单字母 / 短名精确匹配：quickselect(nums, l, r, k) 里 l/r 是左右边界
    if (/^(l|i|lo|low|left|start|begin|from|first)$/.test(name)) rest.push(0)
    else if (/^(r|j|hi|high|right|end|last|to)$/.test(name)) rest.push(Math.max(0, len - 1))
    else if (/^(mid|middle|m)$/.test(name)) rest.push(Math.floor(len / 2))
    else if (/target|key|val|value|need|search/.test(name)) {
      rest.push(typeof first === 'string' ? first[Math.floor(len / 2)] || '' : list[Math.floor(list.length / 2)] ?? 0)
    } else rest.push(len)
  }
  return [first, ...rest]
}
