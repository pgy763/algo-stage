import { buildInstrumented, inferArgs } from './instrument.js'

const MAX_STEPS = 4000

const TREE_MAX = 300
const LIST_MAX = 200

function listVals(head) {
  const out = []
  let cur = head
  let guard = 0
  while (cur && guard < LIST_MAX) {
    out.push(cur.val)
    cur = cur.next
    guard++
  }
  return out
}

function treeVals(root) {
  const vals = []
  const q = [root]
  let guard = 0
  while (q.length && vals.length < TREE_MAX && guard < 4000) {
    guard++
    const cur = q.shift()
    if (!cur) {
      vals.push(null)
      continue
    }
    vals.push(typeof cur.val === 'object' ? '…' : cur.val)
    q.push(cur.left)
    q.push(cur.right)
  }
  while (vals.length && vals[vals.length - 1] === null) vals.pop()
  return vals
}

function safeClone(v, depth = 0) {
  if (v === null) return null
  const t = typeof v
  if (t === 'number') return Number.isFinite(v) ? v : String(v)
  if (t === 'string') return v.length > 160 ? v.slice(0, 160) + '…' : v
  if (t === 'boolean') return v
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') return undefined
  if (depth > 2) return '…'
  if (Array.isArray(v)) {
    const n = Math.min(v.length, 120)
    const out = new Array(n)
    for (let i = 0; i < n; i++) out[i] = safeClone(v[i], depth + 1)
    return out
  }
  if (t === 'object') {
    // 链表 / 树：转成前端能直接还原的形状，而不是嵌套对象
    if ('val' in v && 'next' in v && !('left' in v)) return { __list: listVals(v) }
    if ('val' in v && 'left' in v && 'right' in v) return { __tree: treeVals(v) }

    const out = {}
    for (const k of Object.keys(v).slice(0, 40)) out[k] = safeClone(v[k], depth + 1)
    return out
  }
  return String(v)
}

function formatError(e) {
  if (!e) return '未知错误'
  let msg = `${e.name || 'Error'}: ${e.message || e}`
  if (e.stack) {
    const line = String(e.stack).split('\n').find((l) => l.includes('<anonymous>'))
    if (line) msg += '\n' + line.trim()
  }
  return msg
}

/** 逐变量求值，任何一个变量抛错（比如 TDZ）只丢它自己 */
const __v = (getter) => {
  try {
    return getter()
  } catch (e) {
    return undefined
  }
}

/** LeetCode 环境自带的节点类，本地补齐 */
const NODE_CLASSES = {
  ListNode: 'class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next } }',
  TreeNode:
    'class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right } }'
}

self.onmessage = (event) => {
  const { code, entry, input, inputKind, extras } = event.data

  const built = buildInstrumented(code, { entry })
  if (!built.ok) {
    self.postMessage({ ok: false, error: built.error, stage: 'parse' })
    return
  }

  const steps = []
  let truncated = false

  const __t = (line, getter) => {
    if (steps.length >= MAX_STEPS) {
      truncated = true
      return
    }
    let raw = {}
    try {
      raw = getter() || {}
    } catch (e) {
      raw = {}
    }
    const vars = {}
    for (const key of Object.keys(raw)) {
      const cloned = safeClone(raw[key])
      if (cloned !== undefined) vars[key] = cloned
    }
    steps.push({ line: line - 1, vars })
  }

  // 前置声明放在同一行，不改变后续行号（否则高亮的代码行会整体偏移）
  const prelude = ['ListNode', 'TreeNode']
    .filter((n) => {
      const used = new RegExp(`\\b${n}\\b`).test(code)
      const defined = new RegExp(`(class|function|var|let|const)\\s+${n}\\b`).test(code)
      return used && !defined
    })
    .map((n) => `var ${n} = __${n};`)
    .join(' ')

  try {
    const factory = new Function(
      '__t',
      '__v',
      '__ListNode',
      '__TreeNode',
      `${prelude ? prelude + ' ' : ''}${built.code}\n;return typeof ${built.entry} === 'function' ? ${built.entry} : null;`
    )
    // 节点类以字符串形式塞进闭包，避免它们被插桩、也不污染行号
    const mkNode = (name) => new Function(`return (${NODE_CLASSES[name]})`)()
    const fn = factory(__t, __v, mkNode('ListNode'), mkNode('TreeNode'))
    if (!fn) {
      self.postMessage({ ok: false, error: `没找到入口函数 ${built.entry}`, stage: 'run' })
      return
    }

    const hasInput = (Array.isArray(input) && input.length) || (typeof input === 'string' && input.length)
    const args = hasInput ? inferArgs(built.paramNames, input, inputKind || 'array', extras || {}) : []
    const started = performance.now()
    const ret = fn(...args)
    const runtimeMs = Math.round((performance.now() - started) * 10) / 10

    self.postMessage({
      ok: true,
      steps,
      truncated,
      entry: built.entry,
      names: built.names,
      paramNames: built.paramNames,
      functions: built.functions,
      runtimeMs,
      // 函数返回什么就带回什么，前端要把它当"答案"显示出来
      result: safeClone(ret)
    })
  } catch (e) {
    self.postMessage({
      ok: false,
      error: formatError(e),
      stage: 'run',
      steps,
      entry: built.entry
    })
  }
}
