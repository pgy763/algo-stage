const MAZE = [
  '............',
  '.###.####.#.',
  '.#......#.#.',
  '.#.####.#.#.',
  '.#.#..#...#.',
  '...#..###.#.',
  '.#.#......#.',
  '.#.######.#.',
  '............'
]

export default {
  id: 'bfs-maze',
  name: 'BFS 广度优先搜索',
  en: 'Breadth-First Search',
  category: '图与搜索',
  level: '进阶',
  view: 'grid',
  complexity: { time: 'O(V + E)', space: 'O(V)' },
  summary: '像水波一样一圈一圈往外扩，先到达的一定是最短路。',
  inputType: 'none',
  code: [
    'const queue = [[sr, sc]];',
    'const seen = ...; seen[sr][sc] = true;',
    'while (queue.length) {',
    '  const [r, c] = queue.shift();',
    '  if (r === tr && c === tc) break;',
    '  for (const [dr, dc] of dirs) {',
    '    const nr = r + dr, nc = c + dc;',
    '    if (越界 || 是墙 || 已访问) continue;',
    '    seen[nr][nc] = true;',
    '    prev[nr][nc] = [r, c];',
    '    queue.push([nr, nc]);',
    '  }',
    '}',
    '// 从终点沿 prev 回溯，就是最短路径'
  ],

  run() {
    const rows = MAZE.length
    const cols = MAZE[0].length
    const WALL = 1
    const base = MAZE.map((row) => [...row].map((ch) => (ch === '#' ? WALL : 0)))

    const sr = 0
    const sc = 0
    const tr = rows - 1
    const tc = cols - 1

    // 0 空地 / 1 墙 / 2 已访问 / 3 当前 / 4 最短路 / 5 队列中
    const grid = base.map((r) => [...r])
    const steps = []
    const seen = Array.from({ length: rows }, () => Array(cols).fill(false))
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null))

    const snap = (o) => steps.push({ view: 'grid', grid: grid.map((r) => [...r]), ...o })

    snap({ line: 0, desc: `迷宫 ${rows} × ${cols}，深色是墙。从左上角出发，到右下角。把起点放进队列。` })

    const queue = [[sr, sc]]
    seen[sr][sc] = true
    grid[sr][sc] = 3
    snap({ line: 1, desc: `起点入队并标记已访问。队列长度 = 1。` })

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]

    let found = false
    let visitedCount = 0

    while (queue.length) {
      const [r, c] = queue.shift()
      visitedCount++
      grid[r][c] = 3

      snap({
        line: 3,
        desc: `从队首取出 (${r}, ${c})，检查它的上下左右。队列里还剩 ${queue.length} 个待探索。`
      })

      if (r === tr && c === tc) {
        found = true
        snap({ line: 4, desc: `到达终点 (${tr}, ${tc})！BFS 保证这是最短路径（步数最少）。` })
        break
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr
        const nc = c + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (grid[nr][nc] === WALL || seen[nr][nc]) continue

        seen[nr][nc] = true
        prev[nr][nc] = [r, c]
        queue.push([nr, nc])
        grid[nr][nc] = 5
      }

      grid[r][c] = 2
      snap({
        line: 11,
        desc: `新邻居入队（浅蓝色），(${r}, ${c}) 变成已访问（深蓝）。队列长度 = ${queue.length}。`
      })
    }

    if (!found) {
      snap({ line: 12, desc: '队列空了还没到终点 —— 说明这个迷宫根本走不通。' })
      return { steps, result: null }
    }

    // 回溯路径
    const path = []
    let cur = [tr, tc]
    while (cur) {
      path.push(cur)
      cur = prev[cur[0]][cur[1]]
    }
    path.reverse()

    for (let i = 0; i < path.length; i++) {
      const [r, c] = path[i]
      grid[r][c] = 4
      snap({
        line: 13,
        desc: i === 0 ? '从终点沿 prev 指针往回走，把路径一个个标出来。' : `回溯到 (${r}, ${c})……`,
      })
    }

    snap({
      line: 13,
      desc: `最短路径长度 ${path.length} 步。注意：一共访问了 ${visitedCount} 个格子，BFS 用"多探索"换来了"一定最短"。`
    })

    return { steps, result: path }
  }
}
