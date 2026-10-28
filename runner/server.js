import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { runPython, findPython } from './langs/python.js'
import { runCpp, findCompiler } from './langs/cpp.js'
import { runJava, findJava } from './langs/java.js'

/** 读同目录的 .env（不引第三方依赖）；已存在的环境变量优先，不会被覆盖 */
async function loadEnv() {
  try {
    const txt = await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), 'utf8')
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
/** 默认只听本机回环：这个服务会执行任意代码，不能顺手暴露给整个局域网 */
const HOST = process.env.HOST || '127.0.0.1'
const MAX_BODY = 1024 * 1024
/** 同时跑多少个编译/执子进程，防止被连点或脚本刷爆 */
const MAX_CONCURRENT = Math.max(1, Number(process.env.MAX_CONCURRENT || 4))

/**
 * 谁能调用这个服务。
 *
 * 这个接口等于「在本机执行任意代码」，所以默认只认本地开发页面的来源：
 * 你随手打开的某个网站就算向 localhost:5199 发请求，也过不了校验。
 * 把 runner 部署到远程时，用 ALLOW_ORIGINS / ALLOW_HOSTS 显式加上你的域名。
 */
const DEFAULT_ORIGINS = [
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5199',
  'http://127.0.0.1:5199'
]
const ALLOW_ORIGINS = new Set(
  (process.env.ALLOW_ORIGINS ? process.env.ALLOW_ORIGINS.split(',') : DEFAULT_ORIGINS)
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean)
)
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])
/** 远程部署时要放行的 Host（防止 DNS rebinding 把 evil.com 解析到 127.0.0.1） */
const ALLOW_HOSTS = new Set(
  (process.env.ALLOW_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
)

/** Host 头必须是本机名或显式放行的域名 */
function hostAllowed(req) {
  const raw = String(req.headers.host || '').toLowerCase()
  if (!raw) return false
  const host = raw.replace(/:\d+$/, '').replace(/^\[|\]$/g, '')
  return LOCAL_HOSTNAMES.has(host) || ALLOW_HOSTS.has(host)
}

/** 没有 Origin 的是本地脚本 / curl；有 Origin 就必须在名单里 */
function originAllowed(origin) {
  if (!origin) return true
  return ALLOW_ORIGINS.has(origin.replace(/\/$/, ''))
}

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

/** 只对白名单来源回 CORS 头；别的来源浏览器侧会直接拒掉响应 */
function cors(res) {
  const origin = String(res.req?.headers?.origin || '').replace(/\/$/, '')
  if (!origin || !ALLOW_ORIGINS.has(origin)) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '600')
}

function json(res, code, payload) {
  // 客户端中途断开（请求体过大被 destroy）时再写会抛错，
  // 一个异常就能把这个常驻服务带走 —— 所以这里兜一下
  try {
    cors(res)
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(payload))
  } catch {
    try {
      res.destroy()
    } catch {
      /* 已经没了 */
    }
  }
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
  const [py, compiler, javac] = await Promise.all([findPython(), findCompiler(), findJava()])
  return {
    python: { ok: !!py, detail: py ? `Python 3（${py}）` : '未找到' },
    cpp: { ok: !!compiler, detail: compiler ? compiler.version : '未找到 g++' },
    java: { ok: !!javac, detail: javac ? `JDK（${javac.version}）` : '未找到 javac（需要 JDK 17+）' },
    node: { ok: true, detail: process.version },
    ai: { ok: !!AI_KEY, model: AI_KEY ? AI_MODEL : '' }
  }
}

/** 正在跑的编译/执行数，超了就排队拒绝，别让一台机器被点成筛子 */
let running = 0

const server = http.createServer(async (req, res) => {
  // DNS rebinding 防线：Host 头必须是我们认识的
  if (!hostAllowed(req)) {
    json(res, 403, { ok: false, error: '这个 Host 不允许调用本机执行服务' })
    return
  }

  if (req.method === 'OPTIONS') {
    if (!originAllowed(String(req.headers.origin || ''))) {
      json(res, 403, { ok: false, error: '这个来源不允许调用本机执行服务' })
      return
    }
    cors(res)
    res.writeHead(204).end()
    return
  }

  let url
  try {
    url = new URL(req.url, `http://${req.headers.host}`)
  } catch {
    json(res, 400, { ok: false, error: '请求地址不合法' })
    return
  }

  if (url.pathname === '/api/env') {
    try {
      json(res, 200, await detectEnv())
    } catch (e) {
      json(res, 500, { error: e.message })
    }
    return
  }

  if (url.pathname === '/api/run' && req.method === 'POST') {
    // 关键：浏览器带的 Origin 必须是我们认识的页面，
    // 否则「你随手打开的一个网站」就能往本机塞代码执行
    if (!originAllowed(String(req.headers.origin || ''))) {
      json(res, 403, {
        ok: false,
        error: '这个来源不在 ALLOW_ORIGINS 白名单里，拒绝执行。要放行就在 runner/.env 里加 ALLOW_ORIGINS。'
      })
      return
    }
    if (running >= MAX_CONCURRENT) {
      json(res, 429, { ok: false, error: '执行服务忙（同时最多 ' + MAX_CONCURRENT + ' 个），稍等一下再点' })
      return
    }
    running++
    try {
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
    } finally {
      running--
    }
    return
  }


  if (url.pathname === '/api/explain' && req.method === 'POST') {
    if (!originAllowed(String(req.headers.origin || ''))) {
      json(res, 403, { ok: false, error: '这个来源不在 ALLOW_ORIGINS 白名单里，拒绝调用' })
      return
    }
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

    // 用整段代码的哈希做键：长度 + 前 120 字符会撞车，撞了就会把别人的解说贴到你的行号上
    const codeHash = createHash('sha256').update(code).digest('hex')
    const cacheKey = `${lang}|${lines.join(',')}|${codeHash}`
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

server.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' || HOST === '::' ? 'localhost' : HOST
  console.log(`AlgoStage runner 已启动：http://${shown}:${PORT}（监听 ${HOST}）`)
  console.log('  GET  /api/env   查看本地工具链')
  console.log('  POST /api/run   执行代码并返回执行轨迹')
  if (HOST !== '127.0.0.1' && HOST !== 'localhost' && HOST !== '::1') {
    console.warn('  ⚠ 正在监听非回环地址：这个接口能执行任意代码，请确认只有你信任的网络能访问。')
    console.warn('    要放行远程前端，请同时设置 ALLOW_ORIGINS（和远程部署时的 ALLOW_HOSTS）。')
  }
})

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用。换一个：PORT=5200 npm start`)
    process.exit(1)
  }
  throw e
})
