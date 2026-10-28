/**
 * 并查集（Union-Find / 朋友圈）
 *
 * 每个元素只记一个数字："我的上级是谁"。自己是自己的上级 = 我是这个圈子的代表（根）。
 * 两个圈子合并，只要把一棵树的根挂到另一棵的根下面 —— O(1)。
 * 路径压缩是它真正的杀手锏：查一次，顺手把整条链拍平，之后接近 O(1)。
 */
const N = 8

export default {
  id: 'union-find',
  name: '并查集：朋友圈',
  en: 'Union-Find (Disjoint Set Union)',
  category: '图与搜索',
  level: '进阶',
  view: 'array',
  complexity: { time: '接近 O(1)（带路径压缩）', space: 'O(n)' },
  summary: '每个人只记住自己的上级，根节点代表整个圈子。合并就是挂树，查询顺手把路径拍平。',
  inputType: 'none',
  code: [
    'function union(x, y) {',
    '  const rx = find(x)',
    '  const ry = find(y)',
    '  if (rx === ry) return false      // 本来就是一个圈子',
    '  parent[rx] = ry                  // 把一棵树挂到另一棵下面',
    '  return true',
    '}',
    '',
    'function find(x) {',
    '  while (parent[x] !== x) {',
    '    parent[x] = parent[parent[x]]  // 路径压缩：顺手跳到爷爷',
    '    x = parent[x]',
    '  }',
    '  return x',
    '}'
  ],

  run() {
    const parent = Array.from({ length: N }, (_, i) => i)
    const steps = []

    const roots = () => parent.map((p, i) => (p === i ? i : -1)).filter((i) => i >= 0)
    const snap = (o) =>
      steps.push({
        view: 'array',
        array: [...parent],
        sorted: roots(),
        aux: parent.map((_, i) => i === parent[i] ? '根' : `→${parent[i]}`),
        auxLabel: '每个格子存的是「上级」',
        ...o
      })

    snap({
      line: 0,
      desc: `8 个人，一开始谁也不认识谁：每个人都指向自己，所以每个人都是一个独立的圈子（绿色 = 根）。`,
      action: { icon: '🌱', label: '初始化' }
    })

    /** 找到 x 的根，顺便把路径拍平 */
    const find = (x, who) => {
      const chain = [x]
      let cur = x
      while (parent[cur] !== cur) {
        snap({
          line: 9,
          desc: `${who}：${cur} 指向 ${parent[cur]}，不是根，继续往上。整条链：${chain.join(' → ')}。`,
          compare: [...chain],
          pointers: [{ name: 'x', index: cur }],
          action: { icon: '🔍', label: '查找' }
        })
        cur = parent[cur]
        chain.push(cur)
      }

      snap({
        line: 13,
        desc: `${who}：${chain.join(' → ')} —— ${cur} 指向自己，它就是根。这个圈子的人都归 ${cur} 管。`,
        compare: [...chain],
        pointers: [{ name: '根', index: cur }],
        action: { icon: '🎯', label: '找到根' }
      })

      // 路径压缩：把链上每个人都直接挂到根下面
      for (const node of chain.slice(0, -1)) {
        if (parent[node] === cur) continue
        parent[node] = cur
        snap({
          line: 10,
          desc: `路径压缩：把 ${node} 直接挂到根 ${cur} 下面。下次再找 ${node} 就只要一步，不用重走老路。`,
          pointers: [
            { name: '根', index: cur },
            { name: '改', index: node }
          ],
          action: { icon: '🗜️', label: '压缩' }
        })
      }

      return cur
    }

    const union = (x, y) => {
      snap({
        line: 0,
        desc: `合并 ${x} 和 ${y} 的圈子：先各自找到自己的根，根相同就说明已经是一家人了。`,
        pointers: [
          { name: 'x', index: x },
          { name: 'y', index: y }
        ],
        action: { icon: '🔗', label: '合并' }
      })

      const rx = find(x, `${x} 找根`)
      const ry = find(y, `${y} 找根`)

      if (rx === ry) {
        snap({
          line: 3,
          desc: `${x} 和 ${y} 的根都是 ${rx} —— 本来就在一个圈子里，什么都不用做。`,
          pointers: [{ name: '根', index: rx }],
          action: { icon: '✅', label: '无需合并' }
        })
        return
      }

      parent[rx] = ry
      snap({
        line: 4,
        desc: `两个根不一样 → 把 ${rx} 这棵树挂到 ${ry} 下面。一次赋值，两个圈子就并成了一个。`,
        pointers: [
          { name: '改', index: rx },
          { name: '新父', index: ry }
        ],
        action: { icon: '🔗', label: '合并' }
      })
    }

    union(0, 1)
    union(2, 3)
    union(1, 3) // 这一步会发现 1 和 3 各自带着一个圈子
    union(4, 5)
    union(6, 7)
    union(5, 7)

    snap({
      line: 0,
      desc: `现在的链条已经很深了：0 → 1 → 3、4 → 5 → 7。下面查一次 0 和 4 的根，顺便看看路径压缩怎么把链拍平。`,
      action: { icon: '👀', label: '看现状' }
    })

    const r1 = find(0, '0 找根')
    const r4 = find(4, '4 找根')
    snap({
      line: 0,
      desc: `查 0 和 4：根分别是 ${r1} 和 ${r4}，不同 → 不是朋友。并查集判断"是不是一个圈子"就靠这个，一次查询几乎 O(1)。`,
      pointers: [
        { name: '0', index: 0 },
        { name: '4', index: 4 }
      ],
      action: { icon: '❓', label: '判断' }
    })

    snap({
      line: 4,
      desc: `最后还有 ${roots().length} 个圈子（根 ${roots().join('、')}）。全程只动了 parent 数组，没有建图：这就是并查集在连通性问题里又快又省的原因。`,
      action: { icon: '🏁', label: '完成' }
    })

    return { steps, result: { circles: roots().length } }
  }
}