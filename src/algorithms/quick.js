export default {
  id: 'quick-sort',
  name: '快速排序',
  en: 'Quick Sort',
  category: '排序',
  level: '进阶',
  view: 'array',
  complexity: { time: 'O(n log n) 平均 / O(n²) 最坏', space: 'O(log n)' },
  summary: '选一个基准值，把比它小的甩到左边、大的甩到右边，然后左右两边各自再排一遍。',
  defaultInput: [7, 3, 9, 1, 5, 8, 2, 6, 4],
  inputType: 'array',
  code: [
    'function quickSort(lo, hi) {',
    '  if (lo >= hi) return;',
    '  const pivot = a[hi];',
    '  let i = lo;',
    '  for (let j = lo; j < hi; j++) {',
    '    if (a[j] < pivot) {',
    '      swap(a, i, j); i++;',
    '    }',
    '  }',
    '  swap(a, i, hi);',
    '  quickSort(lo, i - 1);',
    '  quickSort(i + 1, hi);',
    '}'
  ],

  run(input) {
    const a = [...input]
    const n = a.length
    const steps = []
    const placed = []

    const snap = (o) => steps.push({ view: 'array', array: [...a], sorted: [...placed], ...o })

    snap({ line: 0, desc: `从整个数组开始，区间 [0, ${n - 1}]。快排的核心只有一件事：给基准值找到它最终的位置。` })

    // 用显式栈模拟递归，才能按顺序生成步骤
    const stack = [[0, n - 1]]
    let round = 0

    while (stack.length) {
      const [lo, hi] = stack.pop()
      if (lo >= hi) {
        if (lo === hi && !placed.includes(lo)) placed.push(lo)
        continue
      }

      round++
      snap({
        line: 1,
        desc: `处理区间 [${lo}, ${hi}]，长度 ${hi - lo + 1}。`,
        range: { from: lo, to: hi }
      })

      const pivot = a[hi]
      snap({
        line: 2,
        desc: `选最右边的 ${pivot} 作为基准值 pivot。接下来要让比它小的都去左边。`,
        highlight: [hi],
        range: { from: lo, to: hi },
        pointers: [{ name: 'pivot', index: hi }]
      })

      let i = lo
      snap({
        line: 3,
        desc: `i 从 ${lo} 开始，它标记"下一个小于 pivot 的数该放的位置"。`,
        highlight: [hi],
        range: { from: lo, to: hi },
        pointers: [
          { name: 'i', index: i },
          { name: 'pivot', index: hi }
        ]
      })

      for (let j = lo; j < hi; j++) {
        const isSmaller = a[j] < pivot
        snap({
          line: 5,
          desc: `a[${j}] = ${a[j]} ${isSmaller ? '<' : '≥'} ${pivot}，${
            isSmaller ? '该放到左边，把它和 a[i] 交换' : '留在右边，跳过'
          }。`,
          compare: [j],
          highlight: [hi],
          range: { from: lo, to: hi },
          pointers: [
            { name: 'i', index: i },
            { name: 'j', index: j },
            { name: 'pivot', index: hi }
          ]
        })

        if (isSmaller) {
          if (i !== j) {
            ;[a[i], a[j]] = [a[j], a[i]]
            snap({
              line: 6,
              desc: `交换 a[${i}] 和 a[${j}]，小于 pivot 的区域扩大了一格。`,
              swap: [i, j],
              highlight: [hi],
              range: { from: lo, to: hi },
              pointers: [
                { name: 'i', index: i + 1 },
                { name: 'pivot', index: hi }
              ]
            })
          }
          i++
        }
      }

      ;[a[i], a[hi]] = [a[hi], a[i]]
      placed.push(i)
      snap({
        line: 9,
        desc: `把 pivot ${pivot} 换到位置 ${i}。现在它左边全是小数、右边全是大数 —— 这个位置就是它最终的位置，以后不用再动。`,
        swap: [i, hi],
        highlight: [i],
        sorted: [...placed],
        range: { from: lo, to: hi }
      })

      stack.push([lo, i - 1])
      stack.push([i + 1, hi])
      snap({
        line: 10,
        desc: `左边 [${lo}, ${i - 1}] 和右边 [${i + 1}, ${hi}] 各自递归处理。`,
        range: { from: lo, to: hi },
        highlight: [i]
      })
    }

    for (let k = 0; k < n; k++) if (!placed.includes(k)) placed.push(k)
    snap({ line: 12, desc: `全部就位：[${a.join(', ')}]。一共分区了 ${round} 次。` })

    return { steps, result: a }
  }
}
