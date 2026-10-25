/**
 * AI 逐行解说：调用本地 runner 的 /api/explain。
 * key 只存在 runner/.env（已在 .gitignore 里），前端和仓库都拿不到。
 */

const BASE = (import.meta.env.VITE_RUNNER_URL || 'http://localhost:5199').replace(/\/$/, '')
const CACHE_PREFIX = 'algo-stage:ai:'

function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + '-' + str.length.toString(36)
}

function cacheKey(lang, code) {
  return CACHE_PREFIX + hash(lang + '\u0000' + code)
}

/** 读本地缓存（同语言 + 同代码直接复用，不再花钱） */
export function getCachedExplanations(lang, code) {
  try {
    const raw = localStorage.getItem(cacheKey(lang, code))
    if (!raw) return null
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' && Object.keys(obj).length ? obj : null
  } catch {
    return null
  }
}

function saveCache(lang, code, map) {
  try {
    localStorage.setItem(cacheKey(lang, code), JSON.stringify(map))
  } catch {
    /* 存不下就算了（隐私模式等） */
  }
}

/** 单批请求：行数少一点，模型回得快，也不容易超时 */
async function requestChunk({ lang, code, lines }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 75000)
  try {
    const r = await fetch(`${BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, code, lines }),
      signal: ctrl.signal
    })
    const data = await r.json()
    return data.ok && data.map ? data.map : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 请求逐行解说。lines 是 1 起的行号数组。
 * 行长时拆成几批并发问（一次问 35 行，模型要憋一分半），回一批就先用一批。
 * 返回 { 行号: "解说文字" }，全失败返回 null
 */
export async function fetchExplanations({ lang, code, lines, onPartial }) {
  if (!lines || !lines.length) return null

  const CHUNK = 10
  const chunks = []
  for (let i = 0; i < lines.length; i += CHUNK) chunks.push(lines.slice(i, i + CHUNK))

  const merged = {}
  let cursor = 0
  const CONCURRENCY = 3

  async function worker() {
    while (cursor < chunks.length) {
      const my = chunks[cursor++]
      const map = await requestChunk({ lang, code, lines: my })
      if (map) {
        Object.assign(merged, map)
        if (onPartial) onPartial({ ...merged })
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker))

  if (!Object.keys(merged).length) return null
  saveCache(lang, code, merged)
  return merged
}
