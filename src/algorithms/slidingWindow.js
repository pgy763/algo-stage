// 滑动窗口最大和：固定窗口大小 k，从左滑到右。
// 暴力是每个窗口重新加 k 个数；滑动窗口只做「进一个、出一个」，O(n)。

export default {
  id: 'sliding-window',
  name: '滑动窗口最大和',
  en: 'Sliding Window',
  category: '双指针与滑窗',
  level: '入门',
  view: 'array',
  complexity: { time: 'O(n)', space: 'O(1)' },
  summary: '窗口往右滑一格，只加进来的、减出去的 —— 别每个窗口都从头加一遍。',
  defaultInput: [2, 1, 5, 1, 3, 2, 7, 4, 6, 1],
  inputType: 'array',
  code: [
    'let sum = 0;',
    'for (let i = 0; i < k; i++) sum += arr[i];',
    'let best = sum;',
    'for (let right = k; right < arr.length; right++) {',
    '  sum += arr[right] - arr[right - k];  // 进一个出一个',
    '  if (sum > best) best = sum;',
    '}',
    'return best;'
  ],

  run(input) {
    const a = [...input].slice(0, 14)
    const k = 3
    const steps = []
    let sum = 0

    const snap = (o) =>
      steps.push({
        view: 'array',
        array: [...a],
        compare: [],
        ...o
      })

    // 建第一个窗口
    for (let i = 0; i < k; i++) sum += a[i]
    let best = sum

    snap({
      line: 1,
      range: { from: 0, to: k - 1 },
      pointers: [
        { name: 'L', index: 0 },
        { name: 'R', index: k - 1 }
      ],
      desc: `第一个窗口 [${a.slice(0, k).join(', ')}]，和 = ${sum}。老老实实一个一个加。`
    })

    for (let right = k; right < a.length; right++) {
      const out = a[right - k]
      const inVal = a[right]
      const before = sum
      sum += inVal - out

      snap({
        line: 4,
        range: { from: right - k, to: right },
        pointers: [
          { name: 'L', index: right - k },
          { name: 'R', index: right }
        ],
        compare: [right - k, right],
        desc: `窗口右滑：进来 ${inVal}，出去 ${out}。和 = ${before} + ${inVal} - ${out} = ${sum}（只动了两个数，不用重算）`
      })

      if (sum > best) {
        best = sum
        snap({
          line: 5,
          range: { from: right - k, to: right },
          pointers: [
            { name: 'L', index: right - k },
            { name: 'R', index: right }
          ],
          desc: `${sum} > ${before}（上一窗口和），刷新最大值 best = ${sum}。`
        })
      } else {
        snap({
          line: 5,
          range: { from: right - k, to: right },
          pointers: [
            { name: 'L', index: right - k },
            { name: 'R', index: right }
          ],
          desc: `${sum} 没超过 best（${best}），保持不变。`
        })
      }
    }

    // 完整回放最佳窗口
    let bestEnd = 0
    for (let right = k; right <= a.length; right++) {
      const s = a.slice(right - k, right).reduce((x, y) => x + y, 0)
      if (s === best) bestEnd = right - 1
    }
    snap({
      line: 6,
      range: { from: bestEnd - k + 1, to: bestEnd },
      sorted: Array.from({ length: k }, (_, i) => bestEnd - k + 1 + i),
      desc: `最大窗口和 = ${best}，就是绿色这段 [${a.slice(bestEnd - k + 1, bestEnd + 1).join(', ')}]。10 个数只加了 ${a.length - k + k} 次 —— 这就是滑动窗口。`
    })

    return { steps, result: best }
  }
}
