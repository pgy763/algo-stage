/**
 * Trie（前缀树）
 *
 * 和 BST 正好是一对：BST 靠"大小关系"决定往左还是往右，
 * Trie 靠"下一个字符是什么"决定走哪条边 —— 一个节点可以有 26 个孩子。
 * 好处是所有共享前缀的词只存一份，"查前缀"变成沿着边走。
 */
const WORDS = ['cat', 'car', 'card', 'dog']

export default {
  id: 'trie',
  name: 'Trie 前缀树',
  en: 'Trie (Prefix Tree)',
  category: '树',
  level: '进阶',
  view: 'tree',
  complexity: { time: '插入 / 查询 O(L)（L 是词长）', space: 'O(总字符数)' },
  summary: '每个节点代表一个字符，从根到某节点的路径就是一个前缀。共享前缀的词共用一条路，查前缀只要顺着走。',
  inputType: 'none',
  code: [
    'function insert(word) {',
    '  let node = root',
    '  for (const ch of word) {',
    '    if (!node.children.has(ch)) {',
    '      node.children.set(ch, { children: new Map(), end: false })',
    '    }',
    '    node = node.children.get(ch)',
    '  }',
    '  node.end = true              // 这个词到这儿结束',
    '}',
    '',
    'function search(word) {',
    '  let node = root',
    '  for (const ch of word) {',
    '    if (!node.children.has(ch)) return false   // 路断了：没有这个词',
    '    node = node.children.get(ch)',
    '  }',
    '  return node.end',
    '}'
  ],

  run() {
    const root = { id: 0, ch: '·', kids: [], end: false }
    let nextId = 1
    const steps = []
    const inserted = []

    /** 中序分配 x（叶子均匀铺开，父节点取孩子中点），按深度算 y */
    const layout = () => {
      let maxDepth = 0
      const depthOf = (n, d) => {
        maxDepth = Math.max(maxDepth, d)
        n.kids.forEach((k) => depthOf(k, d + 1))
      }
      depthOf(root, 0)

      let total = 0
      const countLeaves = (n) => {
        if (!n.kids.length) total++
        else n.kids.forEach(countLeaves)
      }
      countLeaves(root)

      let slot = 0
      const place = (n, d) => {
        let x
        if (!n.kids.length) {
          x = ((slot + 0.5) / Math.max(total, 1)) * 100
          slot++
        } else {
          const xs = n.kids.map((k) => place(k, d + 1))
          x = xs.reduce((a, b) => a + b, 0) / xs.length
        }
        n.x = x
        n.y = maxDepth ? 12 + (d / maxDepth) * 74 : 12
        return x
      }
      place(root, 0)
    }

    const nodes = () => {
      const out = []
      const walk = (n) => {
        out.push({
          id: n.id,
          val: n.ch,
          x: n.x,
          y: n.y,
          children: n.kids.map((k) => k.id)
        })
        n.kids.forEach(walk)
      }
      walk(root)
      return out
    }

    const wordEnds = () => {
      const ids = []
      const walk = (n) => {
        if (n.end) ids.push(n.id)
        n.kids.forEach(walk)
      }
      walk(root)
      return ids
    }

    const snap = (o) => {
      layout()
      steps.push({
        view: 'tree',
        nodes: nodes(),
        visited: wordEnds(),
        order: [...inserted],
        ...o
      })
    }

    snap({
      line: 0,
      desc: `空的前缀树只有一个根节点。接下来依次插入 ${WORDS.map((w) => `"${w}"`).join('、')}，注意看哪些路是复用的。`,
      current: root.id,
      action: { icon: '🌱', label: '初始化' }
    })

    const insert = (word) => {
      snap({
        line: 0,
        desc: `插入 "${word}"：从根出发，一个字符一个字符往下走。`,
        current: root.id,
        action: { icon: '➕', label: '插入' }
      })

      let node = root
      for (const ch of word) {
        const existed = node.kids.find((k) => k.ch === ch)

        if (existed) {
          node = existed
          snap({
            line: 6,
            desc: `'${ch}' 这条边已经存在 → 直接复用，不新建节点。前缀相同的词就是这样共用一条路的。`,
            current: node.id,
            action: { icon: '♻️', label: '复用' }
          })
        } else {
          const child = { id: nextId++, ch, kids: [], end: false }
          node.kids.push(child)
          node = child
          snap({
            line: 4,
            desc: `没有 '${ch}' 这条边 → 新建一个节点，这条路以前没人走过。`,
            current: node.id,
            action: { icon: '🌿', label: '新建' }
          })
        }
      }

      node.end = true
      inserted.push(word)
      snap({
        line: 8,
        desc: `"${word}" 的最后一个字符走完了，给它打上「词尾」标记（绿色节点）—— 没有这个标记，就分不清 "car" 和 "card"。`,
        current: node.id,
        action: { icon: '🏷️', label: '标记词尾' }
      })
    }

    const search = (word) => {
      snap({
        line: 11,
        desc: `查 "${word}"：还是从根出发，一个字符一个字符走。`,
        current: root.id,
        action: { icon: '🔍', label: '查询' }
      })

      let node = root
      for (const ch of word) {
        const next = node.kids.find((k) => k.ch === ch)
        if (!next) {
          snap({
            line: 14,
            desc: `走到 '${node.ch}' 就找不到 '${ch}' 这条边了 —— 说明不存在的词，不用再往下看。这就是 Trie 查询只花 O(L) 的原因。`,
            current: node.id,
            action: { icon: '❌', label: '断链' }
          })
          return false
        }
        node = next
        snap({
          line: 15,
          desc: `沿着 '${ch}' 往下走到这个节点。`,
          current: node.id,
          action: { icon: '➡️', label: '下探' }
        })
      }

      if (node.end) {
        snap({
          line: 17,
          desc: `"${word}" 的每个字符都走到了，而且末尾有词尾标记 → 这个词存在。`,
          current: node.id,
          action: { icon: '✅', label: '命中' }
        })
      } else {
        snap({
          line: 17,
          desc: `字符都走到了，但这儿没有词尾标记 —— "${word}" 只是某些词的前缀，不是被插入过的词。`,
          current: node.id,
          action: { icon: '⚠️', label: '只是前缀' }
        })
      }
      return node.end
    }

    WORDS.forEach(insert)
    search('car')
    search('care')

    snap({
      line: 11,
      desc: `一共 ${nextId} 个节点存下了 ${WORDS.length} 个词 —— "cat / car / card" 共享了 "ca" 这一整段。前缀越多，省得越多。`,
      current: root.id,
      action: { icon: '🏁', label: '完成' }
    })

    return { steps, result: { nodes: nextId, words: [...inserted] } }
  }
}