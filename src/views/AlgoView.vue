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
          <div class="narration-icon" :title="action.label">{{ action.icon }}</div>
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
            <div
              class="progress-track"
              role="slider"
              tabindex="0"
              aria-label="播放进度"
              aria-valuemin="1"
              :aria-valuemax="total"
              :aria-valuenow="idx + 1"
              @pointerdown="onPointerDown"
            >
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

    <!-- 快捷键帮助（按 ? 呼出） -->
    <div v-if="showKeys" class="keys-mask" @click.self="showKeys = false">
      <div class="keys-panel">
        <h3>键盘操作</h3>
        <div class="keys-row"><kbd>←</kbd><kbd>→</kbd><span>上一步 / 下一步</span></div>
        <div class="keys-row"><kbd>空格</kbd><span>播放 / 暂停</span></div>
        <div class="keys-row"><kbd>?</kbd><span>打开 / 关闭这个面板</span></div>
        <div class="keys-row"><kbd>Esc</kbd><span>关闭面板</span></div>
        <div class="keys-tip">把带步数的链接发给同学，他打开就是同一帧 —— 进度条拖到哪，URL 就记到哪。</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { markWatched } from '../progress.js'
import { useRoute, useRouter } from 'vue-router'
import { byId } from '../algorithms/index.js'
import SoftBackground from '../components/SoftBackground.vue'
import CodePanel from '../components/CodePanel.vue'
import ArrayView from '../components/ArrayView.vue'
import GridView from '../components/GridView.vue'
import TreeView from '../components/TreeView.vue'
import MatrixView from '../components/MatrixView.vue'
import { useScrubber } from '../composables/useScrubber.js'

const route = useRoute()
const router = useRouter()

const algo = computed(() => byId(route.params.id))
const steps = ref([])
const idx = ref(0)
const playing = ref(false)
const speed = ref(700)
const input = ref(null)

let timer = null
const showKeys = ref(false)

const total = computed(() => steps.value.length)
const current = computed(() => steps.value[idx.value] || null)

// 看到最后一帧就算「已学」，首页卡片会打勾
watch(idx, (v) => {
  if (total.value > 1 && v >= total.value - 1 && algo.value) markWatched(algo.value.id)
})

// 动作类型徽标：让每一步「是什么性质」一眼可辨
const action = computed(() => {
  const st = current.value
  if (!st) return { icon: '▸', label: '执行' }
  if (st.action) return st.action
  if (st.swap?.length) return { icon: '🔁', label: '交换' }
  if (st.compare?.length) return { icon: '🔍', label: '比较' }
  if (st.range) return { icon: '🪟', label: '窗口' }
  if (st.cell) return { icon: '✍️', label: '填表' }
  if (st.view === 'grid') {
    const d = st.desc || ''
    if (/回溯|沿 prev/.test(d)) return { icon: '↩', label: '回溯' }
    if (/入队|邻居/.test(d)) return { icon: '➡', label: '扩散' }
    if (/敲定|确定|最短距离/.test(d)) return { icon: '✅', label: '确定' }
  }
  if (st.view === 'tree') {
    const d = st.desc || ''
    if (/压栈/.test(d)) return { icon: '⬇', label: '压栈' }
    if (/弹出/.test(d)) return { icon: '⬆', label: '弹出' }
    if (/访问/.test(d)) return { icon: '✅', label: '访问' }
    if (/比较|大小/.test(d)) return { icon: '🔍', label: '比较' }
  }
  if (st.sorted?.length) return { icon: '✅', label: '完成' }
  return { icon: '▸', label: '执行' }
})
const progressPct = computed(() => (total.value <= 1 ? 0 : (idx.value / (total.value - 1)) * 100))

const viewComp = computed(
  () => ({ array: ArrayView, grid: GridView, tree: TreeView, matrix: MatrixView }[algo.value?.view] || ArrayView)
)
const kind = computed(() => (algo.value?.id === 'n-queens' ? 'queen' : algo.value?.id === 'dijkstra-maze' ? 'dijkstra' : 'bfs'))

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
      syncUrl()
    }
  }, speed.value)
}

function pause() {
  playing.value = false
  clearTimeout(timer)
  // 播放时不动 URL，停下来才把「我看到哪了」写进去
  syncUrl()
}

function prev() {
  pause()
  if (idx.value > 0) idx.value--
}

function next() {
  pause()
  if (idx.value < total.value - 1) idx.value++
}

/** 进度条拖到 r（0~1）就是第几帧 */
function seekRatio(r) {
  if (total.value <= 1) return
  idx.value = Math.round(r * (total.value - 1))
  pause()
}

const { onPointerDown } = useScrubber(seekRatio)

function onKey(e) {
  const tag = (e.target?.tagName || '').toLowerCase()
  const typing = tag === 'input' || tag === 'select' || tag === 'textarea' || e.target?.isContentEditable
  if (typing) return

  if (e.key === '?') {
    showKeys.value = !showKeys.value
    return
  }
  if (e.key === 'Escape') {
    showKeys.value = false
    return
  }
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

// 保持 URL 与当前步骤同步，方便分享到某一步。
// 播放过程中一帧一次 router.replace 太吵（4× 速每秒五次），所以播放时不写，
// 停下来才写一次；回到第 1 步就把 s 摘掉，别把"上一集"的步数带进下一集。
let urlTimer = null
function syncUrl() {
  clearTimeout(urlTimer)
  urlTimer = setTimeout(() => {
    if (!algo.value || playing.value) return
    const q = { ...route.query }
    if (idx.value > 0) q.s = String(idx.value + 1)
    else delete q.s
    if ((route.query.s || '') === (q.s || '')) return
    router.replace({ query: q }).catch(() => {})
  }, 150)
}
watch(idx, syncUrl)

/** 从 ?s= 还原到某一帧，非法值就落回第一帧 */
function restoreStep() {
  const s = Number(route.query.s || 1)
  if (Number.isFinite(s) && s > 1) idx.value = Math.min(s - 1, steps.value.length - 1)
  else idx.value = 0
}

watch(
  () => route.params.id,
  () => {
    input.value = null
    // 换算法要重挑速度：从冒泡切到 N 皇后，1× 速能看半小时
    build(null, true)
    restoreStep()
  }
)

onMounted(() => {
  build(null, true)
  restoreStep()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  pause()
  clearTimeout(urlTimer)
  window.removeEventListener('keydown', onKey)
})
</script>
