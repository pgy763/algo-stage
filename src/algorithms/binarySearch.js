export default {
  id: 'binary-search',
  name: '二分查找',
  en: 'Binary Search',
  category: '查找',
  level: '入门',
  view: 'array',
  complexity: { time: 'O(log n)', space: 'O(1)' },
  summary: '每次都砍掉一半：看中间那个数，比目标大就去左边找，小就去右边找。',
  defaultInput: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
  inputType: 'array',
  code: [
    'let left = 0, right = n - 1;',
    'while (left <= right) {',
    '  const mid = left + ((right - left) >> 1);',
    '  if (a[mid] === target) return mid;',
    '  if (a[mid] < target) left = mid + 1;',
    '  else right = mid - 1;',
    '}',
    'return -1;'
  ],

  run(input) {
    const a = [...input].sort((x, y) => x - y)
    const n = a.length
    // 确定性选择目标：偶数长度时找一个不存在的值，能完整看到区间一路收缩到空
    const target = n % 2 === 0 ? a[n - 1] + 7 : a[Math.floor(n / 2)]
    const steps = []
    let left = 0
    let right = n - 1
    let found = -1

    const snap = (o) => steps.push({ view: 'array', array: [...a], ...o })

    snap({
      line: 0,
      desc: `数组已经从小到大排好序，要在这 ${n} 个数里找 ${target}。左边界 left=${left}，右边界 right=${right}。`,
      range: { from: left, to: right },
      pointers: [{ name: 'L', index: left }, { name: 'R', index: right }]
    })

    while (left <= right) {
      const mid = left + ((right - left) >> 1)
      snap({
        line: 2,
        desc: `当前区间 [${left}, ${right}]，取中点 mid = ${mid}，值是 ${a[mid]}。`,
        highlight: [mid],
        range: { from: left, to: right },
        pointers: [
          { name: 'L', index: left },
          { name: 'M', index: mid },
          { name: 'R', index: right }
        ]
      })

      if (a[mid] === target) {
        found = mid
        snap({
          line: 3,
          desc: `命中！a[${mid}] = ${target}，返回下标 ${mid}。只用了 ${steps.length} 步。`,
          highlight: [mid],
          sorted: [mid],
          pointers: [{ name: 'M', index: mid }]
        })
        break
      }

      if (a[mid] < target) {
        snap({
          line: 4,
          desc: `${a[mid]} 比 ${target} 小 —— 左边这一半全部可以丢掉，left 挪到 ${mid + 1}。`,
          highlight: [mid],
          range: { from: left, to: mid },
          pointers: [
            { name: 'L', index: left },
            { name: 'M', index: mid }
          ]
        })
        left = mid + 1
      } else {
        snap({
          line: 5,
          desc: `${a[mid]} 比 ${target} 大 —— 右边这一半全部可以丢掉，right 挪到 ${mid - 1}。`,
          highlight: [mid],
          range: { from: mid, to: right },
          pointers: [
            { name: 'M', index: mid },
            { name: 'R', index: right }
          ]
        })
        right = mid - 1
      }

      snap({
        line: 1,
        desc: `区间缩到 [${left}, ${right}]，${
          left <= right ? '还有得找，继续。' : 'left 已经越过 right，说明目标不存在。'
        }`,
        range: { from: Math.max(left, 0), to: Math.min(right, n - 1) },
        pointers:
          left <= right
            ? [{ name: 'L', index: left }, { name: 'R', index: right }]
            : []
      })
    }

    if (found < 0) {
      snap({
        line: 7,
        desc: `循环结束，没找到 ${target}，返回 -1。（这就是二分的代价：数据必须有序）`,
        pointers: []
      })
    }

    return { steps, result: found }
  }
}
