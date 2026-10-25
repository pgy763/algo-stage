import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { runPython, findPython } from './langs/python.js'
import { runCpp, findCompiler } from './langs/cpp.js'
import { runJava } from './langs/java.js'

/** 读同目录的 .env（不引第三方依赖）；已存在的环境变量优先，不会被覆盖 */
async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '.env'), 'utf8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/)
      if (!m || line.trim().startsWith('#')) continue
      const val = m[2].replace(/^["']|["']$/g, '')
      if (process.env[m[1]] === undefined) process.env[m[1]] = val
    }
  } catch {
    /* 没有 .env 就算了 */
  }
}
await loadEnv()

const PORT = Number(process.env.PORT || 5199)
const MAX_BODY = 1024 * 1024

const AI_KEY = process.env.LLM_API_KEY || process.env.AI_API_KEY || ''
const AI_BASE = (process.env.LLM_BASE_URL || process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '')
const AI_MODEL = process.env.LLM_MODEL_ID || process.env.AI_MODEL || 'deepseek-chat'

/** 同一个文件不重复问模型 */
const explainCache = new Map()
const LANG_NAMES = { java: 'Java', python: 'Python', cpp: 'C++', c: 'C', javascript: 'JavaScript' }

/** 把整段代码 + 指定行丢给模型，要一份"行号 → 一句解说"的 JSON */
async function explainWithModel({ lang, code, lines }) {
  const src = code.split('\n')
  const listing = lines
    .map((n) => `${n}: ${String(src[n - 1] || '').trim()}`)
    .filter((l) => l.split(': ')[1])
    .join('\n')

  const prompt = [
    `下面是一段 ${LANG_NAMES[lang] || lang} 算法代码：`,
    '```',
    code.slice(0, 4000),
    '```',
    '',
    '请为下列每一行写一句中文解说（不超过 26 个字），说明这一行在执行什么、在算法里起什么作用。',
    '要求：讲人话、讲意图，不要复述代码，不要说"第X行"。',
    '',
    '行号与内容：',
    listing,
    '',
    '只输出 JSON，例如 {"7":"给左边孩子的糖数加一","9":"从右往左补齐另一侧"}。',
    '不要输出解释、不要代码块标记。'
  ].join('\n')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 60000)
  let resp
  try {
    resp = await fetch(`${AI_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${AI_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2500
      }),
      signal: ctrl.signal
    })
  } finally {
    clearTimeout(timer)
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`HTTP ${resp.status} ${text.slice(0, 200)}`)
  }

  const data = await resp.json()
  let text = data.choices?.[0]?.message?.content || ''
  text = text.replace(/```json|```/g, '').trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型没有返回 JSON')
  const parsed = JSON.parse(text.slice(start, end + 1))

  const map = {}
  for (const [k, v] of Object.entries(parsed)) {
    const n = Number(k)
    if (Number.isInteger(n) && typeof v === 'string' && v.trim()) map[n] = v.trim().slice(0, 60)
  }
  return map
}


const LANGS = {
  python: { label: 'Python 3', run: runPython },
  java: { label: 'Java', run: runJava },
  cpp: { label: 'C++17', run: runCpp },
  c: { label: 'C11', run: runCpp }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, code, payload) {
  cors(res)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function detectEnv() {
  const [py, compiler] = await Promise.all([findPython(), findCompiler()])
  return {
    python: { ok: !!py, detail: py ? `Python 3（${py}）` : '未找到' },
    cpp: { ok: !!compiler, detail: compiler ? compiler.version : '未找到 g++' },
    java: { ok: true, detail: 'JDK（javac）' },
    node: { ok: true, detail: process.version },
    ai: { ok: !!AI_KEY, model: AI_KEY ? AI_MODEL : '' }
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204).end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/api/env') {
    try {
      json(res, 200, await detectEnv())
    } catch (e) {
      json(res, 500, { error: e.message })
    }
    return
  }

  if (url.pathname === '/api/run' && req.method === 'POST') {
    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch (e) {
      json(res, 400, { ok: false, error: '请求格式错误：' + e.message })
      return
    }

    const lang = body.lang || 'python'
    const handler = LANGS[lang]
    if (!handler) {
      json(res, 400, { ok: false, error: `不支持的语言：${lang}` })
      return
    }
    if (!body.code || typeof body.code !== 'string') {
      json(res, 400, { ok: false, error: '代码不能为空' })
      return
    }

    const kind = ['array', 'string', 'matrix'].includes(body.inputKind) ? body.inputKind : 'array'
    const raw = body.input
    let input
    if (kind === 'string') {
      input = typeof raw === 'string' ? raw.slice(0, 300) : ''
    } else if (kind === 'matrix') {
      input = Array.isArray(raw)
        ? raw.slice(0, 20).map((r) => (Array.isArray(r) ? r.slice(0, 20) : []))
        : []
    } else {
      input = Array.isArray(raw) && raw.length ? raw.slice(0, 60) : [5, 3, 8, 1, 9, 2, 7, 4]
    }
    let dir
    try {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'algostage-'))
      const result = await handler.run({
        code: body.code,
        input,
        inputKind: kind,
        inputRaw: typeof body.inputRaw === 'string' ? body.inputRaw.slice(0, 300) : null,
        extras:
          body.extras && typeof body.extras === 'object'
            ? Object.fromEntries(
                Object.entries(body.extras)
                  .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
                  .slice(0, 12)
              )
            : {},
        entry: body.entry || null,
        lang,
        dir
      })
      json(res, 200, { ...result, lang })
    } catch (e) {
      json(res, 500, { ok: false, error: '执行服务出错：' + e.message })
    } finally {
      if (dir) {
        fs.rm(dir, { recursive: true, force: true }).catch(() => {})
      }
    }
    return
  }


  if (url.pathname === '/api/explain' && req.method === 'POST') {
    if (!AI_KEY) {
      json(res, 503, { ok: false, error: '没有配置 LLM_API_KEY，AI 解说不可用（看 runner/.env.example）' })
      return
    }

    let body
    try {
      body = JSON.parse(await readBody(req))
    } catch (e) {
      json(res, 400, { ok: false, error: '请求格式错误' })
      return
    }

    const lang = body.lang || 'java'
    const code = String(body.code || '').slice(0, 6000)
    const lines = Array.isArray(body.lines)
      ? [...new Set(body.lines.filter((n) => Number.isInteger(n) && n > 0 && n < 2000))].slice(0, 100)
      : []

    if (!code || !lines.length) {
      json(res, 400, { ok: false, error: '缺少代码或行号' })
      return
    }

    const cacheKey = `${lang}|${lines.join(',')}|${code.length}|${code.slice(0, 120)}`
    if (explainCache.has(cacheKey)) {
      json(res, 200, { ok: true, cached: true, model: AI_MODEL, map: explainCache.get(cacheKey) })
      return
    }

    try {
      const map = await explainWithModel({ lang, code, lines })
      explainCache.set(cacheKey, map)
      if (explainCache.size > 200) explainCache.delete(explainCache.keys().next().value)
      json(res, 200, { ok: true, model: AI_MODEL, map })
    } catch (e) {
      json(res, 502, { ok: false, error: '模型调用失败：' + (e.name === 'AbortError' ? '超时' : e.message) })
    }
    return
  }

  json(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`AlgoStage runner 已启动：http://localhost:${PORT}`)
  console.log('  GET  /api/env   查看本地工具链')
  console.log('  POST /api/run   执行代码并返回执行轨迹')
})
