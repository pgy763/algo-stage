// Dijkstra 加权迷宫：平地通行成本 1，沼泽成本 5。
// 和 BFS 的区别：BFS 一圈圈扩散只对「等权」成立，有权重时贪心就近可能绕远。

const MAZE = [
  'S...~~....E',
  '.###.####.#.',
  '.#~~....#.#.',
  '.#.##~~.#.#.',
  '.#.#..#...#.',
  '...#..###.#.',
  '.#.#~~....#.',
  '.#.#####~~#.',
  '.#....~~...#'
]

const COST_FLAT = 1
const COST_SWAMP = 5

export default {
  id: 'dijkstra-maze',
  name: 'Dijkstra 最短路',
  en: 'Dijkstra',
  category: '图与搜索',
  level: '进阶',
  view: 'grid',
  complexity: { time: 'O(V²)（数组版）', space: 'O(V)' },
  summary: '带权地图上的最短路：每次挑「已知距离最小」的格子确定，沼泽贵但有时值得走。',
  inputType: 'none',
  code: [
    'const dist = ...; dist[sr][sc] = 0;',
    'while (还有没确定的格子) {',
    '  const [r, c] = 未确定中 dist 最小的;',
    '  if (dist[r][c] === ∞) break; // 剩下的都不可达',
    '  确定[r][c] = true;',
    '  if (r === tr && c === tc) break;',
    '  for (const [nr, nc] of 邻居) {',
    '    const nd = dist[r][c] + cost(nr, nc);',
    '    if (nd < dist[nr][nc]) dist[nr][nc] = nd;',
    '  }',
    '}',
    '// 回溯 prev 得到最短路径'
  ],

  run() {
    const rows = MAZE.length
    const cols = MAZE[0].length
    const WALL = 1
    const SWAMP = 7

    const grid = []
    const cost = []
    let sr = 0
    let sc = 0
    let tr = 0
    let tc = 0

    for (let r = 0; r < rows; r++) {
      grid.push([])
      cost.push([])
      for (let c = 0; c < cols; c++) {
        const ch = MAZE[r][c]
        if (ch === '#') {
          grid[r].push(WALL)
          cost[r].push(Infinity)
        } else if (ch === '~') {
          grid[r].push(SWAMP)
          cost[r].push(COST_SWAMP)
        } else {
          grid[r].push(0)
          cost[r].push(COST_FLAT)
          if (ch === 'S') { sr = r; sc = c }
          if (ch === 'E') { tr = r; tc = c }
        }
      }
    }

    const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity))
    const done = Array.from({ length: rows }, () => Array(cols).fill(false))
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null))
    const steps = []
    const snap = (o) => steps.push({ view: 'grid', grid: grid.map((r) => [...r]), ...o })

    dist[sr][sc] = 0
    snap({ line: 0, desc: `起点 dist = 0，其它全是 ∞。沼泽（黄色）进入成本 5，平地是 1。` })

    let found = false
    let settled = 0

    while (settled < rows * cols) {
      // 线性找未确定中 dist 最小的（教学版；生产用堆）
      let best = Infinity
      let br = -1
      let bc = -1
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!done[r][c] && dist[r][c] < best) {
            best = dist[r][c]
            br = r
            bc = c
          }
        }
      }
      if (br === -1) break

      done[br][bc] = true
      settled++
      grid[br][bc] = 3
      snap({
        line: 2,
        desc: `所有未确定的里 dist 最小的是 (${br}, ${bc}) = ${best}。它的最短距离就此敲定 —— Dijkstra 的贪心：近的永远先确定。`
      })

      if (br === tr && bc === tc) {
        found = true
        snap({ line: 4, desc: `终点确定！最短成本 = ${best}。注意路线：穿沼泽未必亏，绕路未必省。` })
        break
      }

      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      let relaxed = 0
      for (const [dr, dc] of dirs) {
        const nr = br + dr
        const nc = bc + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (grid[nr][nc] === WALL || done[nr][nc]) continue
        const nd = best + cost[nr][nc]
        if (nd < dist[nr][nc]) {
          dist[nr][nc] = nd
          prev[nr][nc] = [br, bc]
          if (grid[nr][nc] !== SWAMP) grid[nr][nc] = 5
          relaxed++
        }
      }

      grid[br][bc] = 2
      snap({
        line: 10,
        desc: `松了 ${relaxed} 个邻居的距离。黄色沼泽 cost=5，除非绕路更贵，否则 Dijkstra 不怕走它。已确定 ${settled} 格。`
      })
    }

    if (!found) {
      snap({ line: 14, desc: '终点不可达。' })
      return { steps, result: null }
    }

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
      snap({ line: 14, desc: i === 0 ? '从终点沿 prev 回溯最短路径。' : `回溯到 (${r}, ${c})。` })
    }

    snap({
      line: 14,
      desc: `最终成本 ${dist[tr][tc]}。对比一下：这条路上沼泽多走了几步，但每步 5 的成本仍比绕远路划算 —— 这就是「带权」和「等权」的差别。`
    })

    return { steps, result: path }
  }
}
