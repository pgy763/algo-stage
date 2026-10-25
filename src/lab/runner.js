/**
 * 在 Web Worker 里跑用户代码，主线程只负责超时兜底。
 */
export function runUserCode({ code, entry, input, inputKind = 'array', extras, timeoutMs = 5000 }) {
  return new Promise((resolve) => {
    let worker
    try {
      worker = new Worker(new URL('./labWorker.js', import.meta.url), { type: 'module' })
    } catch (e) {
      resolve({ ok: false, error: '无法启动沙箱：' + e.message })
      return
    }

    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      worker.terminate()
      resolve({
        ok: false,
        error: `执行超过 ${Math.round(timeoutMs / 1000)} 秒被终止。检查一下是不是有循环没有退出条件。`
      })
    }, timeoutMs)

    worker.onmessage = (e) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.terminate()
      resolve(e.data)
    }

    worker.onerror = (e) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.terminate()
      resolve({ ok: false, error: e.message || '沙箱执行异常' })
    }

    worker.postMessage({ code, entry, input, inputKind, extras })
  })
}
