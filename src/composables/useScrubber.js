/**
 * 进度条拖动。
 *
 * 之前只能点一下，README 里写的「拖进度条」其实做不到。
 * 这里用 Pointer Events 统一鼠标 / 触屏 / 手写笔：
 *   - 按下立刻跳到那个位置
 *   - 按住左右拖，实时跟手
 *   - 松手（或 pointercancel）就摘掉全局监听
 *
 * 回调只负责把「比例」变成第几帧，播放状态由调用方自己 pause。
 */
export function useScrubber(onSeek) {
  function ratioAt(e, el) {
    const rect = el.getBoundingClientRect()
    if (!rect.width) return 0
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }

  function onPointerDown(e) {
    // 只处理主键（鼠标右键 / 中键拖动不抢）
    if (e.button !== undefined && e.button !== 0) return
    const el = e.currentTarget
    if (!el) return
    e.preventDefault()
    onSeek(ratioAt(e, el))

    const move = (ev) => onSeek(ratioAt(ev, el))
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
  }

  return { onPointerDown }
}
