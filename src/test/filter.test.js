import { describe, expect, it } from 'vitest'
import { filterAlgorithms, matchesQuery } from '../algorithms/filter.js'
import { algorithms } from '../algorithms/index.js'

/** 用真实注册表当数据源：字段少拼一个，这里就会挂 */
describe('首页搜索：单条匹配', () => {
  const heap = algorithms.find((a) => a.id === 'heap-sort')

  it('空查询 / 纯空格 = 全部匹配', () => {
    expect(matchesQuery(heap, '')).toBe(true)
    expect(matchesQuery(heap, '   ')).toBe(true)
    expect(matchesQuery(heap, undefined)).toBe(true)
  })

  it('中文名能搜到', () => {
    expect(matchesQuery(heap, '堆排序')).toBe(true)
  })

  it('英文名大小写不敏感', () => {
    expect(matchesQuery(heap, 'heap')).toBe(true)
    expect(matchesQuery(heap, 'HEAP SORT')).toBe(true)
  })

  it('id 能搜到', () => {
    expect(matchesQuery(heap, 'heap-sort')).toBe(true)
  })

  it('类别能搜到', () => {
    expect(matchesQuery(heap, '排序')).toBe(true)
  })

  it('复杂度能搜到', () => {
    expect(matchesQuery(heap, 'n log n')).toBe(true)
  })

  it('多个关键词必须全部命中', () => {
    expect(matchesQuery(heap, '堆 排序')).toBe(true)
    expect(matchesQuery(heap, '堆 动态规划')).toBe(false)
  })

  it('搜不到就是 false', () => {
    expect(matchesQuery(heap, '迪杰斯特拉')).toBe(false)
  })
})

describe('首页搜索：整表过滤', () => {
  it('不传参数时返回全部', () => {
    expect(filterAlgorithms(algorithms)).toHaveLength(algorithms.length)
  })

  it('分类过滤仍然有效', () => {
    const sorts = filterAlgorithms(algorithms, '排序', '')
    expect(sorts.length).toBeGreaterThan(0)
    expect(sorts.every((a) => a.category === '排序')).toBe(true)
  })

  it('分类 + 关键词叠加', () => {
    const hits = filterAlgorithms(algorithms, '排序', '堆')
    expect(hits).toHaveLength(1)
    expect(hits[0].id).toBe('heap-sort')
  })

  it('分类与关键词冲突时返回空', () => {
    expect(filterAlgorithms(algorithms, '排序', '禁忌搜索')).toHaveLength(0)
  })

  it('「DP」能搜到名字里带 DP 的算法（大小写不敏感）', () => {
    const ids = filterAlgorithms(algorithms, '全部', 'dp').map((a) => a.id)
    expect(ids).toContain('lis')
    expect(ids).toContain('edit-distance')
    expect(ids).not.toContain('bubble-sort')
  })

  it('每个算法都能被自己的中文名搜到', () => {
    for (const a of algorithms) {
      const hits = filterAlgorithms(algorithms, '全部', a.name)
      expect(hits.map((x) => x.id), `搜不到 ${a.name}`).toContain(a.id)
    }
  })
})