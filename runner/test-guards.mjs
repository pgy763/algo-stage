/**
 * 自测：执行服务的「谁能调我」这层防护。
 *
 * 用法：`node test-guards.mjs`（不用先启动 runner，它自己拉一个临时实例）
 *
 * 这个服务等于「在本机执行任意代码」，所以下面每一条都必须成立：
 *   1. 没带 Origin 的本地脚本能调（curl / 自测脚本）
 *   2. 陌生网页带 Origin 来调 → 403
 *   3. DNS rebinding：Host 头不是本机名 → 403
 *   4. 白名单来源能正常跑代码
 *   5. 端口被占时报错退出，而不是静默失败
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.TEST_PORT || 5399)
const BASE = `http://127.0.0.1:${PORT}`

let fails = 0
let total = 0

function check(name, ok, extra = '') {
  total++
  if (ok) {
    console.log(`  ✓ ${name}`)
  } else {
    fails++
    console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`)
  }
}

async function post(pathname, body, headers = {}) {
  const r = await fetch(`${BASE}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  let data = null
  try {
    data = await r.json()
  } catch {
    /* 忽略非 JSON */
  }
  return { status: r.status, data, acao: r.headers.get('access-control-allow-origin') }
}

/** 等 /api/env 起来，最多 8 秒 */
async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/env`)
      if (r.ok) return true
    } catch {
      /* 还没起来 */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  return false
}

// 用一个干净的端口，别踩到用户正在跑的 5199
const server = spawn(process.execPath, ['server.js'], {
  cwd: here,
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (c) => (serverLog += c))
server.stderr.on('data', (c) => (serverLog += c))

const cleanup = () => {
  if (!server.killed) server.kill()
}
process.on('exit', cleanup)

const up = await waitForServer()
if (!up) {
  console.log('✗ 执行服务没能在 8 秒内起来，下面这些检查跳过')
  console.log(serverLog.trim())
  process.exit(1)
}

console.log('===== 来源与 Host 校验 =====')

const envNoOrigin = await fetch(`${BASE}/api/env`).then((r) => r.json())
console.log(
  `  本机工具链：Python=${envNoOrigin.python?.detail}｜C++=${envNoOrigin.cpp?.detail}｜Java=${envNoOrigin.java?.detail}`
)
check('/api/env 无 Origin 可读', typeof envNoOrigin.python === 'object')
check(
  'java 状态是真探测的（有 ok 和 detail）',
  typeof envNoOrigin.java?.ok === 'boolean' && typeof envNoOrigin.java?.detail === 'string'
)

const evil = await post(
  '/api/run',
  { lang: 'python', code: 'print(1)' },
  { Origin: 'http://evil.example.com' }
)
check('陌生网页调用 /api/run 被拒（403）', evil.status === 403, `got ${evil.status}`)
check('陌生网页拿不到 CORS 头', !evil.acao, `acao=${evil.acao}`)

const evilExplain = await post(
  '/api/explain',
  { lang: 'python', code: 'x=1', lines: [1] },
  { Origin: 'http://evil.example.com' }
)
check('陌生网页调用 /api/explain 被拒（403）', evilExplain.status === 403, `got ${evilExplain.status}`)

// Host 头伪造：DNS rebinding 的典型手法。
// 注意：fetch 会丢弃自定义 Host，必须用 node:http 发原始请求才能测到。
const rebound = await new Promise((resolve) => {
  const req = http.request(
    { host: '127.0.0.1', port: PORT, path: '/api/env', method: 'GET', headers: { Host: 'evil.example.com' } },
    (res) => {
      res.resume()
      resolve(res.statusCode)
    }
  )
  req.on('error', () => resolve(0))
  req.end()
})
check('Host 不是本机名时被拒（403）', rebound === 403, `got ${rebound}`)

const preflight = await fetch(`${BASE}/api/run`, {
  method: 'OPTIONS',
  headers: { Origin: 'http://evil.example.com', 'Access-Control-Request-Method': 'POST' },
})
check('陌生网页的预检被拒（403）', preflight.status === 403, `got ${preflight.status}`)

console.log('===== 白名单来源能正常执行 =====')
const pyOk = envNoOrigin.python?.ok
if (!pyOk) {
  console.log('  - 本机没有 Python，跳过真实执行检查')
} else {
  const good = await post(
    '/api/run',
    {
      lang: 'python',
      code: 'def sort(arr):\n    for i in range(len(arr)):\n        for j in range(len(arr) - 1 - i):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n',
      input: [3, 1, 2],
      inputKind: 'array',
    },
    { Origin: 'http://localhost:5175' }
  )
  check('白名单来源返回 200', good.status === 200, `got ${good.status}`)
  check('白名单来源拿到 CORS 头', good.acao === 'http://localhost:5175', `acao=${good.acao}`)
  check('代码真的跑出了轨迹', Array.isArray(good.data?.steps) && good.data.steps.length > 0)
}

cleanup()

console.log(`\n${total - fails}/${total} 通过`)
process.exit(fails ? 1 : 0)
