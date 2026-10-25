const N = 6

export default {
  id: 'n-queens',
  name: 'N 皇后（回溯）',
  en: 'N-Queens Backtracking',
  category: '回溯',
  level: '进阶',
  view: 'grid',
  complexity: { time: 'O(n!) 最坏', space: 'O(n)' },
  summary: '一行一行放皇后，放不下就退回去换一列 —— 回溯的本质就是"撞墙了就撤销上一步"。',
  inputType: 'none',
  code: [
    'function solve(row) {',
    '  if (row === n) { record(board); return; }',
    '  for (let col = 0; col < n; col++) {',
    '    if (!isSafe(row, col)) continue;',
    '    board[row] = col;          // 放置',
    '    solve(row + 1);            // 递归下一行',
    '    board[row] = -1;           // 撤销（回溯）',
    '  }',
    '}'
  ],

  run() {
    const n = N
    const board = Array(n).fill(-1) // 每行皇后所在的列
    const steps = []
    let solutions = 0
    let attempts = 0
    let backtracks = 0
    const firstSolution = []

    const render = () => {
      const g = Array.from({ length: n }, () => Array(n).fill(0))
      for (let r = 0; r < n; r++) {
        if (board[r] >= 0) g[r][board[r]] = 6
      }
      return g
    }

    const snap = (o) => steps.push({ view: 'grid', grid: render(), size: n, ...o })

    snap({
      line: 0,
      desc: `${n} × ${n} 的棋盘要放 ${n} 个皇后，任意两个不能同行、同列、同对角线。逐行放置，每行放一个。`
    })

    // 冲突检测
    const isSafe = (row, col) => {
      for (let r = 0; r < row; r++) {
        const c = board[r]
        if (c === col) return { ok: false, reason: `第 ${r} 行的皇后也在第 ${col} 列` }
        if (Math.abs(c - col) === row - r) {
          return { ok: false, reason: `和第 ${r} 行的皇后在同一条对角线上` }
        }
      }
      return { ok: true }
    }

    const solve = (row) => {
      if (row === n) {
        solutions++
        if (solutions === 1) firstSolution.push(...board)
        snap({
          line: 1,
          desc: `找到第 ${solutions} 个解！每行都放下了一个合法皇后。继续找下一个解……`,
          success: true
        })
        return
      }

      for (let col = 0; col < n; col++) {
        attempts++
        const check = isSafe(row, col)

        if (!check.ok) {
          snap({
            line: 3,
            desc: `第 ${row + 1} 行试第 ${col + 1} 列：${check.reason}，跳过。`,
            conflict: [row, col]
          })
          continue
        }

        board[row] = col
        snap({
          line: 4,
          desc: `第 ${row + 1} 行放在第 ${col + 1} 列 —— 安全，继续下一行。`
        })

        solve(row + 1)

        board[row] = -1
        backtracks++
        snap({
          line: 6,
          desc: `第 ${row + 1} 行往下的路走完了，撤销这个皇后（回溯），换下一列再试。累计回退 ${backtracks} 次。`
        })
      }
    }

    solve(0)

    steps.push({
      view: 'grid',
      grid: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (firstSolution[r] === c ? 6 : 0))),
      size: n,
      line: 7,
      desc: `全部搜索完成：${n} 皇后共有 ${solutions} 个解。一共尝试了 ${attempts} 次放置、回退了 ${backtracks} 次。`
    })

    return { steps, result: solutions }
  }
}
