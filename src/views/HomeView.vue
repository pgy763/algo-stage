<template>
  <div class="home">
    <SoftBackground />

    <div class="home-inner">
      <div class="brand">
        <span class="brand-mark">◈</span>
        AlgoStage <span>· 算法剧场</span>
        <span style="flex: 1"></span>
        <router-link :to="user ? '/works' : '/login'" class="brand-link">
          {{ user ? user.name + ' 的作品' : '登录' }}
        </router-link>
      </div>

      <section class="hero">
        <div class="hero-left">
          <h1>
            算法不是背出来的<br />
            <em>是看出来的</em>
          </h1>
          <p>
            每一行代码、每一次交换、每一个指针移动，都在这块舞台上实时演给你看。<br />
            {{ algorithms.length }} 个经典算法，支持单步、变速、随时回退 —— 看不懂就退回去再看一遍。
          </p>

          <div class="hero-actions">
            <router-link to="/algo/bubble-sort" class="btn btn-primary">▶ 从冒泡排序开始</router-link>
            <router-link to="/lab" class="btn">贴自己的代码试试</router-link>
          </div>
          <div class="hero-hint">
            免安装 · 免登录 · 键盘 ← → 单步 · 空格播放 · 也可以把<router-link to="/lab" style="color: var(--accent)">自己的代码</router-link>贴进来
          </div>
        </div>

        <!-- 首页迷你演示：真实的冒泡过程循环播放 -->
        <div class="mini-demo">
          <div class="mini-label">LIVE · 冒泡排序运行中</div>
          <div class="mini-array">
            <div
              v-for="(v, i) in demoArr"
              :key="i"
              class="mini-cell"
              :class="{
                cmp: demoCompare.includes(i),
                done: i >= demoArr.length - demoSorted
              }"
              :style="{ height: 22 + v * 7 + 'px' }"
            >
              <span>{{ v }}</span>
            </div>
          </div>
          <div class="mini-foot">
            <span>比较中的柱子变黄</span>
            <span>排好的变绿</span>
          </div>
        </div>
      </section>

      <div class="section-title">
        <h2>全部算法</h2>
        <span>{{ filtered.length }} 个 · 排序 / 查找 / 树 / 搜索 / 回溯 / 动态规划</span>
        <span class="learned-pill" title="看到最后一帧就算学完">已学 {{ watchedCount }} / {{ algorithms.length }}</span>
      </div>

      <div class="filters">
        <button
          v-for="c in categories"
          :key="c"
          class="tag"
          :class="{ active: activeCat === c }"
          :aria-pressed="activeCat === c"
          style="cursor: pointer; padding: 5px 13px; font-size: 12.5px"
          @click="activeCat = c"
        >
          {{ c }}
        </button>
      </div>

      <div class="algo-grid">
        <!-- 用 router-link 而不是 div+click：Tab 能选中、回车能进、读屏能念 -->
        <router-link
          v-for="a in filtered"
          :key="a.id"
          :to="`/algo/${a.id}`"
          class="algo-card"
          :aria-label="`${a.name}（${a.category}，${a.level}）：${a.summary}`"
        >
          <div class="algo-card-head">
            <span class="tag">{{ a.category }}</span>
            <span class="tag level">{{ a.level }}</span>
            <span v-if="watched.has(a.id)" class="watched" title="已看完">✓</span>
          </div>
          <h3>{{ a.name }}</h3>
          <p>{{ a.summary }}</p>
          <div class="algo-card-foot">
            <span class="complexity">{{ a.complexity.time }}</span>
            <span style="margin-left: auto; font-size: 12px; color: var(--accent)">进去看看 →</span>
          </div>
        </router-link>
      </div>

      <footer class="home-foot">
        <span>AlgoStage · 用 Vue 3 手写的算法可视化，零依赖渲染</span>
        <span class="mono">{{ algorithms.length }} algorithms · MIT</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { algorithms, categories } from '../algorithms/index.js'
import { loadWatched } from '../progress.js'
import SoftBackground from '../components/SoftBackground.vue'
import { currentUser } from '../store/auth.js'

const activeCat = ref('全部')
const watched = ref(loadWatched())
const watchedCount = computed(() => algorithms.filter((a) => watched.value.has(a.id)).length)
const user = ref(currentUser())
const filtered = computed(() =>
  activeCat.value === '全部' ? algorithms : algorithms.filter((a) => a.category === activeCat.value)
)

// ---- 首页迷你演示 ----
const demoArr = ref([5, 3, 8, 1, 9, 2, 7, 4])
const demoCompare = ref([0, 1])
const demoSorted = ref(0)
let di = 0
let dj = 0
let timer = null

function demoStep() {
  const a = demoArr.value
  const n = a.length
  if (di >= n - 1) {
    demoArr.value = [5, 3, 8, 1, 9, 2, 7, 4]
    di = 0
    dj = 0
    demoSorted.value = 0
    demoCompare.value = [0, 1]
    return
  }
  const end = n - 1 - di
  if (dj >= end) {
    dj = 0
    di++
    demoSorted.value = di
    return
  }
  demoCompare.value = [dj, dj + 1]
  if (a[dj] > a[dj + 1]) {
    const next = [...a]
    ;[next[dj], next[dj + 1]] = [next[dj + 1], next[dj]]
    demoArr.value = next
  }
  dj++
}

onMounted(() => {
  timer = setInterval(demoStep, 620)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 54px;
  align-items: center;
}

.hero-hint {
  margin-top: 16px;
  font-size: 12.5px;
  color: var(--dim);
}

.brand-link {
  font-size: 12.8px;
  color: var(--muted);
  padding: 6px 13px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.7);
  transition: 0.18s;
  font-weight: 500;
}

.brand-link:hover {
  color: var(--text);
  border-color: var(--border-strong);
  background: #fff;
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.filters .tag {
  transition: 0.2s;
}

.filters .tag:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.filters .tag.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: rgba(34, 211, 238, 0.35);
}

.mini-demo {
  padding: 18px 20px 16px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(10px);
}

.mini-label {
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--dim);
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.mini-foot {
  display: flex;
  gap: 18px;
  margin-top: 14px;
  font-size: 11px;
  color: var(--dim);
}

.mini-label::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.9);
  animation: blink 1.6s infinite;
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

.mini-array {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  height: 110px;
}

.mini-cell {
  flex: 1;
  max-width: 54px;
  border-radius: 7px 7px 3px 3px;
  background: linear-gradient(180deg, #e8eef7, #d3dce9);
  border: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 5px;
  font-family: var(--mono);
  font-size: 11px;
  color: #5d6b80;
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.mini-cell.cmp {
  background: linear-gradient(180deg, #fbbf24, #f59e0b);
  border-color: #f59e0b;
  color: #3b2500;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
}

.mini-cell.done {
  background: linear-gradient(180deg, #34d399, #10b981);
  border-color: #10b981;
  color: #04372a;
}

.home-foot {
  margin-top: 64px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--dim);
}

@media (max-width: 980px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 34px;
  }
}
</style>
