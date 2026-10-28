/**
 * 编辑距离（Levenshtein Distance）
 *
 * 和 LCS 是同一张表的两种问法：都只看「左边、上边、左上角」三个邻居。
 * 区别是 LCS 比的是"共同的部分"（取 max），编辑距离比的是"要改多少"（取 min + 1）。
 */
const S1 = 'horse'
const S2 = 'ros'

export default {
  id: 'edit-distance',
  name: '编辑距离（DP）',
  en: 'Edit Distance',
  category: '动态规划',
  level: '进阶',
  view: 'matrix',
  complexity: { time: 'O(m·n)', space: 'O(m·n)' },
  summary: '把 s1 改成 s2 最少要几步？每格只比左边、上边、左上角三个邻居 —— 删、插、改各对应一个方向。',
  inputType: 'none',
  code: [
    'for (let i = 1; i <= m; i++) {',
    '  for (let j = 1; j <= n; j++) {',
    '    if (s1[i - 1] === s2[j - 1]) {',
    '      dp[i][j] = dp[i - 1][j - 1]           // 字符一样：不用操作',
    '    } else {',
    '      dp[i][j] = 1 + Math.min(',
    '        dp[i - 1][j],     // 删掉 s1 的这个字符',
    '        dp[i][j - 1],     // 给 s1 插入一个字符',
    '        dp[i - 1][j - 1]  // 替换成相同的字符',
    '      )',
    '    }',
    '  }',
    '}',
    '// dp[m][n] 就是最少操作数'
  ],

  run() {
    const s1 = S1
    const s2 = S2
    const m = s1.length
    const n = s2.length

    // 第 0 行 / 第 0 列：空串变成长度 k 的串，只能插入 k 次
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(-1))
    for (let j = 0; j <= n; j++) dp[0][j] = j
    for (let i = 0; i <= m; i++) dp[i][0] = i

    const steps = []
    const snap = (o) =>
      steps.push({
        view: 'matrix',
        matrix: dp.map((row) => [...row]),
        s1,
        s2,
        ...o
      })

    snap({
      line: 0,
      desc: `把 s1 = "${s1}" 改成 s2 = "${s2}"。第 0 行表示"空串变成 s2 的一段"要插几次，第 0 列表示"把 s1 的一段删空"要删几次。`,
      action: { icon: '🧮', label: '初始化' }
    })

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const c1 = s1[i - 1]
        const c2 = s2[j - 1]

        if (c1 === c2) {
          dp[i][j] = dp[i - 1][j - 1]
          snap({
            line: 3,
            desc: `'${c1}' 和 '${c2}' 一样 → 这一步不用动，直接抄左上角 ${dp[i][j]}。`,
            cell: [i, j],
            from: [[i - 1, j - 1]],
            action: { icon: '🟰', label: '相同' }
          })
        } else {
          const del = dp[i - 1][j]
          const ins = dp[i][j - 1]
          const rep = dp[i - 1][j - 1]
          const best = Math.min(del, ins, rep)
          dp[i][j] = best + 1
          const why =
            best === rep ? `替换（左上角 ${rep}）` : best === del ? `删掉 '${c1}'（上边 ${del}）` : `插入 '${c2}'（左边 ${ins}）`

          snap({
            line: 6,
            desc: `'${c1}' ≠ '${c2}' → 三种操作里挑最省的：删 ${del} / 插 ${ins} / 改 ${rep}，取最小值 ${best}，所以 ${best} + 1 = ${dp[i][j]}。这一格选的是${why}。`,
            cell: [i, j],
            from: [
              [i - 1, j],
              [i, j - 1],
              [i - 1, j - 1]
            ],
            action: { icon: '✏️', label: '填表' }
          })
        }
      }
    }

    const dist = dp[m][n]

    snap({
      line: 13,
      desc: `右下角 dp[${m}][${n}] = ${dist}，这就是最少操作数。现在从右下角往回走，看看具体是哪几步。`,
      cell: [m, n],
      action: { icon: '🔎', label: '回溯' }
    })

    // 回溯：从哪儿来的就往哪儿走
    const path = []
    let i = m
    let j = n
    const ops = []
    while (i > 0 || j > 0) {
      path.push([i, j])
      if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
        ops.push(`保留 '${s1[i - 1]}'`)
        i--
        j--
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        ops.push(`把 '${s1[i - 1]}' 改成 '${s2[j - 1]}'`)
        i--
        j--
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        ops.push(`删掉 '${s1[i - 1]}'`)
        i--
      } else {
        ops.push(`插入 '${s2[j - 1]}'`)
        j--
      }
    }
    path.push([0, 0])

    snap({
      line: 13,
      desc: `从右下角一路走回左上角，经过的格子（紫色）就是真正用到的那条路径 —— 其余格子都是算过但没用上的。`,
      cell: [0, 0],
      highlightPath: path,
      action: { icon: '🛤️', label: '路径' }
    })

    snap({
      line: 13,
      desc: `一共 ${dist} 步：${ops.reverse().join('，')}。整张表 ${m} × ${n} 格，每格 O(1)，所以是 O(m·n)。`,
      cell: [m, n],
      highlightPath: path,
      action: { icon: '🏁', label: '完成' }
    })

    return { steps, result: dist }
  }
}