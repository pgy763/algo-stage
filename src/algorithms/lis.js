/**
 * 最长递增子序列（LIS）
 *
 * 经典的 O(n²) 版本：dp[i] = 以 nums[i] **结尾**的最长递增子序列长度。
 * "以 i 结尾"这四个字是全部关键 —— 只有确定结尾，才能放心地往前找比它小的。
 */
const DEFAULT = [3, 1, 4, 1, 5, 9, 2, 6]

export default {
  id: 'lis',
  name: '最长递增子序列（DP）',
  en: 'Longest Increasing Subsequence',
  category: '动态规划',
  level: '进阶',
  view: 'array',
  complexity: { time: 'O(n²)', space: 'O(n)' },
  summary: 'dp[i] 记「以第 i 个数结尾」的最长递增子序列长度，往前找比它小的,接上去就是更长的。',
  defaultInput: DEFAULT,
  inputType: 'array',
  code: [
    'const dp = new Array(n).fill(1)',
    'for (let i = 0; i < n; i++) {',
    '  for (let j = 0; j < i; j++) {',
    '    if (nums[j] < nums[i]) {',
    '      dp[i] = Math.max(dp[i], dp[j] + 1)',
    '    }',
    '  }',
    '}',
    '// dp[i] = 以 nums[i] 结尾的最长递增子序列长度',
    '// 答案就是 dp 里的最大值'
  ],

  run(input) {
    const nums = Array.isArray(input) && input.length >= 2 ? [...input] : [...DEFAULT]
    const n = nums.length
    const dp = new Array(n).fill(1)
    const steps = []

    const snap = (o) =>
      steps.push({
        view: 'array',
        array: [...nums],
        aux: [...dp],
        auxLabel: 'dp[i]：以 i 结尾的最长长度',
        ...o
      })

    snap({
      line: 0,
      desc: `${n} 个数。先把 dp 全部填 1 —— 任何一个数单独拿出来，都是长度 1 的递增子序列。下面逐个往后算。`,
      action: { icon: '🧮', label: '初始化' }
    })

    for (let i = 0; i < n; i++) {
      snap({
        line: 1,
        desc: `处理 nums[${i}] = ${nums[i]}：要找出它前面所有比它小的数，看接在谁后面能变得更长。`,
        pointers: [{ name: 'i', index: i }],
        action: { icon: '🎯', label: '以 i 结尾' }
      })

      for (let j = 0; j < i; j++) {
        const smaller = nums[j] < nums[i]
        snap({
          line: 3,
          desc: `${nums[j]}（下标 ${j}）${smaller ? '小于' : '不小于'} ${nums[i]} —— ${
            smaller ? `可以接在它后面，长度会是 dp[${j}] + 1 = ${dp[j] + 1}。` : '不能接，跳过。'
          }`,
          compare: [j, i],
          pointers: [
            { name: 'j', index: j },
            { name: 'i', index: i }
          ]
        })

        if (smaller && dp[j] + 1 > dp[i]) {
          const before = dp[i]
          dp[i] = dp[j] + 1
          snap({
            line: 4,
            desc: `接在 ${nums[j]} 后面更长：dp[${i}] 从 ${before} 更新成 ${dp[i]}。`,
            compare: [j, i],
            pointers: [
              { name: 'j', index: j },
              { name: 'i', index: i }
            ],
            action: { icon: '📈', label: '更新 dp' }
          })
        }
      }
    }

    // 找出最长的结尾
    let best = 0
    for (let k = 1; k < n; k++) if (dp[k] > dp[best]) best = k

    snap({
      line: 9,
      desc: `dp 里最大的是 dp[${best}] = ${dp[best]}，所以最长递增子序列长度是 ${dp[best]}。但 dp 只告诉我们"多长"，接下来倒着走一遍把具体是哪些数找出来。`,
      compare: [best],
      action: { icon: '🔎', label: '回溯答案' }
    })

    // 从 best 往前回溯：dp 每次减 1，且数值更小
    const picked = [best]
    let cur = best
    while (dp[cur] > 1) {
      let next = -1
      for (let j = cur - 1; j >= 0; j--) {
        if (nums[j] < nums[cur] && dp[j] === dp[cur] - 1) {
          next = j
          break
        }
      }
      if (next < 0) break
      picked.push(next)
      cur = next
      snap({
        line: 9,
        desc: `往前找到 ${nums[cur]}（dp = ${dp[cur]}）：它比 ${nums[picked[picked.length - 2]]} 小，且长度正好差 1 —— 就是它接到前面去的。`,
        sorted: [...picked],
        pointers: [{ name: 'i', index: cur }],
        action: { icon: '↩️', label: '回溯' }
      })
    }

    picked.reverse()
    snap({
      line: 9,
      desc: `答案：[${picked.map((i) => nums[i]).join(', ')}]，长度 ${picked.length}。注意 dp 只保证"以某点结尾"的最优，所以末尾不一定是数组最后一个数。`,
      sorted: [...picked],
      action: { icon: '🏁', label: '完成' }
    })

    return { steps, result: { length: picked.length, sequence: picked.map((i) => nums[i]) } }
  }
}