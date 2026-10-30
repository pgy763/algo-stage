/**
 * 拓扑排序（Kahn 算法）
 *
 * 这类问题用文字最难讲清的是"为什么这个节点现在还不能做"。
 * 所以每个节点右上角直接挂一个入度角标：它每减少 1，就代表一个前置完成了；
 * 减到 0 的瞬间入队 —— 这是整个算法唯一的心跳。
 */
const NODES = ['A', 'B', 'C', 'D', 'E', 'F']
const EDGES = [
  ['A', 'C'],
  ['B', 'C'],
  ['B', 'D'],
  ['C', 'E'],
  ['D', 'E'],
  ['E', 'F']
]

// 分层布局：层号 = 从起点出发的最长路径，所以箭头永远从上往下
const POS = {
  A: [22, 12],
  B: [78, 12],
  C: [22, 37],
  D: [78, 37],
  E: [50, 62],
  F: [50, 87]
}

export default {
  id: 'topo-sort',
  name: '拓扑排序（Kahn）',
  en: 'Topological Sort',
  category: '图与搜索',
  level: '进阶',
  view: 'tree',
  complexity: { time: 'O(V+E)', space: 'O(V)' },
  summary: '反复挑出「入度为 0」的节点（没有前置任务）开工，做完就把它指向的节点入度减 1，减到 0 就入队。',
  inputType: 'none',
  code: [
    'function topoSort(nodes, edges) {',
    '  const indeg = new Map(nodes.map((n) => [n, 0]))',
    '  for (const [u, v] of edges) indeg.set(v, indeg.get(v) + 1)',
    '',
    '  // 入度为 0 = 没有前置，可以直接开工',
    '  const queue = nodes.filter((n) => indeg.get(n) === 0)',
    '  const order = []',
    '',
    '  while (queue.length) {',
    '    const u = queue.shift()',
    '    order.push(u)',
    '    for (const v of outEdges(u)) {',
    '      indeg.set(v, indeg.get(v) - 1)   // u 做完了，v 少一个前置',
    '      if (indeg.get(v) === 0) queue.push(v)',
    '    }',
    '  }',
    '',
    '  // 有环时不可能排完，长度对不上就是环',
    '  return order.length === nodes.length ? order : null',
    '}'
  ],

  run() {
    const idx = new Map(NODES.map((n, i) => [n, i]))
    const adj = new Map(NODES.map((n) => [n, []]))
    const indeg = new Map(NODES.map((n) => [n, 0]))
    for (const [u, v] of EDGES) {
      adj.get(u).push(v)
      indeg.set(v, indeg.get(v) + 1)
    }

    const consumed = new Set() // 已消耗的边，画成绿色
    const queue = []
    const order = []
    const steps = []

    const snap = (o) =>
      steps.push({
        view: 'tree',
        directed: true,
        nodes: NODES.map((name, i) => ({
          id: i,
          val: name,
          x: POS[name][0],
          y: POS[name][1],
          sub: indeg.get(name)
        })),
        edges: EDGES.map(([u, v], i) => ({
          from: idx.get(u),
          to: idx.get(v),
          done: consumed.has(i)
        })),
        visited: order.map((n) => idx.get(n)),
        // 队列里的节点画成青色描边 —— 旁白里说的"在队列里"必须真画出来
        stack: queue.map((n) => idx.get(n)),
        order: [...order],
        ...o
      })

    snap({
      line: 0,
      desc: `${NODES.length} 个任务，箭头 A → C 读作「C 依赖 A」：A 没做完，C 就不能开工。右上角的小数字是**入度** —— 还有几个前置没完成。`,
      current: -1
    })

    snap({
      line: 2,
      desc: `先数一遍入边：A、B 头上没有箭头（入度 0），可以立刻开工；C 有两条（A、B），E 有两条（C、D），F 一条，D 一条。`,
      current: -1
    })

    for (const n of NODES) if (indeg.get(n) === 0) queue.push(n)
    snap({
      line: 5,
      desc: `把入度为 0 的 ${queue.join('、')} 放进队列（青色描边 = 在队列里，随时可以取）。`,
      current: -1
    })

    let round = 0
    while (queue.length) {
      round++
      const u = queue.shift()
      snap({
        line: 9,
        desc: `第 ${round} 轮：队首 ${u} 出队。它已经没有任何前置了，所以现在就能开工。`,
        current: idx.get(u)
      })

      order.push(u)
      snap({
        line: 10,
        desc: `${u} 加入结果（绿色）。接下来要把它指出去的每条边都"还掉"。`,
        current: idx.get(u)
      })

      const outs = adj.get(u)
      if (!outs.length) {
        snap({
          line: 11,
          desc: `${u} 没有出边 —— 它是终点任务，后面没人依赖它，这一轮直接结束。`,
          current: idx.get(u)
        })
      }

      for (const v of outs) {
        const before = indeg.get(v)
        const edgeIndex = EDGES.findIndex(([a, b]) => a === u && b === v)
        consumed.add(edgeIndex)
        indeg.set(v, before - 1)

        snap({
          line: 12,
          desc: `${u} 做完了 → 依赖它的 ${v} 少一个前置：入度 ${before} → ${before - 1}。这条边变绿，表示已经还清。`,
          current: idx.get(u)
        })

        if (indeg.get(v) === 0) {
          queue.push(v)
          snap({
            line: 13,
            desc: `${v} 的入度归零 → 它的所有前置都完成了，入队。注意：入度角标变绿的那一刻才是"能开工"的信号。`,
            current: idx.get(v)
          })
        } else if (before - 1 > 0) {
          snap({
            line: 13,
            desc: `${v} 还剩 ${before - 1} 个前置没完成，先不动它。`,
            current: idx.get(v)
          })
        }
      }
    }

    snap({
      line: 18,
      desc: `队列空了，排序完成：[${order.join(' → ')}]。全程每个节点进出队列各一次、每条边看一次，所以是 O(V+E)。`,
      current: -1
    })

    snap({
      line: 18,
      desc: `补一句它最有用的地方：如果结果是 null（排不完），说明图里有环 —— 比如 A 依赖 B、B 又依赖 A，这种"死锁"用拓扑排序一跑就能发现。`,
      current: -1
    })

    return { steps, result: order }
  }
}