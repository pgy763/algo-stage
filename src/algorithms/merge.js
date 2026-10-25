export default {
  id: 'merge-sort',
  name: '归并排序',
  en: 'Merge Sort',
  category: '排序',
  level: '进阶',
  view: 'array',
  complexity: { time: 'O(n log n)', space: 'O(n)' },
  summary: '先把数组拆成两半、再拆、直到只剩一个数；然后两两合并，合并时永远先拿小的那个。',
  defaultInput: [38, 27, 43, 3, 9, 82, 10, 55],
  inputType: 'array',
  code: [
    'for (let width = 1; width < n; width *= 2) {',
    '  for (let lo = 0; lo < n; lo += width * 2) {',
    '    const mid = Math.min(lo + width, n);',
    '    const hi = Math.min(lo + width * 2, n);',
    '    merge(lo, mid, hi);',
    '  }',
    '}',
    '',
    'function merge(lo, mid, hi) {',
    '  const buf = [];',
    '  let i = lo, j = mid;',
    '  while (i < mid && j < hi) {',
    '    if (a[i] <= a[j]) buf.push(a[i++]);',
    '    else buf.push(a[j++]);',
    '  }',
    '  while (i < mid) buf.push(a[i++]);',
    '  while (j < hi) buf.push(a[j++]);',
    '  for (let k = 0; k < buf.length; k++) a[lo + k] = buf[k];',
    '}'
  ],

  run(input) {
    const a = [...input]
    const n = a.length
    const steps = []

    const snap = (o) => steps.push({ view: 'array', array: [...a], ...o })

    snap({
      line: 0,
      desc: `自底向上归并：先把相邻的每 1 个数看成有序段，再两两合并成 2 个、4 个、8 个……直到整体有序。`
    })

    for (let width = 1; width < n; width *= 2) {
      snap({
        line: 0,
        desc: `=== 第 ${Math.log2(width * 2)} 层：把长度为 ${width} 的有序段两两合并 ===`,
        range: null
      })

      for (let lo = 0; lo < n; lo += width * 2) {
        const mid = Math.min(lo + width, n)
        const hi = Math.min(lo + width * 2, n)
        if (mid >= hi) continue

        snap({
          line: 4,
          desc: `合并 [${lo}, ${mid - 1}] 和 [${mid}, ${hi - 1}] 两段。左边 ${mid - lo} 个，右边 ${hi - mid} 个。`,
          range: { from: lo, to: hi - 1 },
          pointers: [
            { name: 'L', index: lo },
            { name: 'M', index: mid },
            { name: 'R', index: hi - 1 }
          ]
        })

        const buf = []
        let i = lo
        let j = mid

        while (i < mid && j < hi) {
          const takeLeft = a[i] <= a[j]
          snap({
            line: 12,
            desc: `比较 ${a[i]} 和 ${a[j]} —— 取小的 ${takeLeft ? a[i] : a[j]} 放进缓冲区。`,
            compare: [i, j],
            range: { from: lo, to: hi - 1 },
            pointers: [
              { name: 'i', index: i },
              { name: 'j', index: j }
            ],
            aux: [...buf]
          })
          if (takeLeft) buf.push(a[i++])
          else buf.push(a[j++])
        }

        while (i < mid) {
          buf.push(a[i++])
          snap({
            line: 16,
            desc: `左边还有剩 ${a[i - 1]}，直接补到缓冲区末尾。`,
            range: { from: lo, to: hi - 1 },
            aux: [...buf]
          })
        }
        while (j < hi) {
          buf.push(a[j++])
          snap({
            line: 17,
            desc: `右边还有剩 ${a[j - 1]}，直接补到缓冲区末尾。`,
            range: { from: lo, to: hi - 1 },
            aux: [...buf]
          })
        }

        for (let k = 0; k < buf.length; k++) a[lo + k] = buf[k]
        snap({
          line: 18,
          desc: `缓冲区写回 [${lo}, ${hi - 1}]，这一段已经有 ${hi - lo} 个数有序了：[${buf.join(', ')}]。`,
          range: { from: lo, to: hi - 1 },
          sorted: buf.map((_, idx) => lo + idx),
          aux: [...buf]
        })
      }
    }

    const all = []
    for (let k = 0; k < n; k++) all.push(k)
    snap({ line: 6, desc: `归并完成：[${a.join(', ')}]。注意它额外用了 O(n) 的缓冲区。`, sorted: all })

    return { steps, result: a }
  }
}
