// 二叉搜索树：插入与查找。
// 中序序号定横坐标、深度定纵坐标 —— 树再歪也不会重叠，而且左小右大一目了然。

const INIT = [8, 3, 10, 1, 6, 14, 4, 7, 13]

function makeNode(val) {
  return { val, left: null, right: null }
}

function insertNode(root, val) {
  if (!root) return makeNode(val)
  if (val < root.val) root.left = insertNode(root.left, val)
  else if (val > root.val) root.right = insertNode(root.right, val)
  return root
}

/** 树 → 视图节点数组（中序定 x，深度按最大深度归一化成百分比 y） */
function layout(root) {
  const depthOf = (node) => (node ? 1 + Math.max(depthOf(node.left), depthOf(node.right)) : 0)
  const maxDepth = Math.max(depthOf(root), 1)
  const nodes = []
  const walk = (node, depth) => {
    if (!node) return
    walk(node.left, depth + 1)
    nodes.push({
      id: nodes.length,
      key: node,
      val: node.val,
      level: depth,
      x: 0, // 节点总数确定后再统一分配
      y: 14 + (depth / maxDepth) * 72
    })
    node._viewId = nodes.length - 1
    walk(node.right, depth + 1)
  }
  // 先建视图 id
  walk(root, 0)
  // 中序序号均匀分布横坐标：左小右大一目了然
  nodes.forEach((n, i) => {
    n.x = 8 + ((i + 0.5) / nodes.length) * 84
  })
  // 再用 key → id 映射接上左右指针
  const map = new Map()
  for (const n of nodes) map.set(n.key, n.id)
  const connect = (node) => {
    if (!node) return
    const view = nodes[map.get(node)]
    view.left = node.left ? map.get(node.left) : -1
    view.right = node.right ? map.get(node.right) : -1
    connect(node.left)
    connect(node.right)
  }
  connect(root)
  return nodes
}

export default {
  id: 'bst-insert',
  name: '二叉搜索树：插入与查找',
  en: 'BST Insert & Search',
  category: '树',
  level: '入门',
  view: 'tree',
  complexity: { time: 'O(h)', space: 'O(1)' },
  summary: '比大小往一边走：查找和插入走的是同一条路，O(h) —— 树歪了就退化成链表。',
  inputType: 'none',
  code: [
    '// 查找 / 插入走的是同一条路',
    'function search(root, val) {',
    '  while (root) {',
    '    if (val === root.val) return root;   // 命中',
    '    root = val < root.val ? root.left : root.right;',
    '  }',
    '  return null;   // 走到空 = 不存在',
    '}',
    '',
    'function insert(root, val) {',
    '  if (!root) return new Node(val);  // 空位就是它的新家',
    '  if (val < root.val) root.left = insert(root.left, val);',
    '  else if (val > root.val) root.right = insert(root.right, val);',
    '  return root;'
  ],

  run() {
    let root = null
    for (const v of INIT) root = insertNode(root, v)

    const steps = []
    let nodes = layout(root)
    const path = [] // 走过的节点 key

    const snap = (o) =>
      steps.push({
        view: 'tree',
        nodes,
        current: -1,
        visited: path.map((k) => nodes.find((n) => n.key === k)?._viewId ?? -1).filter((i) => i >= 0),
        ...o
      })

    snap({
      line: 0,
      desc: `一棵已经建好的 BST（插入序 ${INIT.join(' → ')}）。看布局：中序从左到右正好是有序的 —— 这就是 BST 的灵魂。`
    })

    // —— 插入 5 ——
    snap({ line: 8, desc: `第一件事：插入 5。BST 插入 = 先按查找的方式走，走到空位再安家。` })
    path.length = 0
    {
      let cur = root
      while (true) {
        path.push(cur)
        nodes = layout(root)
        snap({
          line: 11,
          desc: `比较 5 和 ${cur.val}：${5 < cur.val ? `5 < ${cur.val}，往左` : `5 > ${cur.val}，往右`}。`
        })
        const next = 5 < cur.val ? cur.left : cur.right
        if (!next) {
          const child = makeNode(5)
          if (5 < cur.val) cur.left = child
          else cur.right = child
          path.push(child)
          nodes = layout(root)
          snap({
            line: 10,
            desc: `空位找到了：5 挂在 ${cur.val} 的${5 < cur.val ? '左' : '右'}边。注意它没有动任何已有的节点 —— 插入永远是发生在叶子上的。`
          })
          break
        }
        cur = next
      }
    }

    // —— 插入 12 ——
    snap({ line: 8, desc: `再插一个 12，路径完全由大小决定：` })
    path.length = 0
    {
      let cur = root
      while (true) {
        path.push(cur)
        nodes = layout(root)
        snap({ line: 11, desc: `比较 12 和 ${cur.val}：${12 < cur.val ? '往左' : '往右'}。` })
        const next = 12 < cur.val ? cur.left : cur.right
        if (!next) {
          const child = makeNode(12)
          if (12 < cur.val) cur.left = child
          else cur.right = child
          path.push(child)
          nodes = layout(root)
          snap({ line: 10, desc: `12 挂在 ${cur.val} 的${12 < cur.val ? '左' : '右'}边。树比之前深了一点 —— 这就是 BST 的代价：最坏会退化成链表。` })
          break
        }
        cur = next
      }
    }

    // —— 查找 7（命中）——
    snap({ line: 1, desc: `现在查找 7。查找和插入走的是同一条路，只是不用安家。` })
    path.length = 0
    {
      let cur = root
      while (cur) {
        path.push(cur)
        nodes = layout(root)
        if (7 === cur.val) {
          snap({ line: 3, desc: `命中！找到 7，只比较了 ${path.length} 次 —— 而这棵树有 ${INIT.length + 2} 个节点。` })
          break
        }
        snap({ line: 4, desc: `7 ${7 < cur.val ? '<' : '>'} ${cur.val}，往${7 < cur.val ? '左' : '右'}。` })
        cur = 7 < cur.val ? cur.left : cur.right
      }
    }

    // —— 查找 9（未命中）——
    snap({ line: 1, desc: `查找一个不存在的 9：` })
    path.length = 0
    {
      let cur = root
      while (cur) {
        if (9 === cur.val) break
        path.push(cur)
        nodes = layout(root)
        const next = 9 < cur.val ? cur.left : cur.right
        snap({ line: 4, desc: `9 ${9 < cur.val ? '<' : '>'} ${cur.val}，往${9 < cur.val ? '左' : '右'}。` })
        if (!next) {
          snap({ line: 6, desc: `走到空位 —— 9 不在树里。查询结束，一共走了 ${path.length} 步。` })
        }
        cur = next
      }
    }

    snap({
      line: 13,
      desc: `所有操作的代价都是树高 O(h)。平衡时 h≈log n，但插入 [1,2,3,4,5] 这种有序序列，树就退化成链表、h=n —— 所以后来才有 AVL 和红黑树。`
    })

    return { steps, result: INIT.length + 2 }
  }
}
