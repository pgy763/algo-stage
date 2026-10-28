import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrubber } from '../composables/useScrubber.js'

/**
 * 进度条拖动的逻辑测试。
 * 不装 jsdom：这个 composable 只用到 clientX、currentTarget.getBoundingClientRect()
 * 和 window 上的两个监听，手搓一个假窗口就够了。
 */

function fakeTrack(left = 100, width = 200) {
  return {
    getBoundingClientRect: () => ({ left, width, top: 0, height: 5 }),
    setPointerCapture: () => {},
    releasePointerCapture: () => {}
  }
}

/** 记录 window 上挂了哪些监听，方便手动触发 */
function installFakeWindow() {
  const listeners = new Map()
  globalThis.window = {
    addEventListener: vi.fn((type, fn) => listeners.set(type, fn)),
    removeEventListener: vi.fn((type) => listeners.delete(type)),
    _fire: (type, ev) => listeners.get(type)?.(ev),
    _listeners: listeners
  }
  return globalThis.window
}

const pointer = (clientX, extra = {}) => ({
  button: 0,
  clientX,
  preventDefault: () => {},
  ...extra
})

describe('useScrubber', () => {
  beforeEach(() => installFakeWindow())
  afterEach(() => {
    delete globalThis.window
  })

  it('按下时按横向比例定位（0~1）', () => {
    const seen = []
    const { onPointerDown } = useScrubber((r) => seen.push(r))

    onPointerDown({ ...pointer(150), currentTarget: fakeTrack() })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toBeCloseTo(0.25)

    onPointerDown({ ...pointer(300), currentTarget: fakeTrack() })
    expect(seen[1]).toBeCloseTo(1)
  })

  it('左右拖出轨道时夹在 0 和 1 之间', () => {
    const seen = []
    const { onPointerDown } = useScrubber((r) => seen.push(r))

    onPointerDown({ ...pointer(20), currentTarget: fakeTrack() })
    expect(seen[0]).toBe(0)

    onPointerDown({ ...pointer(9999), currentTarget: fakeTrack() })
    expect(seen[1]).toBe(1)
  })

  it('按住拖动会连续回调，松手后摘掉全局监听', () => {
    const seen = []
    const { onPointerDown } = useScrubber((r) => seen.push(r))
    const track = fakeTrack()

    onPointerDown({ ...pointer(100), currentTarget: track })
    window._fire('pointermove', pointer(200))
    window._fire('pointermove', pointer(300))

    expect(seen.map((r) => Math.round(r * 100))).toEqual([0, 50, 100])
    expect(window._listeners.has('pointermove')).toBe(true)

    window._fire('pointerup', pointer(300))
    expect(window._listeners.has('pointermove')).toBe(false)
    expect(window._listeners.has('pointerup')).toBe(false)
  })

  it('右键/中键不抢拖动', () => {
    const seen = []
    const { onPointerDown } = useScrubber((r) => seen.push(r))

    onPointerDown({ ...pointer(150, { button: 2 }), currentTarget: fakeTrack() })
    expect(seen).toHaveLength(0)
    expect(window._listeners.size).toBe(0)
  })

  it('轨道宽度为 0 时不炸（隐藏状态下点到）', () => {
    const seen = []
    const { onPointerDown } = useScrubber((r) => seen.push(r))

    onPointerDown({ ...pointer(150), currentTarget: fakeTrack(0, 0) })
    expect(seen).toEqual([0])
  })
})