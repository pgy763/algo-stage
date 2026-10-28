/**
 * 多语言执行服务（runner/）的客户端。
 * JS 在浏览器里跑，Python / C / C++ / Java 走后端。
 */

const BASE = (import.meta.env.VITE_RUNNER_URL || 'http://localhost:5199').replace(/\/$/, '')

export const LANGS = [
  { id: 'javascript', label: 'JavaScript', mode: 'browser' },
  { id: 'python', label: 'Python', mode: 'remote' },
  { id: 'cpp', label: 'C++', mode: 'remote' },
  { id: 'c', label: 'C', mode: 'remote' },
  { id: 'java', label: 'Java', mode: 'remote' }
]

export async function checkEnv() {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 3000)
    const r = await fetch(`${BASE}/api/env`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function runRemote({ lang, code, input, inputKind = 'array', inputRaw, extras, entry }) {
  let r
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 60000)
    r = await fetch(`${BASE}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, code, input, inputKind, inputRaw, extras, entry: entry || null }),
      signal: ctrl.signal
    })
    clearTimeout(timer)
  } catch (e) {
    if (e.name === 'AbortError') {
      return { ok: false, error: '执行服务超时（60 秒）。检查一下代码里是不是有死循环。' }
    }
    return {
      ok: false,
      error: `连不上执行服务（${BASE}）。\n请先在 runner 目录下执行 npm start，再回来重试。`
    }
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    // 服务端错误也是 JSON（{ok:false, error:'...'}）：优先显示那句人话，
    // 别把一整段 {"ok":false,...} 直接糊到错误面板里
    let msg = ''
    try {
      msg = JSON.parse(text)?.error || ''
    } catch {
      /* 不是 JSON 就用原文 */
    }
    return {
      ok: false,
      error: msg || `执行服务返回 ${r.status}：${text.slice(0, 200)}`
    }
  }

  try {
    return await r.json()
  } catch {
    return { ok: false, error: '执行服务返回了看不懂的内容' }
  }
}
