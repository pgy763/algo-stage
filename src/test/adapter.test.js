import { describe, expect, it } from 'vitest'
import { buildVisualSteps } from '../lab/adapter.js'

/**
 * adapter 把「每行的变量快照」变成动画帧。
 * 它是实验台里最容易出错觉的一层：形态选错、指针认错、交换没合并，
 * 页面照样能渲染，只是画出来不对 —— 所以这里按行为逐条钉住。
 */

/** 造一份 rawSteps：每项 { line, vars } */
const raw = (...varsList) => varsList.map((vars, i) => ({ line: i, vars }))

describe('buildVisualSteps 兜底', () => {
  it('空输入返回 ok:false', () => {
    expect(buildVisualSteps([]).ok).toBe(false)
    expect(buildVisualSteps(null).ok).toBe(false)
  })

  it('只有标量时退化成变量轨迹', () => {
    const out = buildVisualSteps(raw({ i: 0 }, { i: 1 }, { i: 2 }))
    expect(out.ok).toBe(true)
    expect(out.mode).toBe('vars')
    expect(out.steps.length).toBe(3)
    expect(out.steps[0].view).toBe('vars')
    expect(out.steps[1].desc).toBeTruthy()
  })
})

describe('形态识别', () => {
  it('一维数组，字符串按字符摊开', () => {
    const arr = buildVisualSteps(raw({ nums: [3, 1, 2] }, { nums: [1, 3, 2] }))
    expect(arr.mode).toBe('array')

    // 每帧画的是「这一行执行完」的状态，所以第一帧拿到的是第二份快照的数组
    const str = buildVisualSteps(raw({ s: 'abc' }, { s: 'abcd' }))
    expect(str.mode).toBe('array')
    expect(str.steps.at(-1).array).toEqual(['a', 'b', 'c', 'd'])
  })

  it('二维数组走矩阵，i/j 认成当前格', () => {
    const out = buildVisualSteps(raw({ dp: [[0, 0], [0, 0]], i: 0, j: 1 }, { dp: [[0, 5], [0, 0]], i: 0, j: 1 }))
    expect(out.mode).toBe('matrix')
    expect(out.steps.at(-1).matrix[0][1]).toBe(5)
    expect(out.steps.some((s) => s.cell && s.cell[0] === 0 && s.cell[1] === 1)).toBe(true)
  })

  it('链表对象按 __list 展开成行', () => {
    const out = buildVisualSteps(raw({ head: { __list: [1, 2] } }, { head: { __list: [1, 2, 3] } }))
    expect(out.mode).toBe('list')
    expect(out.steps.at(-1).rows[0].vals).toEqual([1, 2, 3])
  })

  it('树对象按层序数组建出节点', () => {
    const out = buildVisualSteps(raw({ root: { __tree: [1, 2, 3] } }, { root: { __tree: [1, 2, 3] } }))
    expect(out.mode).toBe('tree')
    expect(out.steps[0].nodes.map((n) => n.val).sort()).toEqual([1, 2, 3])
  })

  it('数组和矩阵里优先画"在变"的那个，而不是一动不动的入参', () => {
    // ratings 是入参（从不变化），left 是真正在填的辅助数组
    const out = buildVisualSteps(
      raw({ ratings: [1, 0, 2], left: [1, 0, 1] }, { ratings: [1, 0, 2], left: [1, 2, 1] })
    )
    expect(out.mode).toBe('array')
    expect(out.mainKey).toBe('left')
  })
})

describe('指针', () => {
  it('单字母 i 落在下标范围内就认成指针', () => {
    const out = buildVisualSteps(raw({ nums: [5, 6, 7], i: 1 }, { nums: [5, 6, 7], i: 2 }))
    const last = out.steps.at(-1)
    expect(last.pointers.map((p) => p.name)).toContain('i')
    expect(last.pointers.find((p) => p.name === 'i').index).toBe(2)
  })

  it('越界的值不当指针（右指针等于 n 是常见写法，不能画到不存在的格子上）', () => {
    const out = buildVisualSteps(raw({ nums: [5, 6, 7], j: 3 }, { nums: [5, 6, 7], j: 3 }))
    expect(out.steps.at(-1).pointers.map((p) => p.name)).not.toContain('j')
  })

  it('left/right 成对出现时画成区间光带', () => {
    const out = buildVisualSteps(raw({ nums: [1, 2, 3, 4], left: 1, right: 2 }))
    expect(out.steps[0].range).toEqual({ from: 1, to: 2 })
  })
})

describe('交换合并', () => {
  it('t=a[i]; a[i]=a[j]; a[j]=t 三步合成一帧交换动画', () => {
    // 快照是"执行这一行之前"拍的
    const steps = raw(
      { nums: [3, 1] }, // 0: 进函数
      { nums: [3, 1], t: 3 }, // 1: t = a[0]，还没改数组
      { nums: [1, 1], t: 3 }, // 2: a[0] = a[1]
      { nums: [1, 3], t: 3 } // 3: a[1] = t
    )
    const out = buildVisualSteps(steps)
    const swapped = out.steps.filter((s) => s.swap.length === 2)
    expect(swapped.length).toBe(1)
    expect(swapped[0].array).toEqual([1, 3])
    // 被合并掉的那一帧不再单独出现
    expect(out.steps.length).toBeLessThan(steps.length)
  })

  it('只改一格不会误判成交换', () => {
    const out = buildVisualSteps(raw({ nums: [3, 1] }, { nums: [9, 1] }, { nums: [9, 1] }))
    expect(out.steps.every((s) => s.swap.length === 0)).toBe(true)
  })
})

describe('旁白', () => {
  it('每帧都有话说，且讲的是这一步的变化', () => {
    const out = buildVisualSteps(raw({ nums: [3, 1] }, { nums: [3, 2] }))
    expect(out.steps.every((s) => s.desc && s.desc.trim())).toBe(true)
    expect(out.steps.some((s) => s.desc.includes('下标 1'))).toBe(true)
  })
})