/**
 * 本地账号系统。
 *
 * 说明：项目是纯静态站（GitHub Pages），没有服务器，所以这里不是真正的账号体系——
 * 用户名和密码哈希存在浏览器 localStorage 里，只在当前浏览器有效。
 * 密码用 SHA-256 + 随机盐做哈希，不回传任何地方，但**请勿使用真实密码**。
 */

const KEY_USERS = 'algostage.users'
const KEY_SESSION = 'algostage.session'
const KEY_WORKS = 'algostage.works'

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

async function hash(text) {
  const buf = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function randomSalt() {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function listUsers() {
  return read(KEY_USERS, [])
}

export function currentUser() {
  const s = read(KEY_SESSION, null)
  if (!s || !s.userId) return null
  const u = listUsers().find((x) => x.id === s.userId)
  return u ? { id: u.id, name: u.name, createdAt: u.createdAt } : null
}

export async function register(name, password) {
  const n = (name || '').trim()
  if (n.length < 2) throw new Error('用户名至少 2 个字')
  if (!password || password.length < 6) throw new Error('密码至少 6 位')

  const users = listUsers()
  if (users.some((u) => u.name.toLowerCase() === n.toLowerCase())) {
    throw new Error('这个用户名已经被用了')
  }

  const salt = randomSalt()
  const user = {
    id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: n,
    salt,
    passHash: await hash(salt + password),
    createdAt: new Date().toISOString()
  }
  users.push(user)
  write(KEY_USERS, users)
  write(KEY_SESSION, { userId: user.id, at: Date.now() })
  return { id: user.id, name: user.name }
}

export async function login(name, password) {
  const n = (name || '').trim()
  const users = listUsers()
  const u = users.find((x) => x.name.toLowerCase() === n.toLowerCase())
  if (!u) throw new Error('没有这个用户')
  const h = await hash(u.salt + password)
  if (h !== u.passHash) throw new Error('密码不对')
  write(KEY_SESSION, { userId: u.id, at: Date.now() })
  return { id: u.id, name: u.name }
}

export function logout() {
  localStorage.removeItem(KEY_SESSION)
}

// ================= 作品 =================

export function listWorks(userId) {
  const all = read(KEY_WORKS, [])
  return all.filter((w) => w.userId === userId).sort((a, b) => b.createdAt - a.createdAt)
}

export function saveWork(userId, { title, lang, code, input, entry }) {
  const all = read(KEY_WORKS, [])
  const work = {
    id: 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    userId,
    title: (title || '未命名').slice(0, 40),
    lang,
    code,
    input,
    entry: entry || '',
    createdAt: Date.now()
  }
  all.push(work)
  // 只留最近 200 个，避免 localStorage 撑爆
  const trimmed = all.slice(-200)
  write(KEY_WORKS, trimmed)
  return work
}

export function getWork(id) {
  return read(KEY_WORKS, []).find((w) => w.id === id) || null
}

export function removeWork(id) {
  const all = read(KEY_WORKS, []).filter((w) => w.id !== id)
  write(KEY_WORKS, all)
}

// ================= 导出 / 导入 =================

export function exportAll() {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      users: listUsers(),
      works: read(KEY_WORKS, [])
    },
    null,
    2
  )
}

export function importAll(json) {
  const data = JSON.parse(json)
  if (!data || !Array.isArray(data.users)) throw new Error('文件格式不对')
  write(KEY_USERS, data.users)
  write(KEY_WORKS, data.works || [])
  return { users: data.users.length, works: (data.works || []).length }
}
