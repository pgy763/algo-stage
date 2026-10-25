<template>
  <div class="algo-page">
    <SoftBackground :intensity="0.5" />

    <header class="topbar">
      <router-link to="/" class="back">← 全部算法</router-link>
      <h1>代码实验台</h1>

      <div class="lang-tabs">
        <button
          v-for="l in LANGS"
          :key="l.id"
          class="lang-tab"
          :class="{ active: lang === l.id, off: !langAvailable(l.id) }"
          :title="langAvailable(l.id) ? l.label : `${l.label} 不可用（需要先启动 runner）`"
          @click="switchLang(l.id)"
        >
          {{ l.label }}
        </button>
      </div>

      <div class="topbar-right">
        <select v-model="sampleId" class="speed-select" @change="loadSample">
          <option value="">载入示例…</option>
          <option v-for="s in currentSamples" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button class="btn btn-primary" :disabled="running" @click="run">
          <span v-if="running" class="spin"></span>
          <span v-else>▶ 生成动画</span>
        </button>
        <button class="btn" @click="saveCurrent" :title="user ? '保存到我的作品' : '登录后可以保存'">
          {{ user ? '保存' : '登录' }}
        </button>
      </div>
    </header>

    <div class="lab-layout">
      <!-- 左：代码输入 -->
      <div class="lab-side">
        <div class="panel-head">
          <span>{{ langLabel }}</span>
          <span style="margin-left: auto; text-transform: none; letter-spacing: 0">{{ lineCount }} 行</span>
        </div>

        <div class="lab-editor">
          <div class="gutter" :style="{ transform: `translateY(${-scrollTop}px)` }">
            <div v-for="n in lineCount" :key="n" :class="{ active: current && n - 1 === current.line }">
              {{ n }}
            </div>
          </div>
          <textarea
            ref="ta"
            v-model="code"
            class="lab-textarea"
            spellcheck="false"
            :placeholder="placeholder"
            @scroll="onScroll"
          ></textarea>
        </div>

        <div class="lab-config">
          <label>
            <span>入口函数</span>
            <input v-model="entry" :placeholder="usedEntry ? `自动：${usedEntry}` : '留空自动检测'" />
          </label>
          <label>
            <span>输入数据</span>
            <input
              v-model="inputText"
              :placeholder="inputPlaceholder"
            />
          </label>
          <label v-if="env?.ai?.ok" class="ai-toggle">
            <input v-model="aiEnabled" type="checkbox" @change="loadAiHints" />
            AI 解说 · {{ env.ai.model }}
          </label>
          <div class="lab-tip">{{ hint }}</div>
        </div>
      </div>

      <!-- 右：舞台 -->
      <div class="stage">
        <div class="stage-viewport" :class="{ playing }">
          <div v-if="error" class="lab-error">
            <div class="lab-error-title">✗ 没能生成动画</div>
            <pre>{{ error }}</pre>
            <div class="lab-error-tip">{{ errorTip }}</div>
          </div>

          <div v-else-if="!steps.length" class="lab-empty">
            <div class="lab-empty-icon">▶</div>
            <p>贴代码 → 点「生成动画」</p>
            <p class="lab-empty-sub">
              <template v-if="lang === 'javascript'">在浏览器里直接执行，不需要任何服务</template>
              <template v-else>在本地 {{ langLabel }} 环境里真编译真执行，逐行记录变量</template>
            </p>

            <div class="lab-caps">
              <span class="cap ok">一维数组</span>
              <span class="cap ok">字符串（按字符展开）</span>
              <span class="cap ok">二维数组 / DP 表</span>
              <span class="cap ok">二叉树 TreeNode</span>
              <span class="cap ok">链表 ListNode</span>
              <span class="cap no">图 / 并查集</span>
              <span class="cap no">自定义对象</span>
            </div>
            <p class="lab-empty-sub" style="margin-top: 6px">
              五种语言以上形态都支持。图、并查集这类没有通用画法，只会给变量轨迹。
            </p>
          </div>

          <TreeView v-else-if="mode === 'tree'" :step="current || {}" />
          <ListView v-else-if="mode === 'list'" :step="current || {}" />
          <TableMatrix v-else-if="mode === 'matrix'" :step="current || {}" />
          <ArrayView v-else-if="mode === 'array'" :step="current || {}" />

          <div v-if="steps.length && hasResult" class="result-badge" :class="{ final: isFinal }">
            <span class="rb-label">{{ isFinal ? '程序返回' : '返回值' }}</span>
            <span class="rb-value">{{ resultText }}</span>
          </div>
          <div v-else class="lab-vars-view">
            <div class="vars-table">
              <div v-for="(v, k) in current?.vars || {}" :key="k" class="vars-row">
                <span class="vars-key">{{ k }}</span>
                <span class="vars-val">{{ fmt(v) }}</span>
              </div>
            </div>
            <p class="lab-empty-sub">这段代码里没有检测到数组，只能展示变量变化</p>
          </div>
        </div>

        <div class="narration">
          <div class="narration-icon">▸</div>
          <div class="narration-main">
            <code v-if="currentLineText" class="narration-code">{{ currentLineText }}</code>
            <div :key="idx" class="narration-text">
              <span v-if="hintIsAi" class="ai-tag">AI</span>
              <span v-if="currentHint" class="narration-hint">{{ currentHint }}</span>
              <span v-else-if="aiLoading" class="narration-detail">AI 正在读这段代码…</span>
              <span v-if="descClean" class="narration-detail">{{ descClean }}</span>
              <span v-if="!currentHint && !descClean" class="narration-detail">
                点右上角「生成动画」，我会跑一遍你的代码，把每一步都录下来
              </span>
              <span v-if="isFinal && hasResult" class="finish-tag">
                程序结束，返回 <b>{{ resultText }}</b>
              </span>
            </div>
          </div>
        </div>

        <div v-if="steps.length" class="controls">
          <div class="ctrl-group">
            <button class="btn btn-icon" :disabled="idx === 0" @click="prev">◀</button>
            <button class="btn btn-primary btn-icon" style="width: 44px; height: 44px" @click="toggle">
              {{ playing ? '❚❚' : '▶' }}
            </button>
            <button class="btn btn-icon" :disabled="idx >= total - 1" @click="next">▶</button>
          </div>

          <div class="progress-wrap">
            <div class="progress-track" @click="seek">
              <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
            </div>
            <span class="step-count">{{ idx + 1 }} / {{ total }}</span>
          </div>

          <select v-model.number="speed" class="speed-select">
            <option :value="1200">0.5×</option>
            <option :value="700">1×</option>
            <option :value="380">2×</option>
            <option :value="180">4×</option>
          </select>
        </div>

        <div v-if="toast" class="lab-toast">{{ toast }}</div>

        <div v-if="steps.length" class="lab-var-chips">
          <span class="chips-label">变量</span>
          <span
            v-for="(v, k) in current?.vars || {}"
            :key="k"
            class="var-chip"
            :class="{ flash: (current?.changedVars || []).includes(k) }"
          >
            <b>{{ k }}</b> = {{ fmt(v) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SoftBackground from '../components/SoftBackground.vue'
import ArrayView from '../components/ArrayView.vue'
import TreeView from '../components/TreeView.vue'
import ListView from '../components/ListView.vue'
import TableMatrix from '../components/TableMatrix.vue'
import { runUserCode } from '../lab/runner.js'
import { buildVisualSteps } from '../lab/adapter.js'
import { explainLine } from '../lab/explain.js'
import { fetchExplanations, getCachedExplanations } from '../lab/aiExplain.js'
import { LANGS, checkEnv, runRemote } from '../lab/remote.js'
import { SAMPLES } from '../lab/samples.js'
import { currentUser, saveWork, getWork } from '../store/auth.js'

const lang = ref('javascript')
const code = ref(SAMPLES.javascript[0].code)
const sampleId = ref('bubble')
const entry = ref('')
const inputText = ref('5, 3, 8, 1, 9, 2, 7, 4')

const route = useRoute()
const router = useRouter()
const user = ref(null)
const toast = ref('')

const env = ref(null)
const envChecked = ref(false)

const steps = ref([])
const idx = ref(0)
const playing = ref(false)
const speed = ref(700)
const running = ref(false)
const error = ref('')
const errorTip = ref('')
const mode = ref('array')
const result = ref(null)
const hasResult = ref(false)
const usedEntry = ref('')
const aiHints = ref({})
const aiLoading = ref(false)
const aiEnabled = ref(true)
const scrollTop = ref(0)
const ta = ref(null)

let timer = null

const currentSamples = computed(() => SAMPLES[lang.value] || [])
const langLabel = computed(() => LANGS.find((l) => l.id === lang.value)?.label || lang.value)
const lineCount = computed(() => code.value.split('\n').length || 1)
const total = computed(() => steps.value.length)
const current = computed(() => steps.value[idx.value] || null)
const progressPct = computed(() => (total.value <= 1 ? 0 : (idx.value / (total.value - 1)) * 100))
const isFinal = computed(() => total.value > 0 && idx.value === total.value - 1)
const resultText = computed(() => fmtResult(result.value))

const codeLines = computed(() => code.value.split('\n'))
const currentLineText = computed(() => {
  const s = current.value
  if (!s || s.line == null) return ''
  return (codeLines.value[s.line] || '').trim()
})
const ruleHint = computed(() => explainLine(currentLineText.value, current.value || {}, { lang: lang.value }))
const aiHint = computed(() => {
  const s = current.value
  if (!s || s.line == null) return ''
  return aiHints.value[s.line + 1] || ''
})
const currentHint = computed(() => (aiEnabled.value && aiHint.value) || ruleHint.value)
const hintIsAi = computed(() => !!(aiEnabled.value && aiHint.value))
/** desc 里的"第 N 行 · "在有了代码行之后就是废话，去掉 */
const descClean = computed(() =>
  String(current.value?.desc || '')
    .replace(/^第\s*\d+\s*行\s*[·：:]\s*/, '')
    .replace(/^开始执行：/, '')
)

const placeholder = computed(() => {
  const map = {
    python: 'def bubbleSort(arr):\n    ...',
    cpp: 'void bubbleSort(int arr[], int n) {\n    ...\n}',
    c: 'void bubbleSort(int arr[], int n) {\n    ...\n}',
    java: 'class Solution {\n    static void bubbleSort(int[] arr) {\n        ...\n    }\n}',
    javascript: 'function bubbleSort(arr) {\n  ...\n}'
  }
  return map[lang.value] || ''
})

const parsed = computed(() => parseInput())

const hint = computed(() => {
  const p = parsed.value
  if (p.error) return p.error

  const desc =
    p.kind === 'string'
      ? `字符串「${String(p.values).slice(0, 14)}${String(p.values).length > 14 ? '…' : ''}」（${String(p.values).length} 个字符）`
      : p.kind === 'matrix'
        ? `二维数组 ${p.values.length} 行 × ${p.values[0]?.length || 0} 列`
        : `数组 ${p.values.length} 个${p.values.includes(null) ? '元素（含 null）' : '数字'}`

  const keys = Object.keys(p.extras || {})
  const extraText = keys.length ? '，参数 ' + keys.map((k) => `${k}=${p.extras[k]}`).join('、') : ''

  if (!langAvailable(lang.value)) {
    return `当前输入：${desc}${extraText}。${langLabel.value} 需要本地执行服务：在 runner 目录下执行 npm start。`
  }
  return `当前输入：${desc}${extraText}。${langLabel.value} 会真编译执行。`
})

const inputPlaceholder = computed(() => {
  const map = {
    array: '[3,2,1,5,6,4], k=2   或   5,3,8,1',
    string: '"abcabcbb"   或   abcabcbb',
    matrix: '[[1,2],[3,4]]   或   1,2; 3,4'
  }
  return map[parsed.value.kind] || map.array
})

function langAvailable(id) {
  if (id === 'javascript') return true
  if (!env.value) return false
  if (id === 'python') return !!env.value.python?.ok
  if (id === 'cpp' || id === 'c') return !!env.value.cpp?.ok
  if (id === 'java') return !!env.value.java?.ok
  return false
}

/** 输入框里能填三种东西：数字数组、字符串、二维数组 */
/** 中文输入法很容易打出全角标点和全角数字，统一成半角再判断 */
function toHalfWidth(str) {
  return str
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[、，]/g, ',')
    .replace(/[；]/g, ';')
}

/** 从 "k=2, m=3" 里抠出额外的标量参数 */
function parseExtras(text) {
  const extras = {}
  const re = /([A-Za-z_]\w*)\s*=\s*(-?\d+(?:\.\d+)?)/g
  let m
  while ((m = re.exec(text)) !== null) extras[m[1]] = Number(m[2])
  return extras
}

/** 判断剩下的文本还能不能当数组/字符串读 */
function classify(text) {
  const t = text.trim()
  if (!t) return null

  // 带引号的字符串
  const q = t.match(/^["'`]([\s\S]*)["'`]\s*$/)
  if (q) return { kind: 'string', values: q[1] }

  // JSON 数组：[[1,2],[3,4]] 或 [5,3,8]（树的层序也走这条）
  if (t.startsWith('[')) {
    try {
      const v = JSON.parse(t)
      if (Array.isArray(v)) {
        const kind = v.length && Array.isArray(v[0]) ? 'matrix' : 'array'
        const values =
          kind === 'matrix'
            ? v.map((r) => (Array.isArray(r) ? r.map(Number) : [])).slice(0, 20)
            : v.map((x) => (x === null ? null : Number(x))).slice(0, 60)
        return { kind, values }
      }
    } catch {
      /* 不是合法 JSON，继续往下试 */
    }
  }

  // 分号 / 换行分行的二维数组：1,2,3; 4,5,6
  if (/[;\n]/.test(t) && t.includes(',')) {
    const rows = t
      .split(/[;\n]+/)
      .map((r) => r.split(/[,\s]+/).filter(Boolean))
      .filter((r) => r.length)
    if (rows.length && rows.every((r) => r.every((x) => !Number.isNaN(Number(x))))) {
      return { kind: 'matrix', values: rows.map((r) => r.map(Number)).slice(0, 20) }
    }
  }

  // 纯数字（或 null）列表：5, 3, 8, 1
  const parts = t.split(/[,\s]+/).filter(Boolean)
  const numeric = parts.length > 0 && parts.every((p) => /^-?\d+(\.\d+)?$/.test(p) || /^null$/i.test(p))
  if (numeric) {
    return {
      kind: 'array',
      values: parts.map((p) => (/^null$/i.test(p) ? null : Number(p))).slice(0, 60)
    }
  }

  // 剩下的当字符串（可以带空格和标点）
  return { kind: 'string', values: t.slice(0, 300) }
}

/**
 * 输入可以写：
 *   3,2,1,5,6,4            一维数组
 *   [3,2,1,5,6,4], k=2     数组 + 额外标量参数
 *   nums=[3,2,1], k=2      带参数名
 *   "abcabcbb"             字符串（加不加引号都行）
 *   [[1,2],[3,4]]          二维数组
 *   3,9,20,null,15,7       二叉树（层序）
 *   {"nums":[3,2,1],"k":2} JSON 写法
 */
function parseInput() {
  const raw = (inputText.value || '').trim()
  if (!raw) return { kind: 'array', values: [], extras: {}, error: '' }

  const norm = toHalfWidth(raw)

  // JSON 对象写法：{"nums":[...], "k":2}
  if (norm.startsWith('{')) {
    try {
      const obj = JSON.parse(norm)
      if (obj && typeof obj === 'object') {
        const extras = {}
        let main = null
        for (const [k, v] of Object.entries(obj)) {
          if (Array.isArray(v) || typeof v === 'string') {
            if (!main) main = v
          } else if (typeof v === 'number') {
            extras[k] = v
          }
        }
        if (main !== null) {
          const c = classify(typeof main === 'string' ? `"${main}"` : JSON.stringify(main))
          if (c) return { ...c, extras, error: '' }
        }
      }
    } catch {
      /* 继续走普通解析 */
    }
  }

  // 参数名 = 数组：nums=[3,2,1], k=2
  let body = norm.replace(/^\s*[A-Za-z_]\w*\s*=\s*(?=[\["'`])/, '')

  // 先摘出数组 / 矩阵片段（保证里面的逗号不被当成参数分隔）
  const arrMatch = body.match(/\[[\s\S]*\]/)
  let extras = {}
  let rest = body

  if (arrMatch) {
    rest = body.replace(arrMatch[0], ' ')
    extras = parseExtras(rest)
    const c = classify(arrMatch[0])
    if (c) return { ...c, extras, error: '' }
  }

  extras = parseExtras(body)
  rest = body.replace(/([A-Za-z_]\w*)\s*=\s*-?\d+(?:\.\d+)?/g, ' ')

  const c = classify(rest)
  if (!c) return { kind: 'array', values: [], extras, error: '看不懂这个输入' }

  // 只有参数没有数据
  if (c.kind === 'string' && !c.values.trim() && Object.keys(extras).length) {
    return { kind: 'array', values: [], extras, error: '没找到数据，只有参数' }
  }
  return { ...c, extras, error: '' }
}

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

function showToast(text) {
  toast.value = text
  setTimeout(() => (toast.value = ''), 2600)
}

function saveCurrent() {
  const u = currentUser()
  if (!u) {
    router.push('/login')
    return
  }
  const title = prompt('给这段代码起个名字', '我的算法')
  if (!title) return
  saveWork(u.id, {
    title,
    lang: lang.value,
    code: code.value,
    input: inputText.value,
    entry: entry.value
  })
  user.value = u
  showToast('已保存到「我的作品」')
}

function switchLang(id) {
  if (id === lang.value) return
  if (!langAvailable(id)) {
    error.value = `${LANGS.find((l) => l.id === id)?.label} 不可用`
    errorTip.value = '在 runner 目录下执行 npm start 启动执行服务，然后刷新这个页面。'
    return
  }
  pause()
  lang.value = id
  error.value = ''
  steps.value = []
  idx.value = 0
  entry.value = ''
  const first = (SAMPLES[id] || [])[0]
  if (first) {
    code.value = first.code
    sampleId.value = first.id
    if (first.input) inputText.value = first.input
  }
}

function loadSample() {
  const s = currentSamples.value.find((x) => x.id === sampleId.value)
  if (!s) return
  code.value = s.code
  if (s.input) inputText.value = s.input
  steps.value = []
  error.value = ''
  idx.value = 0
  entry.value = ''
}

async function run() {
  if (running.value) return
  pause()
  running.value = true
  error.value = ''
  errorTip.value = ''
  steps.value = []
  idx.value = 0
  result.value = null
  hasResult.value = false
  usedEntry.value = ''

  const { kind, values: input, extras, error: parseErr } = parseInput()
  if (parseErr || !input.length) {
    error.value = parseErr || '输入不能为空'
    errorTip.value =
      '写法：数组 [3,2,1,5,6,4]；带参数 [3,2,1], k=2；字符串 "abcabcbb"；矩阵 [[1,2],[3,4]]'
    running.value = false
    return
  }

  let res
  if (lang.value === 'javascript') {
    res = await runUserCode({
      code: code.value,
      entry: entry.value.trim() || null,
      input,
      inputKind: kind,
      extras
    })
  } else {
    if (!langAvailable(lang.value)) {
      error.value = `${langLabel.value} 执行服务没启动`
      errorTip.value = '在 runner 目录下执行：npm start，然后重试。'
      running.value = false
      return
    }
    res = await runRemote({
      lang: lang.value,
      code: code.value,
      entry: entry.value.trim() || null,
      input,
      inputKind: kind,
      inputRaw: inputText.value,
      extras
    })
  }

  running.value = false

  if (!res.ok) {
    error.value = res.error || '执行失败'
    errorTip.value = errorTipFor(res)
    return
  }

  const built = buildVisualSteps(res.steps)
  if (!built.ok) {
    error.value = '代码跑完了，但没有捕获到任何变量变化'
    errorTip.value = '试试在函数里传一个数组参数（比如 arr / nums），并原地修改它。'
    return
  }

  mode.value = built.mode
  steps.value = built.steps
  // 函数返回了什么就展示什么 —— 新手需要知道"答案算出来了"
  hasResult.value = res.result !== undefined && res.result !== null
  result.value = res.result
  // 多方法代码里入口最容易认错（助手被当入口就只跑一帧），把实际执行的亮出来
  usedEntry.value = res.entry || ''
  speed.value = steps.value.length > 320 ? 180 : 700

  if (res.truncated) {
    errorTip.value = '步骤超过上限，后面的被截断了'
  }
  playing.value = true
  tick()
  loadAiHints()
}

/** 规则解说立刻可用；AI 解说回来后再替换（同一份代码只问一次） */
async function loadAiHints() {
  aiHints.value = {}
  if (!aiEnabled.value || !env.value?.ai?.ok) return

  const lines = [...new Set(steps.value.map((s) => s.line + 1))].filter((n) => n > 0).sort((a, b) => a - b)
  if (!lines.length) return

  const cached = getCachedExplanations(lang.value, code.value)
  if (cached) {
    aiHints.value = cached
    return
  }

  aiLoading.value = true
  try {
    const map = await fetchExplanations({
      lang: lang.value,
      code: code.value,
      lines,
      onPartial: (partial) => {
        aiHints.value = { ...aiHints.value, ...partial }
      }
    })
    if (map) aiHints.value = map
  } finally {
    aiLoading.value = false
  }
}

function errorTipFor(res) {
  const stage = res.stage
  if (stage === 'parse') return '检查一下括号、分号有没有写漏。'
  if (lang.value === 'javascript') return '代码能跑通才有动画。可以先把代码放到浏览器控制台跑一遍确认。'
  if (lang.value === 'java') {
    return 'Java 需要类名和方法名对上。常见问题：方法不是 static、类名写错、数组参数类型不对。'
  }
  if (lang.value === 'cpp' || lang.value === 'c') {
    return 'C/C++ 需要先编译通过。常见问题：#include 缺失、数组参数没带长度、变量没声明。'
  }
  return ''
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

function toggle() {
  if (playing.value) {
    pause()
    return
  }
  if (idx.value >= total.value - 1) idx.value = 0
  playing.value = true
  tick()
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

/** 返回值怎么显示：数字直接给，数组/链表/树摊开，对象转 JSON */
function fmtResult(v) {
  if (v === null || v === undefined) return '无返回值（void）'
  if (Array.isArray(v)) {
    if (v.length && Array.isArray(v[0])) {
      return '[' + v.map((r) => '[' + r.join(', ') + ']').join(', ') + ']'
    }
    const head = v.slice(0, 20).map((x) => String(x)).join(', ')
    return '[' + head + (v.length > 20 ? ', …' : '') + ']'
  }
  if (typeof v === 'object') {
    if (Array.isArray(v.__list)) return '链表 [' + v.__list.join(' → ') + ']'
    if (Array.isArray(v.__tree)) return '二叉树 [' + v.__tree.map((x) => (x === null ? 'null' : x)).join(', ') + ']'
    try {
      const j = JSON.stringify(v)
      return j.length > 120 ? j.slice(0, 120) + '…' : j
    } catch (e) {
      return '…'
    }
  }
  if (typeof v === 'string') {
    return '"' + (v.length > 40 ? v.slice(0, 40) + '…' : v) + '"'
  }
  return String(v)
}

function fmt(v) {
  if (v === null) return 'null'
  if (typeof v === 'string') return v
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function onKey(e) {
  if (e.target?.tagName === 'TEXTAREA' || e.target?.tagName === 'INPUT') return
  if (e.key === 'ArrowRight') next()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.code === 'Space') {
    e.preventDefault()
    toggle()
  }
}

watch(
  () => lang.value,
  () => {
    if (!currentSamples.value.length) return
  }
)

onMounted(async () => {
  window.addEventListener('keydown', onKey)

  const u = currentUser()
  user.value = u

  // 从「我的作品」跳过来时恢复代码
  const wid = route.query.work
  if (wid) {
    const w = getWork(wid)
    if (w) {
      lang.value = w.lang
      code.value = w.code
      inputText.value = w.input || ''
      entry.value = w.entry || ''
      sampleId.value = ''
    }
  }

  env.value = await checkEnv()
  envChecked.value = true
})

onBeforeUnmount(() => {
  pause()
  window.removeEventListener('keydown', onKey)
})
</script>
