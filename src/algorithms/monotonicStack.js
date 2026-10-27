// 柱状图中最大的矩形：单调栈经典题。
// 核心直觉：对每根柱子，找「左右第一个比它矮的位置」——期间它能撑起的最大宽度就定了。
// 单调递增栈让每个柱子出栈的那一刻，左右边界刚好都知道。

export default {
  id: 'largest-rectangle',
  name: '柱状图最大矩形',
  en: 'Largest Rectangle in Histogram',
  category: '栈与队列',
  level: '困难',
  view: 'array',
  complexity: { time: 'O(n)', space: 'O(n)' },
  summary: '一根柱子出栈的那一刻，它左右比它矮的边界刚好都齐了 —— 面积当场算完。',
  defaultInput: [2, 1, 5, 6, 2, 3, 4],
  inputType: 'array',
  code: [
    'const stack = [];  // 存下标，高度单调递增',
    'let best = 0;',
    'for (let i = 0; i <= heights.length; i++) {',
    '  const cur = i === len ? 0 : heights[i];  // 末尾哨兵：逼空栈',
    '  while (stack.length && heights[stack.top] >= cur) {',
    '    const h = heights[stack.pop()];',
    '    const left = stack.length ? stack.top + 1 : 0;',
    '    best = Math.max(best, h * (i - left));',
    '  }',
    '  stack.push(i);',
    '}'
  ],

  run(input) {
    const h = [...input].slice(0, 12)
    const n = h.length
    const stack = []
    let best = 0
    const steps = []

    const snap = (o) =>
      steps.push({
        view: 'array',
        array: [...h],
        aux: stack.map((i) => h[i]),
        compare: [],
        ...o
      })

    snap({
      line: 0,
      desc: `柱状图 [${h.join(', ')}]。栈里存下标，保持高度单调递增 —— 一旦来了一根更矮的，前面高的全都到头了。`
    })

    for (let i = 0; i <= n; i++) {
      const isSentinel = i === n
      const cur = isSentinel ? 0 : h[i]

      snap({
        line: 2,
        compare: isSentinel ? [] : [i],
        pointers: [{ name: 'i', index: Math.min(i, n - 1) }],
        desc: isSentinel
          ? '所有柱子处理完。放一根高度 0 的哨兵在末尾，把栈里剩下的全部逼出来结算。'
          : `看第 ${i} 根（高度 ${cur}）：比栈顶矮吗？`
      })

      while (stack.length && h[stack[stack.length - 1]] >= cur) {
        const top = stack.pop()
        const height = h[top]
        const left = stack.length ? stack[stack.length - 1] + 1 : 0
        const width = i - left
        const area = height * width
        const isBest = area > best
        if (isBest) best = area

        snap({
          line: 6,
          swap: [top],
          pointers: [
            { name: 'i', index: Math.min(i, n - 1) },
            { name: 'L', index: left }
          ],
          aux: stack.map((x) => h[x]),
          desc: `弹出 ${top} 号（高 ${height}）：左边界 = 新栈顶 +1 = ${left}，右边界 = ${i}，宽 ${width}，面积 ${height} × ${width} = ${area}${isBest ? '，刷新最大值！' : '。'}`
        })
      }

      stack.push(i)
      snap({
        line: 8,
        pointers: [{ name: 'i', index: Math.min(i, n - 1) }],
        aux: stack.map((x) => h[x]),
        desc: `${i} 号入栈。栈内高度从底到顶递增：${stack.map((x) => h[x]).join(' ≤ ')}。`
      })
    }

    snap({
      line: 6,
      desc: `最大矩形面积 = ${best}。每根柱子最多入栈出栈各一次，所以是 O(n) —— 暴力法是 O(n²)。`
    })

    return { steps, result: best }
  }
}
