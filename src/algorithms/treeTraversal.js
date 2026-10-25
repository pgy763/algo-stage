/**
 * 完全二叉树，节点值按层序为 1..15，方便算坐标。
 * 中序遍历的结果正好是 1..15（二叉搜索树的有序序列）。
 */
const DEPTH = 4

function buildTree() {
  const nodes = []
  const total = Math.pow(2, DEPTH) - 1
  for (let i = 0; i < total; i++) {
    const level = Math.floor(Math.log2(i + 1))
    const posInLevel = i - (Math.pow(2, level) - 1)
    const slots = Math.pow(2, level)
    nodes.push({
      id: i,
      val: i + 1,
      level,
      x: ((posInLevel + 0.5) / slots) * 100,
      y: level * 22 + 16,
      left: 2 * i + 1 < total ? 2 * i + 1 : -1,
      right: 2 * i + 2 < total ? 2 * i + 2 : -1
    })
  }
  return nodes
}

export default {
  id: 'tree-inorder',
  name: '二叉树中序遍历',
  en: 'Binary Tree Inorder',
  category: '树',
  level: '入门',
  view: 'tree',
  complexity: { time: 'O(n)', space: 'O(h)' },
  summary: '用栈代替递归：一路向左压栈，弹出来访问，再转向右子树。',
  inputType: 'none',
  tree: buildTree(),
  code: [
    'const stack = [];',
    'let cur = root;',
    'while (cur || stack.length) {',
    '  while (cur) {',
    '    stack.push(cur);   // 一路向左，沿途都压栈',
    '    cur = cur.left;',
    '  }',
    '  cur = stack.pop();   // 弹出最左的节点',
    '  result.push(cur.val);',
    '  cur = cur.right;',
    '}'
  ],

  run() {
    const nodes = buildTree()
    const steps = []
    const visited = []
    const stack = []
    const result = []
    let cur = 0

    const snap = (o) =>
      steps.push({
        view: 'tree',
        nodes,
        current: cur,
        visited: [...visited],
        stack: [...stack],
        order: [...result],
        ...o
      })

    snap({ line: 0, desc: '准备一个空栈，指针 cur 指向根节点。目标是按"左 → 根 → 右"的顺序访问。' })

    let guard = 0
    while ((cur !== -1 || stack.length) && guard++ < 200) {
      // 一路向左
      while (cur !== -1) {
        stack.push(cur)
        snap({
          line: 4,
          desc: `把节点 ${nodes[cur].val} 压栈，然后往左走 —— 因为左边的节点要更早被访问。`
        })
        cur = nodes[cur].left
      }

      if (cur === -1 && stack.length) {
        snap({
          line: 7,
          desc: `左边到底了，从栈顶弹出节点 ${nodes[stack[stack.length - 1]].val}，它现在可以访问了。`
        })
      }

      cur = stack.pop()
      visited.push(cur)
      result.push(nodes[cur].val)
      snap({
        line: 8,
        desc: `访问节点 ${nodes[cur].val}，输出序列变成 [${result.join(', ')}]。接下来转向它的右子树。`
      })

      cur = nodes[cur].right
      if (cur === -1) {
        snap({ line: 9, desc: '右子树为空，继续弹栈。' })
      } else {
        snap({ line: 9, desc: `转到右子树，进入节点 ${nodes[cur].val}。` })
      }
    }

    snap({
      line: 10,
      desc: `遍历结束，输出：[${result.join(', ')}]。栈空了、cur 也走到底了 —— 这就是递归的自然展开。`
    })

    return { steps, result }
  }
}
