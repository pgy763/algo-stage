const S1 = 'ABCBDAB'
const S2 = 'BDCABA'

export default {
  id: 'lcs-dp',
  name: '最长公共子序列（DP）',
  en: 'Longest Common Subsequence',
  category: '动态规划',
  level: '进阶',
  view: 'matrix',
  complexity: { time: 'O(m·n)', space: 'O(m·n)' },
  summary: '一张二维表，每格只关心左边、上边、左上角三个邻居 —— 把大问题拆成一格一格的小问题。',
  inputType: 'none',
  code: [
    'for (let i = 1; i <= m; i++) {',
    '  for (let j = 1; j <= n; j++) {',
    '    if (s1[i - 1] === s2[j - 1]) {',
    '      dp[i][j] = dp[i - 1][j - 1] + 1;   // 字符相同：左上角 +1',
    '    } else {',
    '      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);',
    '    }',
    '  }',
    '}',
    '// dp[m][n] 就是 LCS 的长度'
  ],

  run() {
    const s1 = S1
    const s2 = S2
    const m = s1.length
    const n = s2.length

    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(-1))
    for (let j = 0; j <= n; j++) dp[0][j] = 0
    for (let i = 1; i <= m; i++) {
      dp[i][0] = 0
    }

    const steps = []
    const snap = (o) =>
      steps.push({
        view: 'matrix',
        matrix: dp.map((r) => [...r]),
        s1,
        s2,
        ...o
      })

    snap({
      line: 0,
      desc: `两个字符串：s1 = "${s1}"（${m} 个字符），s2 = "${s2}"（${n} 个字符）。第 0 行和第 0 列填 0，表示"空串和任何串的公共子序列长度都是 0"。`
    })

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const ch1 = s1[i - 1]
        const ch2 = s2[j - 1]

        if (ch1 === ch2) {
          dp[i][j] = dp[i - 1][j - 1] + 1
          snap({
            line: 3,
            desc: `s1[${i - 1}] = '${ch1}' 和 s2[${j - 1}] = '${ch2}' 相同 → 直接用左上角 ${dp[i - 1][j - 1]} + 1 = ${dp[i][j]}。`,
            cell: [i, j],
            from: [[i - 1, j - 1]],
            match: true
          })
        } else {
          const up = dp[i - 1][j]
          const left = dp[i][j - 1]
          dp[i][j] = Math.max(up, left)
          snap({
            line: 5,
            desc: `'${ch1}' ≠ '${ch2}' → 取上边 ${up} 和左边 ${left} 里大的那个，填 ${dp[i][j]}。`,
            cell: [i, j],
            from: [
              [i - 1, j],
              [i, j - 1]
            ],
            match: false
          })
        }
      }
    }

    const len = dp[m][n]

    // 回溯出具体的 LCS
    const path = []
    let i = m
    let j = n
    const chars = []
    while (i > 0 && j > 0) {
      path.push([i, j])
      if (s1[i - 1] === s2[j - 1]) {
        chars.push(s1[i - 1])
        i--
        j--
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--
      } else {
        j--
      }
    }
    const lcs = chars.reverse().join('')

    snap({
      line: 9,
      desc: `右下角 dp[${m}][${n}] = ${len}，这就是最长公共子序列的长度。现在从右下角往回走，遇到"左上角推过来"的格子就记下字符。`,
      cell: [m, n],
      highlightPath: path
    })

    for (let k = 0; k < path.length; k++) {
      const [r, c] = path[k]
      snap({
        line: 9,
        desc: `回溯到 dp[${r}][${c}]${s1[r - 1] === s2[c - 1] ? `，'${s1[r - 1]}' 是答案的一部分` : ''}。`,
        cell: [r, c],
        highlightPath: path.slice(0, k + 1)
      })
    }

    snap({
      line: 9,
      desc: `最长公共子序列是 "${lcs}"，长度 ${len}。整张表 ${m} × ${n} 共算了 ${m * n} 格，所以是 O(m·n)。`,
      cell: [m, n],
      highlightPath: path,
      done: true
    })

    return { steps, result: { length: len, lcs } }
  }
}
