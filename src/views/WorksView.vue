<template>
  <div class="algo-page">
    <SoftBackground :intensity="0.5" />

    <header class="topbar">
      <router-link to="/" class="back">← 全部算法</router-link>
      <h1>我的作品</h1>
      <div class="topbar-meta">
        <span class="tag level">{{ works.length }} 个</span>
        <span class="tag">{{ user?.name }}</span>
      </div>
      <div class="topbar-right">
        <button class="btn" @click="exportJson">导出备份</button>
        <label class="btn" style="cursor: pointer">
          导入
          <input type="file" accept="application/json" style="display: none" @change="importJson" />
        </label>
        <button class="btn" @click="doLogout">退出</button>
      </div>
    </header>

    <div class="works-body">
      <div v-if="!works.length" class="works-empty">
        <div class="works-empty-icon">◇</div>
        <p>还没有保存过代码</p>
        <p class="works-empty-sub">去实验台跑通一段代码后，点右上角「保存」就会出现在这里</p>
        <router-link to="/lab" class="btn btn-primary" style="margin-top: 18px">去实验台</router-link>
      </div>

      <div v-else class="works-grid">
        <div v-for="w in works" :key="w.id" class="work-card">
          <div class="work-head">
            <span class="tag">{{ langLabel(w.lang) }}</span>
            <span class="work-time">{{ time(w.createdAt) }}</span>
          </div>
          <h3>{{ w.title }}</h3>
          <pre class="work-code">{{ (w.code || '').slice(0, 140) }}</pre>
          <div class="work-foot">
            <span class="work-input">输入 {{ w.input }}</span>
            <span style="flex: 1"></span>
            <button class="btn btn-sm" @click="open(w)">打开</button>
            <button class="btn btn-sm" @click="del(w)">删除</button>
          </div>
        </div>
      </div>

      <div v-if="msg" class="works-msg">{{ msg }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SoftBackground from '../components/SoftBackground.vue'
import { currentUser, listWorks, logout, removeWork, exportAll, importAll } from '../store/auth.js'
import { LANGS } from '../lab/remote.js'

const router = useRouter()
const user = ref(null)
const works = ref([])
const msg = ref('')

function load() {
  user.value = currentUser()
  if (!user.value) {
    router.replace('/login')
    return
  }
  works.value = listWorks(user.value.id)
}

function langLabel(id) {
  return LANGS.find((l) => l.id === id)?.label || id
}

function time(ts) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function open(w) {
  router.push({
    path: '/lab',
    query: { work: w.id }
  })
}

function del(w) {
  if (!confirm(`删除「${w.title}」？`)) return
  removeWork(w.id)
  load()
}

function doLogout() {
  logout()
  router.push('/')
}

function exportJson() {
  const blob = new Blob([exportAll()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `algostage-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
  msg.value = '已导出，换设备时用「导入」恢复'
  setTimeout(() => (msg.value = ''), 3000)
}

async function importJson(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const r = importAll(text)
    msg.value = `导入成功：${r.users} 个账号，${r.works} 个作品`
    load()
  } catch (err) {
    msg.value = '导入失败：' + err.message
  }
  e.target.value = ''
}

onMounted(load)
</script>

<style scoped>
.works-body {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 26px;
  overflow: auto;
}

.works-empty {
  max-width: 420px;
  margin: 80px auto;
  text-align: center;
}

.works-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 20px;
}

.works-empty p {
  font-size: 14px;
  color: var(--muted);
}

.works-empty-sub {
  font-size: 12.5px;
  color: var(--dim);
  margin-top: 8px;
  line-height: 1.7;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.work-card {
  padding: 16px 18px;
  border-radius: 13px;
  background: #fff;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  transition: 0.2s;
}

.work-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.work-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.work-time {
  font-size: 11.5px;
  color: var(--dim);
  font-family: var(--mono);
}

.work-card h3 {
  font-size: 14.5px;
  font-weight: 650;
  margin-bottom: 10px;
}

.work-code {
  font-family: var(--mono);
  font-size: 11.5px;
  line-height: 1.6;
  color: #6b7a90;
  background: #f7fafe;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  max-height: 92px;
  overflow: hidden;
  white-space: pre;
  margin-bottom: 12px;
}

.work-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.work-input {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--dim);
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-sm {
  padding: 5px 11px;
  font-size: 12.5px;
  box-shadow: none;
}

.works-msg {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 18px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
  font-size: 13px;
  z-index: 50;
}
</style>
