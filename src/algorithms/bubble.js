/**
 * 冒泡排序
 * step 协议见 README
 */
export default {
  id: 'bubble-sort',
  name: '冒泡排序',
  en: 'Bubble Sort',
  category: '排序',
  level: '入门',
  view: 'array',
  complexity: { time: 'O(n²)', space: 'O(1)' },
  summary: '相邻两个数两两比较，大的往后挪。每一轮结束，最大的那个就"冒"到了末尾。',
  defaultInput: [5, 3, 8, 1, 9, 2, 7, 4],
  inputType: 'array',
  code: [
    'for (let i = 0; i < n - 1; i++) {',
    '  let swapped = false;',
    '  for (let j = 0; j < n - 1 - i; j++) {',
    '    if (a[j] > a[j + 1]) {',
    '      [a[j], a[j + 1]] = [a[j + 1], a[j]];',
    '      swapped = true;',
    '    }',
    '  }',
    '  if (!swapped) break;',
    '}'
  ],

  run(input) {
    const a = [...input]
    const n = a.length
    const steps = []
    const sorted = []

    const snap = (o) => steps.push({ view: 'array', array: [...a], sorted: [...sorted], ...o })

    snap({ line: 0, desc: `要排序 ${n} 个数。每一轮把当前范围内最大的数字推到末尾。` })

    for (let i = 0; i < n - 1; i++) {
      const end = n - 1 - i
      snap({
        line: 1,
        desc: `第 ${i + 1} 轮开始：还剩 ${end + 1} 个没排好，目标是把其中最大的送到位置 ${end}。`,
        range: { from: 0, to: end }
      })

      let swapped = false
      for (let j = 0; j < end; j++) {
        snap({
          line: 3,
          desc: `比较 ${a[j]} 和 ${a[j + 1]} —— ${a[j] > a[j + 1] ? '左边更大，需要交换' : '顺序正确，不用动'}`,
          compare: [j, j + 1],
          range: { from: 0, to: end },
          pointers: [{ name: 'j', index: j }]
        })

        if (a[j] > a[j + 1]) {
          const left = a[j]
          const right = a[j + 1]
          ;[a[j], a[j + 1]] = [a[j + 1], a[j]]
          swapped = true
          snap({
            line: 4,
            desc: `交换 ${left} 和 ${right}，大的往右走了一格。`,
            swap: [j, j + 1],
            range: { from: 0, to: end }
          })
        }
      }

      sorted.push(end)
      snap({
        line: 8,
        desc: `${a[end]} 已经就位（位置 ${end}），它不会再动了。${
          swapped ? '本轮发生过交换，继续下一轮。' : '本轮一次都没交换，说明已经有序，提前结束。'
        }`,
        range: { from: 0, to: end - 1 >= 0 ? end - 1 : 0 }
      })

      if (!swapped) break
    }

    sorted.length = 0
    for (let k = 0; k < n; k++) sorted.push(k)
    snap({ line: 9, desc: `排序完成：[${a.join(', ')}]` })

    return { steps, result: a }
  }
}
