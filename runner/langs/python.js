import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)

let cachedPython = null

export async function findPython() {
  if (cachedPython) return cachedPython
  for (const bin of ['python', 'python3', 'py']) {
    try {
      const { stdout } = await exec(bin, ['--version'], { timeout: 8000 })
      const v = (stdout || '').trim()
      if (/Python\s+3\./.test(v)) {
        cachedPython = bin
        return bin
      }
    } catch {
      /* 试下一个 */
    }
  }
  return null
}

/**
 * 按缩进切出每个 def 的函数体，用来判断谁调用了谁。
 * 和 Java/C++/JS 的入口规则保持一致：被别的函数调用的排除，
 * 剩下里优先挑「会调用别人」的那个。
 */
function pickPyEntry(code, prefer) {
  const lines = code.split('\n')
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)def\s+([A-Za-z_]\w*)\s*\(/)
    if (!m) continue
    const indent = m[1].length
    const body = []
    for (let j = i + 1; j < lines.length; j++) {
      const line = lines[j]
      if (line.trim() && line.match(/^\s*/)[0].length <= indent) break
      body.push(line)
    }
    blocks.push({ name: m[2], body: body.join('\n') })
  }
  if (!blocks.length) return null
  if (prefer && blocks.some((b) => b.name === prefer)) return prefer

  const calls = new Map()
  for (const b of blocks) {
    const set = new Set()
    for (const other of blocks) {
      if (other.name === b.name) continue
      if (new RegExp(`\\b${other.name}\\s*\\(`).test(b.body)) set.add(other.name)
    }
    calls.set(b.name, set)
  }

  const callers = new Map()
  for (const set of calls.values()) for (const callee of set) callers.set(callee, 1)

  const free = blocks.filter((b) => !callers.get(b.name))
  const pool = free.length ? free : blocks
  return [...pool].sort((a, b) => (calls.get(b.name).size > 0 ? 1 : 0) - (calls.get(a.name).size > 0 ? 1 : 0))[0]
    .name
}

export async function runPython({ code, input, inputKind, extras, entry, dir }) {

  const python = await findPython()
  if (!python) {
    return { ok: false, error: '没找到 Python 3。装一个或者把 python 加到 PATH 里。' }
  }

  const defs = [...code.matchAll(/^\s*def\s+([A-Za-z_]\w*)\s*\(/gm)].map((m) => m[1])
  if (!defs.length) {
    return { ok: false, error: '没找到函数。请把算法写成 def sort(arr): 这样的形式。' }
  }
  const pickable = defs.filter((d) => d !== 'main')
  const entryName = pickPyEntry(code, entry) || pickable[0] || defs[0]

  const here = path.dirname(fileURLToPath(import.meta.url))
  const codePath = path.join(dir, 'user_code.py')
  const outPath = path.join(dir, 'result.json')
  await fs.writeFile(codePath, code, 'utf8')

  try {
    await exec(
      python,
      [
        path.join(here, 'py_tracer.py'),
        codePath,
        outPath,
        JSON.stringify(input),
        entryName,
        inputKind || 'array',
        JSON.stringify(extras || {})
      ],
      {
        cwd: dir,
        timeout: 15000,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      }
    )
  } catch (e) {
    if (e.killed) return { ok: false, error: '运行超过 15 秒被终止。' }
    // 脚本自己会捕获异常写文件，走到这里多半是解释器级错误
    try {
      const raw = await fs.readFile(outPath, 'utf8')
      return JSON.parse(raw)
    } catch {
      return { ok: false, error: '运行失败：' + (e.stderr || e.message || '').slice(0, 800) }
    }
  }

  try {
    const raw = await fs.readFile(outPath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { ok: false, error: '没有拿到运行结果。' }
  }
}
