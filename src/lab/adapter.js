/**
 * 把 Worker / runner 采集到的原始快照（每步的变量表）转换成可视化步骤。
 * 输出格式和 src/algorithms/*.js 里的 steps 保持一致，所以能直接复用各种 View 组件。
 *
 * 支持五种形态：
 *   tree   二叉树（后端序列化成 {__tree:[层序数组]}）
 *   list   链表（后端序列化成 {__list:[值数组]}）
 *   matrix 二维数组（DP 表、棋盘）
 *   array  一维数组，字符串会按字符摊开成数组
 *   vars   什么都没有时，退化成变量轨迹
 *
 * 还有个细节要处理：用户写交换通常是
 *   const t = a[i]; a[i] = a[j]; a[j] = t;
 * 一条语句一帧的话，动画里只会看到格子"各自变一下"，看不出是交换。
 * 所以这里做一次跨步合并：如果两三步之内两个位置的值正好互换，就合成一帧交换动画。
 */

const PREF = {
  tree: ['root', 'tree', 'node', 'p', 'q'],
  list: ['head', 'l1', 'l2', 'list', 'node', 'pre', 'cur'],
  matrix: ['dp', 'memo', 'table', 'f', 'dist', 'matrix', 'cache', 'dp2'],
  string: ['s', 's1', 's2', 'str', 'text', 'word', 'pattern', 't', 'p'],
  array: ['arr', 'nums', 'a', 'array', 'data', 'list', 'values', 'sequence', 'res', 'ans', 'result', 'last']
}

const POINTER_NAMES = /^(i|j|k|l|r|p|q|lo|hi|left|right|mid|start|end|idx|index|cur|ptr|slow|fast|head|tail|x|y|row|col)$/i

/** 成对的边界变量：画成一段区间高亮（滑窗 / 二分区间） */
const RANGE_PAIRS = [
  ['left', 'right'],
  ['lo', 'hi'],
  ['low', 'high'],
  ['start', 'end'],
  ['begin', 'end'],
  ['l', 'r']
]

function findRange(vars, n) {
  for (const [a, b] of RANGE_PAIRS) {
    const x = vars[a]
    const y = vars[b]
    if (!Number.isInteger(x) || !Number.isInteger(y)) continue
    if (x < 0 || y < 0 || x >= n || y >= n) continue
    if (x > y) continue
    return { from: x, to: y }
  }
  return null
}

/** 一个值属于哪种可视形态 */
function shapeOf(v) {
  if (v && typeof v === 'object') {
    if (Array.isArray(v.__tree)) return 'tree'
    if (Array.isArray(v.__list)) return 'list'
  }
  if (typeof v === 'string') return 'string'
  if (Array.isArray(v)) {
    if (v.length && Array.isArray(v[0])) return 'matrix'
    return 'array'
  }
  return 'scalar'
}

/** 选出这一趟最值得画的那个变量 */
function pickMain(steps) {
  // 关键：记录每个变量"变过几次"。
  // 像「分发糖果」这种题，入参 ratings 每帧都在但从头到尾不变，
  // 真正在动的是辅助数组 left —— 只按出现次数挑就会挑到那个死掉的输入。
  const info = new Map()
  const limit = Math.min(steps.length, 1200)
  for (let i = 0; i < limit; i++) {
    for (const [k, v] of Object.entries(steps[i].vars || {})) {
      const sh = shapeOf(v)
      if (sh === 'scalar') continue
      let cur = info.get(k)
      if (!cur) {
        cur = { shape: sh, count: 0, changes: 0, seen: false, prev: null }
        info.set(k, cur)
      }
      if (cur.shape !== sh) continue
      cur.count++
      if (cur.seen && !sameValue(cur.prev, v)) cur.changes++
      cur.seen = true
      cur.prev = v
    }
  }
  if (!info.size) return null

  for (const shape of ['tree', 'list', 'matrix', 'string', 'array']) {
    let keys = [...info.entries()].filter(([, v]) => v.shape === shape)
    if (!keys.length) continue

    // 数组和矩阵只是"容器"：有在变化的就优先画在变化的那个，
    // 输入数组通常一动不动，盯着它看就是浪费观众时间。
    // 树 / 链表 / 字符串本身就是场景，不做这个过滤。
    if (shape === 'matrix' || shape === 'array') {
      const mutating = keys.filter(([, v]) => v.changes > 0)
      if (mutating.length) keys = mutating
    }

    const hit = PREF[shape].find((name) => keys.some(([k]) => k === name))
    if (hit) return { key: hit, shape }

    // 名字都不典型：矩阵/数组按"变化次数 → 出现次数"排序，其余取第一个
    if (shape === 'matrix' || shape === 'array') {
      const best = [...keys].sort((a, b) => b[1].changes - a[1].changes || b[1].count - a[1].count)[0]
      return { key: best[0], shape }
    }
    return { key: keys[0][0], shape }
  }
  return null
}

/** 成对出现的指针名。只出现一半时（比如单独一个 right 其实是计数器），不当作指针 */
const POINTER_PARTNER = {
  left: 'right',
  right: 'left',
  lo: 'hi',
  hi: 'lo',
  low: 'high',
  high: 'low',
  start: 'end',
  end: 'start',
  begin: 'end',
  l: 'r',
  r: 'l'
}

function isIndexLike(v, n) {
  return Number.isInteger(v) && v >= 0 && v < n
}

function sameValue(a, b) {
  if (a === b) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

function diffArray(prev, cur) {
  if (!prev || !cur || prev.length !== cur.length) return []
  const changed = []
  for (let i = 0; i < cur.length; i++) {
    if (!sameValue(prev[i], cur[i])) changed.push(i)
  }
  return changed
}

function isSwap(prev, cur, changed) {
  if (changed.length !== 2) return false
  const [x, y] = changed
  return sameValue(prev[x], cur[y]) && sameValue(prev[y], cur[x])
}

// ============ 树 ============

function findTreeVars(vars) {
  const found = []
  for (const [key, v] of Object.entries(vars || {})) {
    if (v && typeof v === 'object' && Array.isArray(v.__tree)) {
      found.push({ key, vals: v.__tree })
    }
  }
  return found
}

/** LeetCode 的层序数组 → 二叉树 */
function buildTree(vals) {
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

/** 递归分配水平区间，父节点落在中点 */
function layoutTree(root) {
  const nodes = []
  let nextId = 0

  function walk(node, depth, left, right) {
    if (!node) return -1
    const id = nextId++
    const x = (left + right) / 2
    const n = { id, val: node.val, x, y: depth * 23 + 12, left: -1, right: -1 }
    nodes.push(n)
    n.left = walk(node.left, depth + 1, left, x)
    n.right = walk(node.right, depth + 1, x, right)
    return id
  }

  walk(root, 0, 6, 94)
  return nodes
}

function countNodes(vals) {
  return (vals || []).filter((v) => v !== null && v !== undefined).length
}

function buildTreeSteps(rawSteps) {
  const out = []
  // 主树固定用"见过的最完整那棵"（通常是第一帧的 root）。
  // 递归里每帧的 node 只是当前子树，拿它当主树会导致画面一直在跳。
  let mainVals = null
  let currentVal = null

  for (const s of rawSteps) {
    const vars = s.vars || {}
    const trees = findTreeVars(vars)

    if (trees.length) {
      const biggest = trees.reduce((a, b) => (countNodes(b.vals) > countNodes(a.vals) ? b : a))
      if (!mainVals || countNodes(biggest.vals) > countNodes(mainVals)) {
        mainVals = biggest.vals
      }
      // 比主树小的那棵就是"当前递归到的子树"，取它的根值当高亮节点
      const smaller = trees.filter((t) => countNodes(t.vals) < countNodes(mainVals))
      currentVal = smaller.length ? smaller[0].vals[0] : null
    }

    const nodes = layoutTree(buildTree(mainVals || []))
    const currentId = currentVal === null ? -1 : (nodes.find((n) => n.val === currentVal)?.id ?? -1)

    const scalars = pickScalars(vars, trees.map((t) => t.key))

    const bits = []
    if (currentVal !== null) bits.push(`当前节点 ${currentVal}`)
    for (const [k, v] of Object.entries(scalars)) {
      bits.push(`${k} = ${fmt(v)}`)
      if (bits.length >= 4) break
    }

    out.push({
      view: 'tree',
      line: s.line,
      desc: bits.length ? `第 ${s.line + 1} 行 · ${bits.join('，')}` : `第 ${s.line + 1} 行`,
      nodes,
      current: currentId,
      visited: [],
      vars: scalars
    })
  }
  return out
}

// ============ 链表 ============

function findListVars(vars) {
  const found = []
  for (const [key, v] of Object.entries(vars || {})) {
    if (v && typeof v === 'object' && Array.isArray(v.__list)) {
      found.push({ key, vals: v.__list })
    }
  }
  return found
}

function buildListSteps(rawSteps) {
  const out = []
  // 行顺序固定成第一次出现的顺序，否则变量增删会让画面跳动
  const order = []
  const seen = new Set()

  for (const s of rawSteps) {
    const vars = s.vars || {}
    const lists = findListVars(vars)
    for (const l of lists) {
      if (!seen.has(l.key)) {
        seen.add(l.key)
        order.push(l.key)
      }
    }

    const all = order
      .map((name) => {
        const hit = lists.find((l) => l.key === name)
        return hit ? { name, vals: hit.vals } : null
      })
      .filter((r) => r && r.vals && r.vals.length)

    // 很多链表题里多个变量指向同一条链的不同位置（prev / cur 就是 cur 的尾部），
    // 全都画出来会很乱：能塞进另一条链的行就降级成一个小标签。
    const chains = []
    const badges = []
    for (const row of [...all].sort((a, b) => b.vals.length - a.vals.length)) {
      const host = chains.find((c) => isContiguous(row.vals, c.vals))
      if (host) badges.push({ name: row.name, vals: row.vals, host: host.name })
      else chains.push(row)
    }
    chains.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
    badges.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))

    const scalars = pickScalars(vars, lists.map((l) => l.key))
    const bits = Object.entries(scalars)
      .slice(0, 3)
      .map(([k, v]) => `${k} = ${fmt(v)}`)

    const summary = chains.map((r) => `${r.name} 长度 ${r.vals.length}`).join('，')

    out.push({
      view: 'list',
      line: s.line,
      desc: bits.length ? `第 ${s.line + 1} 行 · ${bits.join('，')}` : summary || `第 ${s.line + 1} 行`,
      rows: chains.slice(0, 3),
      badges: badges.slice(0, 4),
      vars: scalars
    })
  }
  return out
}

/** a 是否是 b 的一段连续子序列（按值比较） */
function isContiguous(a, b) {
  if (!a.length || a.length >= b.length) return false
  for (let i = 0; i + a.length <= b.length; i++) {
    let ok = true
    for (let k = 0; k < a.length; k++) {
      if (!sameValue(a[k], b[i + k])) {
        ok = false
        break
      }
    }
    if (ok) return true
  }
  return false
}

// ============ 矩阵 ============

function buildMatrixSteps(rawSteps, key) {
  const out = []
  let prev = null
  let lastMatrix = null

  for (const s of rawSteps) {
    const vars = s.vars || {}
    const m = vars[key]
    const matrix = Array.isArray(m) && m.length && Array.isArray(m[0]) ? m : lastMatrix
    if (matrix) lastMatrix = matrix

    let cell = null
    for (const [k, v] of Object.entries(vars)) {
      if (k === key) continue
      if (!/^(i|r|row|x)$/i.test(k) || !Number.isInteger(v)) continue
      const colKey = Object.keys(vars).find((n) => n !== k && /^(j|c|col|y)$/i.test(n) && Number.isInteger(vars[n]))
      if (colKey) cell = [v, vars[colKey]]
    }

    const changed = []
    if (prev && matrix) {
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < (matrix[i] || []).length; j++) {
          const before = prev[i] ? prev[i][j] : undefined
          if (before !== matrix[i][j]) changed.push([i, j])
        }
      }
    }

    const scalars = pickScalars(vars, [key])
    let desc
    if (cell) {
      const v = matrix && matrix[cell[0]] ? matrix[cell[0]][cell[1]] : undefined
      desc = `第 ${s.line + 1} 行 · 处理 [${cell[0]}][${cell[1]}]` + (v === undefined ? '' : `（当前 ${fmt(v)}）`)
    } else if (changed.length) {
      const [r, c] = changed[changed.length - 1]
      desc = `填入 [${r}][${c}] = ${fmt(matrix[r][c])}`
    } else {
      const bits = Object.entries(scalars)
        .slice(0, 3)
        .map(([k, v]) => `${k} = ${fmt(v)}`)
      desc = bits.length ? `第 ${s.line + 1} 行 · ${bits.join('，')}` : `第 ${s.line + 1} 行`
    }

    out.push({
      view: 'matrix',
      line: s.line,
      desc,
      matrix: matrix || [],
      cell,
      changed,
      vars: scalars
    })
    prev = matrix
  }
  return out
}

// ============ 一维数组 / 字符串 ============

export function buildVisualSteps(rawSteps) {
  if (!rawSteps || !rawSteps.length) {
    return { ok: false, reason: 'empty', steps: [] }
  }

  const main = pickMain(rawSteps)
  if (!main) {
    const steps = rawSteps.slice(0, 1500).map((s) => ({
      view: 'vars',
      line: s.line,
      desc: describeVars(s.vars),
      vars: s.vars
    }))
    return { ok: true, mode: 'vars', mainKey: null, steps }
  }

  if (main.shape === 'tree') {
    return { ok: true, mode: 'tree', mainKey: main.key, steps: buildTreeSteps(rawSteps) }
  }
  if (main.shape === 'list') {
    return { ok: true, mode: 'list', mainKey: main.key, steps: buildListSteps(rawSteps) }
  }
  if (main.shape === 'matrix') {
    return { ok: true, mode: 'matrix', mainKey: main.key, steps: buildMatrixSteps(rawSteps, main.key) }
  }

  // 字符串按字符摊开，复用数组渲染（指针、区间、交换全都照常工作）
  const mainKey = main.key
  const asArray = (v) => {
    if (typeof v === 'string') return [...v]
    return Array.isArray(v) ? v : []
  }

  const snaps = rawSteps.map((s) => ({
    line: s.line,
    vars: s.vars || {},
    arr: asArray(s.vars?.[mainKey])
  }))

  // 每个快照是"执行这行之前"拍的，所以这一行的效果要看下一帧。
  // 画面显示"执行完这行之后"的状态，代码行 / 解说 / 数组三者才对得上。
  //
  // 交换的三步是 a[i]=tmp → a[j]=a[i] → a[i]=tmp，单看一步只动一格。
  // 所以判定以"这一行执行完"的瞬间为准，再往回找 2~3 帧是否凑成一次互换，
  // 找到就把中间帧吞掉，把"交换"这个动作记在最后一步赋值上。
  const drop = new Array(snaps.length).fill(false)
  const swapAt = new Array(snaps.length).fill(false)
  const swapFrom = new Array(snaps.length).fill(-1)
  const WINDOW = 3
  const lastIdx = snaps.length - 1

  for (let t = 0; t < snaps.length; t++) {
    const before = snaps[t].arr
    const endIdx = Math.min(t + 1, lastIdx)
    const end = snaps[endIdx].arr
    if (!before.length || end.length !== before.length) continue

    const own = diffArray(before, end)
    if (own.length === 2 && isSwap(before, end, own)) {
      swapAt[t] = true
      swapFrom[t] = t
      continue
    }
    if (own.length !== 1) continue // 这一步没动数组，谈不上交换

    for (let k = 2; k <= WINDOW && t - k >= 0; k++) {
      const start = snaps[t - k].arr
      if (start.length !== end.length) continue

      const d = diffArray(start, end)
      if (d.length !== 2 || !isSwap(start, end, d)) continue

      let ok = true
      for (let q = 1; q < k; q++) {
        const mid = diffArray(snaps[t - k + q].arr, snaps[t - k + q - 1].arr)
        if (!mid.every((i) => d.includes(i))) {
          ok = false
          break
        }
      }
      if (ok) {
        for (let q = 1; q < k; q++) drop[t - k + q] = true
        swapAt[t] = true
        swapFrom[t] = t - k
      }
      break
    }
  }

  const out = []
  let prevPointers = {}

  for (let t = 0; t < snaps.length; t++) {
    if (drop[t]) continue

    const before = snaps[t]
    const after = snaps[Math.min(t + 1, snaps.length - 1)]
    const display = after.arr
    // 交换帧要和"交换开始前"比，才看得出是两个位置互换
    const base = swapAt[t] && swapFrom[t] >= 0 ? snaps[swapFrom[t]].arr : before.arr
    const changed = diffArray(base, display)
    const swapped = swapAt[t] && changed.length === 2

    const vars = after.vars
    const scalars = pickScalars(vars, [mainKey])
    const prevScalars = pickScalars(before.vars, [mainKey])

    const candidates = []
    for (const [name, value] of Object.entries(vars)) {
      if (name === mainKey) continue
      if (Array.isArray(value)) continue
      if (POINTER_NAMES.test(name) && isIndexLike(value, display.length)) {
        candidates.push({ name, index: value })
      }
    }
    const names = new Set(candidates.map((p) => p.name))
    const pointers = candidates.filter((p) => {
      const partner = POINTER_PARTNER[p.name.toLowerCase()]
      return !partner || names.has(partner) || names.has(partner.toUpperCase())
    })

    const moved = pointers.filter((p) => prevPointers[p.name] !== p.index)
    const changedVars = Object.entries(scalars)
      .filter(([k, v]) => k in prevScalars && !sameValue(prevScalars[k], v))
      .map(([k]) => k)

    out.push({
      view: 'array',
      line: before.line,
      desc: buildDesc({
        line: before.line,
        prev: base.length ? base : null,
        cur: display,
        changed,
        swapped,
        pointers: moved,
        vars,
        mainKey,
        prevScalars
      }),
      array: display,
      compare: swapped ? [] : changed,
      swap: swapped ? changed : [],
      pointers,
      range: findRange(vars, display.length),
      changedVars,
      vars: scalars
    })

    prevPointers = Object.fromEntries(pointers.map((p) => [p.name, p.index]))
  }

  return { ok: true, mode: 'array', mainKey, steps: out }
}

function buildDesc({ line, prev, cur, changed, swapped, pointers, vars, mainKey, prevScalars = {} }) {
  if (!prev) {
    return `开始执行：${mainKey} = ${fmtArray(cur)}`
  }

  if (swapped && changed.length === 2) {
    const [x, y] = changed
    return `交换了下标 ${x} 和 ${y}：${fmt(cur[x])} ⇄ ${fmt(cur[y])}`
  }

  if (changed.length === 1) {
    const i = changed[0]
    return `下标 ${i} 从 ${fmt(prev[i])} 变成 ${fmt(cur[i])}`
  }

  if (changed.length > 1 && changed.length <= 4) {
    return `下标 ${changed.join('、')} 被更新为 ${changed.map((i) => fmt(cur[i])).join('、')}`
  }

  // 数组这一步没动，但标量在变（比如累积的 ret、计数 right）——这才是这时候的重点
  if (!changed.length) {
    const shifted = Object.entries(vars).filter(
      ([k, v]) =>
        k !== mainKey &&
        !Array.isArray(v) &&
        !(v && typeof v === 'object') &&
        k in prevScalars &&
        !sameValue(prevScalars[k], v)
    )
    if (shifted.length) {
      // 循环下标变化最频繁但信息量最低，排到后面，优先讲结果/累计量
      const isCounter = (k) => /^(i|j|k|idx|index|p|q)$/i.test(k)
      const ordered = [...shifted].sort((a, b) => Number(isCounter(a[0])) - Number(isCounter(b[0])))
      const text = ordered
        .slice(0, 2)
        .map(([k, v]) => `${k} 从 ${fmt(prevScalars[k])} 变成 ${fmt(v)}`)
        .join('，')
      return `第 ${line + 1} 行 · ${text}`
    }
  }

  const bits = []
  for (const p of pointers.slice(0, 3)) bits.push(`${p.name} = ${p.index}`)
  if (!bits.length) {
    for (const [k, v] of Object.entries(vars)) {
      if (k === mainKey) continue
      if (Array.isArray(v) || (v && typeof v === 'object')) continue
      bits.push(`${k} = ${fmt(v)}`)
      if (bits.length >= 3) break
    }
  }

  return bits.length ? `第 ${line + 1} 行：${bits.join('，')}` : `第 ${line + 1} 行`
}

function pickScalars(vars, skipKeys = []) {
  const skip = new Set(skipKeys)
  const out = {}
  for (const [k, v] of Object.entries(vars || {})) {
    if (skip.has(k)) continue
    if (Array.isArray(v)) continue
    if (v && typeof v === 'object') continue
    out[k] = v
  }
  return out
}

function describeVars(vars) {
  const parts = Object.entries(vars || {})
    .slice(0, 5)
    .map(([k, v]) => `${k} = ${fmt(v)}`)
  return parts.length ? parts.join('，') : '（这一步没有可观测的变量）'
}

function fmtArray(a) {
  const head = a.slice(0, 12).map((x) => fmt(x)).join(', ')
  return `[${head}${a.length > 12 ? ', …' : ''}]`
}

function fmt(v) {
  if (v === null) return 'null'
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'object') return '…'
  return String(v)
}
