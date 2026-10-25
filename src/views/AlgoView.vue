<template>
  <div v-if="!algo" class="algo-page" style="display: grid; place-items: center">
    <div style="text-align: center">
      <p style="color: var(--muted); margin-bottom: 16px">找不到这个算法</p>
      <router-link to="/" class="btn">返回首页</router-link>
    </div>
  </div>

  <div v-else class="algo-page">
    <SoftBackground :intensity="0.5" />

    <header class="topbar">
      <router-link to="/" class="back">← 全部算法</router-link>
      <h1>{{ algo.name }}</h1>
      <div class="topbar-meta">
        <span class="tag level">{{ algo.level }}</span>
        <span class="tag">{{ algo.category }}</span>
        <span class="complexity">时间 {{ algo.complexity.time }}</span>
      </div>
      <div class="topbar-right">
        <button v-if="algo.inputType === 'array'" class="btn" @click="randomize">随机数据</button>
        <button class="btn" @click="rebuild">↺ 重置</button>
      </div>
    </header>

    <div class="stage-layout">
      <CodePanel :code="algo.code" :active-line="current ? current.line : 0" />

      <div class="stage">
        <div class="stage-viewport" :class="{ playing }">
          <component :is="viewComp" :step="current || {}" :kind="kind" />
        </div>

        <div class="narration">
          <div class="narration-icon">▸</div>
          <div :key="idx" class="narration-text" v-html="narration"></div>
        </div>

        <div class="controls">
          <div class="ctrl-group">
            <button class="btn btn-icon" :disabled="idx === 0" title="上一步（←）" @click="prev">◀</button>
            <button class="btn btn-primary btn-icon" style="width: 44px; height: 44px" title="播放 / 暂停（空格）" @click="toggle">
              {{ playing ? '❚❚' : '▶' }}
            </button>
            <button
              class="btn btn-icon"
              :disabled="idx >= total - 1"
              title="下一步（→）"
              @click="next"
            >
              ▶
            </button>
          </div>

          <div class="progress-wrap">
            <div class="progress-track" @click="seek">
              <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
            </div>
            <span class="step-count">{{ idx + 1 }} / {{ total }}</span>
          </div>

          <select v-model.number="speed" class="speed-select" title="播放速度">
            <option :value="1200">0.5×</option>
            <option :value="700">1×</option>
            <option :value="380">2×</option>
            <option :value="180">4×</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { byId } from '../algorithms/index.js'
import SoftBackground from '../components/SoftBackground.vue'
import CodePanel from '../components/CodePanel.vue'
import ArrayView from '../components/ArrayView.vue'
import GridView from '../components/GridView.vue'
import TreeView from '../components/TreeView.vue'
import MatrixView from '../components/MatrixView.vue'

const route = useRoute()
const router = useRouter()

const algo = computed(() => byId(route.params.id))
const steps = ref([])
const idx = ref(0)
const playing = ref(false)
const speed = ref(700)
const input = ref(null)

let timer = null

const total = computed(() => steps.value.length)
const current = computed(() => steps.value[idx.value] || null)
const progressPct = computed(() => (total.value <= 1 ? 0 : (idx.value / (total.value - 1)) * 100))

const viewComp = computed(
  () => ({ array: ArrayView, grid: GridView, tree: TreeView, matrix: MatrixView }[algo.value?.view] || ArrayView)
)
const kind = computed(() => (algo.value?.id === 'n-queens' ? 'queen' : 'bfs'))

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const narration = computed(() => {
  const d = current.value?.desc || ''
  return escapeHtml(d).replace(/`([^`]+)`/g, '<span class="hl">$1</span>')
})

function build(data, resetSpeed = false) {
  if (!algo.value) return
  pause()
  const src = data ?? input.value ?? algo.value.defaultInput
  try {
    const out = algo.value.run(src)
    steps.value = out.steps || []
  } catch (e) {
    steps.value = [{ view: 'array', array: [], line: 0, desc: '生成步骤失败：' + e.message }]
  }
  idx.value = 0
  // 步骤特别多的算法（比如 N 皇后上千步）默认用 4 倍速，不然一集看半小时
  if (resetSpeed) speed.value = steps.value.length > 320 ? 180 : 700
}

function rebuild() {
  input.value = null
  build(algo.value?.defaultInput)
}

function randomize() {
  const n = 6 + Math.floor(Math.random() * 8)
  const arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 98))
  input.value = arr
  build(arr)
}

function toggle() {
  if (playing.value) {
    pause()
    return
  }
  if (idx.value >= total.value - 1) idx.value = 0
  playing.value = true
  tick()
}

function tick() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!playing.value) return
    if (idx.value < total.value - 1) {
      idx.value++
      tick()
    } else {
      playing.value = false
    }
  }, speed.value)
}

function pause() {
  playing.value = false
  clearTimeout(timer)
}

function prev() {
  pause()
  if (idx.value > 0) idx.value--
}

function next() {
  pause()
  if (idx.value < total.value - 1) idx.value++
}

function seek(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  idx.value = Math.round(ratio * (total.value - 1))
  pause()
}

function onKey(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  if (tag === 'input' || tag === 'select' || tag === 'textarea') return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  } else if (e.code === 'Space') {
    e.preventDefault()
    toggle()
  }
}

watch(speed, () => {
  if (playing.value) tick()
})

// 保持 URL 与当前步骤同步，方便分享到某一步
watch(idx, (v) => {
  if (!algo.value) return
  const q = { ...route.query, s: String(v + 1) }
  router.replace({ query: q }).catch(() => {})
})

watch(
  () => route.params.id,
  () => {
    input.value = null
    build(null)
    const s = Number(route.query.s || 1)
    if (s > 1) idx.value = Math.min(s - 1, steps.value.length - 1)
  }
)

onMounted(() => {
  build(null, true)
  const s = Number(route.query.s || 1)
  if (s > 1) idx.value = Math.min(s - 1, steps.value.length - 1)
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  pause()
  window.removeEventListener('keydown', onKey)
})
</script>
