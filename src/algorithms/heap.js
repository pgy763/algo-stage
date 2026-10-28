/**
 * 堆排序
 *
 * 这个算法最值得讲的一点：它一个额外数组都不要，因为**数组本身就是树** ——
 * 下标 i 的左孩子是 2i+1、右孩子是 2i+2。看懂这层映射，堆就不再神秘了。
 */
const DEFAULT = [5, 2, 8, 1, 9, 3, 7, 4, 6]

export default {
  id: 'heap-sort',
  name: '堆排序',
  en: 'Heap Sort',
  category: '排序',
  level: '进阶',
  view: 'array',
  complexity: { time: 'O(n log n)', space: 'O(1)' },
  summary: '把数组当完全二叉树，先整理成大顶堆，然后反复把堆顶换到末尾、再让新的堆顶沉下去。',
  defaultInput: DEFAULT,
  inputType: 'array',
  code: [
    'function heapSort(a) {',
    '  const n = a.length',
    '  // 建堆：从最后一个非叶子节点往前走，一个个往下沉',
    '  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {',
    '    siftDown(a, i, n)',
    '  }',
    '  // 排序：堆顶是当前最大值，换到末尾就位',
    '  for (let end = n - 1; end > 0; end--) {',
    '    swap(a, 0, end)',
    '    siftDown(a, 0, end)',
    '  }',
    '  return a',
    '}',
    '',
    'function siftDown(a, i, size) {',
    '  while (true) {',
    '    const l = 2 * i + 1, r = 2 * i + 2',
    '    let big = i',
    '    if (l < size && a[l] > a[big]) big = l',
    '    if (r < size && a[r] > a[big]) big = r',
    '    if (big === i) break      // 两个孩子都不比我大，停',
    '    swap(a, i, big)',
    '    i = big',
    '  }',
    '}'
  ],

  run(input) {
    const a = Array.isArray(input) && input.length >= 2 ? [...input] : [...DEFAULT]
    const n = a.length
    const steps = []
    const done = []

    const snap = (o) => steps.push({ view: 'array', array: [...a], sorted: [...done], ...o })

    snap({
      line: 0,
      desc: `${n} 个数，先别想着排序 —— 把它们按顺序摆进一棵完全二叉树：下标 0 是堆顶，下标 i 的两个孩子是 2i+1 和 2i+2。`,
      range: { from: 0, to: n - 1 }
    })

    /** 让下标 start 的元素往下沉，堆的有效范围是 [0, size) */
    const sift = (start, size, note) => {
      let i = start
      snap({
        line: 14,
        desc: `${note}：让下标 ${i}（值 ${a[i]}）往下沉，当前堆的范围是 [0, ${size - 1}]。`,
        pointers: [{ name: 'i', index: i }],
        range: { from: 0, to: size - 1 }
      })

      while (true) {
        const l = 2 * i + 1
        const r = 2 * i + 2
        const kids = [l, r].filter((k) => k < size)
        snap({
          line: 16,
          desc: `${i} 的左孩子是 ${l}${l < size ? `（${a[l]}）` : '（超出堆范围）'}，右孩子是 ${r}${
            r < size ? `（${a[r]}）` : '（超出堆范围）'
          }。比一比谁最大。`,
          pointers: [{ name: 'i', index: i }],
          compare: kids.length ? [i, ...kids] : [i],
          range: { from: 0, to: size - 1 }
        })

        let big = i
        if (l < size && a[l] > a[big]) big = l
        if (r < size && a[r] > a[big]) big = r

        if (big === i) {
          snap({
            line: 20,
            desc: `${a[i]} 比两个孩子都大（或者根本没有孩子）—— 沉到底了，这个子树已经是合法的堆。`,
            pointers: [{ name: 'i', index: i }],
            range: { from: 0, to: size - 1 }
          })
          return
        }

        const childVal = a[big]
        const parentVal = a[i]
        ;[a[i], a[big]] = [a[big], a[i]]
        snap({
          line: 21,
          desc: `孩子 ${big} 的 ${childVal} 比父节点 ${parentVal} 大 → 交换，大的往上走，${parentVal} 继续往下沉。`,
          swap: [i, big],
          pointers: [{ name: 'i', index: big }],
          range: { from: 0, to: size - 1 }
        })
        i = big
      }
    }

    // ---- 第一阶段：建堆 ----
    const lastParent = Math.floor(n / 2) - 1
    snap({
      line: 3,
      desc: `建堆从最后一个非叶子节点（下标 ${lastParent}）开始往前走。再往后的下标全是叶子，单个节点本来就是个合法堆。`,
      range: { from: 0, to: n - 1 }
    })

    for (let i = lastParent; i >= 0; i--) {
      snap({
        line: 3,
        desc: `轮到下标 ${i}（值 ${a[i]}）：它的两个子树已经是堆了，只差它自己沉到位。`,
        pointers: [{ name: 'i', index: i }],
        range: { from: 0, to: n - 1 }
      })
      sift(i, n, '建堆')
    }

    snap({
      line: 5,
      desc: `建堆完成 —— 堆顶 ${a[0]} 就是整个数组的最大值。接下来每轮把它"取"出来放到末尾。`,
      range: { from: 0, to: n - 1 }
    })

    // ---- 第二阶段：反复取堆顶 ----
    for (let end = n - 1; end > 0; end--) {
      const top = a[0]
      ;[a[0], a[end]] = [a[end], a[0]]
      done.push(end)
      snap({
        line: 8,
        desc: `堆顶 ${top} 是剩下部分的最大值 → 和末尾（下标 ${end}）交换，它就永久就位了。`,
        swap: [0, end],
        range: { from: 0, to: end }
      })
      snap({
        line: 9,
        desc: `绿色是已经排好的 ${done.length} 个。堆缩小成 [0, ${end - 1}]，但新的堆顶是被换上去的 ${
          a[0]
        }，得让它沉下去。`,
        range: { from: 0, to: end - 1 }
      })
      sift(0, end, '重新维持堆')
    }

    done.push(0)
    snap({
      line: 11,
      desc: `排序完成：[${a.join(', ')}]。堆排序最好、最坏、平均都是 O(n log n)，而且全程只在原数组里交换，空间 O(1)。`
    })

    return { steps, result: a }
  }
}