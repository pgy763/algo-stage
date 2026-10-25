/**
 * 自测：把 src/lab/samples.js 里每个示例都丢给执行服务跑一遍。
 * 用法：先启动 runner（npm start），再 `node test-samples.mjs`
 * 只测 Python / C / C++ / Java；JavaScript 在浏览器里跑，不经过这里。
 */
import { SAMPLES } from '../src/lab/samples.js'

const BASE = process.env.RUNNER_URL || 'http://localhost:5199'
const DEFAULT_INPUT = '5, 3, 8, 1, 9, 2, 7, 4'

function parseInput(text) {
  const raw = (text || DEFAULT_INPUT).trim()
  if (raw.startsWith('[')) {
    const v = JSON.parse(raw)
    return { kind: Array.isArray(v[0]) ? 'matrix' : 'array', values: v }
  }
  const parts = raw.split(/[,\s]+/).filter(Boolean)
  const numeric = parts.every((p) => /^-?\d+(\.\d+)?$/.test(p) || /^null$/i.test(p))
  if (numeric) {
    return { kind: 'array', values: parts.map((p) => (/^null$/i.test(p) ? null : Number(p))) }
  }
  return { kind: 'string', values: raw }
}

async function run(lang, code, input, inputKind) {
  const r = await fetch(`${BASE}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, code, input, inputKind })
  })
  return r.json()
}

let fails = 0
let total = 0

for (const lang of ['python', 'cpp', 'c', 'java']) {
  const list = SAMPLES[lang] || []
  if (!list.length) continue
  console.log(`===== ${lang} =====`)
  for (const s of list) {
    const { kind, values } = parseInput(s.input)
    const r = await run(lang, s.code, values, kind)
    const steps = r.steps || []
    const ok = r.ok && steps.length > 0
    total++
    if (!ok) fails++
    console.log(
      `${ok ? 'OK ' : 'ERR'} ${s.name.padEnd(24)} kind=${kind.padEnd(7)} steps=${String(steps.length).padEnd(4)} result=${String(r.result).slice(0, 34)}`
    )
    if (!ok) console.log('     ', String(r.error || '').slice(0, 260).replace(/\n/g, ' / '))
  }
}

console.log(`\n${total - fails}/${total} 通过`)
process.exit(fails ? 1 : 0)
