import { describe, expect, it } from 'vitest'
import { algorithms, byId, categories } from '../algorithms/index.js'

/**
 * 内置算法的「步骤协议」测试。
 *
 * 每个算法就是一个文件 + 一行注册，最容易出的错是：
 *   - line 写越过 code 数组（高亮跑到不存在的行，左边代码栏一片空白）
 *   - desc 漏写（旁白空一句）
 *   - 指针 / 区间 / 下标越界（渲染组件按数组长度取数据，越界就画错）
 *   这些在页面上不一定报错，只会"看着怪"，所以用测试兜住。
 */

const REQUIRED_META = ['id', 'name', 'category', 'level', 'view', 'summary', 'code', 'run']
const VIEWS = ['array', 'grid', 'tree', 'matrix']

describe('注册表', () => {
  it('至少注册了一个算法', () => {
    expect(algorithms.length).toBeGreaterThan(0)
  })

  it('id 不重复', () => {
    const ids = algorithms.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('byId 能找到，找不到返回 null', () => {
    expect(byId(algorithms[0].id)).toBe(algorithms[0])
    expect(byId('不存在的算法')).toBeNull()
  })

  it('分类列表以「全部」开头且不含重复项', () => {
    expect(categories[0]).toBe('全部')
    expect(new Set(categories).size).toBe(categories.length)
  })
})

describe.each(algorithms.map((a) => [a.id, a]))('算法 %s', (id, algo) => {
  it('元数据齐全', () => {
    for (const key of REQUIRED_META) {
      expect(algo[key], `缺少 ${key}`).toBeDefined()
    }
    expect(VIEWS).toContain(algo.view)
    expect(Array.isArray(algo.code)).toBe(true)
    expect(algo.code.length).toBeGreaterThan(0)
    expect(algo.complexity?.time).toBeTruthy()
  })

  it('run() 返回至少两帧，且每帧都符合 step 协议', () => {
    const out = algo.run(algo.defaultInput)
    expect(out).toBeTypeOf('object')
    expect(Array.isArray(out.steps)).toBe(true)
    expect(out.steps.length).toBeGreaterThan(1)

    out.steps.forEach((step, i) => {
      const at = `${id} 第 ${i} 帧`

      // --- 必填 ---
      expect(Number.isInteger(step.line), `${at}: line 必须是整数`).toBe(true)
      expect(step.line, `${at}: line ${step.line} 越界（code 只有 ${algo.code.length} 行）`).toBeGreaterThanOrEqual(0)
      expect(step.line, `${at}: line ${step.line} 越界（code 只有 ${algo.code.length} 行）`).toBeLessThan(algo.code.length)
      expect(typeof step.desc, `${at}: desc 必须是字符串`).toBe('string')
      expect(step.desc.trim(), `${at}: desc 不能为空`).not.toBe('')

      // --- 数组下标类字段 ---
      if (Array.isArray(step.array)) {
        const n = step.array.length
        for (const key of ['compare', 'swap', 'sorted']) {
          for (const idx of step[key] || []) {
            expect(Number.isInteger(idx), `${at}: ${key} 里出现非整数 ${idx}`).toBe(true)
            expect(idx, `${at}: ${key} 里的 ${idx} 越界（数组长度 ${n}）`).toBeGreaterThanOrEqual(0)
            expect(idx, `${at}: ${key} 里的 ${idx} 越界（数组长度 ${n}）`).toBeLessThan(n)
          }
        }
        for (const p of step.pointers || []) {
          expect(typeof p.name, `${at}: 指针缺 name`).toBe('string')
          expect(Number.isInteger(p.index), `${at}: 指针 ${p.name} 的 index 不是整数`).toBe(true)
          expect(p.index, `${at}: 指针 ${p.name}=${p.index} 越界（数组长度 ${n}）`).toBeGreaterThanOrEqual(0)
          expect(p.index, `${at}: 指针 ${p.name}=${p.index} 越界（数组长度 ${n}）`).toBeLessThan(n)
        }
        if (step.range) {
          expect(step.range.from, `${at}: range.from 越界`).toBeGreaterThanOrEqual(0)
          expect(step.range.to, `${at}: range.to 越界`).toBeLessThan(n)
          expect(step.range.from, `${at}: range.from 应不大于 to`).toBeLessThanOrEqual(step.range.to)
        }
      }

      // --- 矩阵：每行等宽 ---
      if (Array.isArray(step.matrix) && step.matrix.length) {
        const widths = new Set(step.matrix.map((row) => (Array.isArray(row) ? row.length : -1)))
        expect(widths.size, `${at}: matrix 各行列数不一致`).toBe(1)
        if (step.cell) {
          expect(step.cell[0], `${at}: cell 行越界`).toBeLessThan(step.matrix.length)
          expect(step.cell[1], `${at}: cell 列越界`).toBeLessThan(step.matrix[0].length)
        }
      }

      // --- 网格：每行等宽 ---
      if (Array.isArray(step.grid) && step.grid.length) {
        const widths = new Set(step.grid.map((row) => (Array.isArray(row) ? row.length : -1)))
        expect(widths.size, `${at}: grid 各行列数不一致`).toBe(1)
      }

      // --- 树：current 要么是 -1，要么是真实节点 id ---
      if (Array.isArray(step.nodes) && step.nodes.length) {
        const ids = new Set(step.nodes.map((n) => n.id))
        if (step.current != null && step.current !== -1) {
          expect(ids.has(step.current), `${at}: current=${step.current} 不在 nodes 里`).toBe(true)
        }
        for (const n of step.nodes) {
          expect(Number.isFinite(n.x), `${at}: 节点缺 x`).toBe(true)
          expect(Number.isFinite(n.y), `${at}: 节点缺 y`).toBe(true)
          // 角标（拓扑排序用来画入度）必须是数字，否则会被渲染成 "undefined"
          if (n.sub != null) {
            expect(Number.isFinite(n.sub), `${at}: 节点 ${n.id} 的角标 sub 不是数字`).toBe(true)
            expect(n.sub, `${at}: 节点 ${n.id} 的角标 sub 是负数`).toBeGreaterThanOrEqual(0)
          }
        }

        // 显式边（有向图）：两端都必须是真实节点 id，且不能自环
        if (Array.isArray(step.edges) && step.edges.length) {
          for (const e of step.edges) {
            expect(ids.has(e.from), `${at}: 边起点 ${e.from} 不在 nodes 里`).toBe(true)
            expect(ids.has(e.to), `${at}: 边终点 ${e.to} 不在 nodes 里`).toBe(true)
            expect(e.from, `${at}: 出现自环 ${e.from} → ${e.to}`).not.toBe(e.to)
          }
        }
      }
    })
  })

  it('view 与步骤里画的形态一致', () => {
    const { steps } = algo.run(algo.defaultInput)
    const field = { array: 'array', grid: 'grid', tree: 'nodes', matrix: 'matrix' }[algo.view]
    const withData = steps.filter((s) => s[field] !== undefined)
    expect(withData.length, `${id}: 没有任何一帧带 ${field} 字段，但 view 声明成 ${algo.view}`).toBeGreaterThan(0)
  })
})