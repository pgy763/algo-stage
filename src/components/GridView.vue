<template>
  <div class="grid-view">
    <div
      class="grid-board"
      :style="{ gridTemplateColumns: `repeat(${cols}, ${size}px)`, gridAutoRows: `${size}px` }"
    >
      <div
        v-for="(v, idx) in flat"
        :key="idx"
        class="gcell"
        :class="classOf(v, idx)"
        :style="{ width: size + 'px', height: size + 'px' }"
      >
        <svg v-if="v === 6" class="queen-icon" viewBox="0 0 24 24">
          <path d="M3 19h18l-1.8-9.4-4.2 3.4L12 5.2 9 13l-4.2-3.4L3 19z" fill="currentColor" />
          <circle cx="12" cy="4.2" r="1.7" fill="currentColor" />
        </svg>
      </div>
    </div>

    <div class="grid-legend">
      <template v-if="kind === 'queen'">
        <span class="legend-item"><i class="legend-dot" style="background: #6366f1"></i>已放置皇后</span>
        <span class="legend-item"><i class="legend-dot" style="background: #f43f5e"></i>冲突位置</span>
      </template>
      <template v-else-if="kind === 'dijkstra'">
        <span class="legend-item"><i class="legend-dot" style="background: #cbd5e1"></i>墙</span>
        <span class="legend-item"><i class="legend-dot" style="background: #fde68a"></i>沼泽（通行成本 5）</span>
        <span class="legend-item"><i class="legend-dot" style="background: #bfdbfe"></i>已确定最短距离</span>
        <span class="legend-item"><i class="legend-dot" style="background: #7dd3fc"></i>候选（在优先队列里）</span>
        <span class="legend-item"><i class="legend-dot" style="background: #fbbf24"></i>当前</span>
        <span class="legend-item"><i class="legend-dot" style="background: #10b981"></i>最短路径</span>
      </template>
      <template v-else>
        <span class="legend-item"><i class="legend-dot" style="background: #cbd5e1"></i>墙</span>
        <span class="legend-item"><i class="legend-dot" style="background: #bfdbfe"></i>已访问</span>
        <span class="legend-item"><i class="legend-dot" style="background: #7dd3fc"></i>队列中</span>
        <span class="legend-item"><i class="legend-dot" style="background: #fbbf24"></i>当前</span>
        <span class="legend-item"><i class="legend-dot" style="background: #10b981"></i>最短路径</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  step: { type: Object, required: true },
  kind: { type: String, default: 'bfs' }
})

const grid = computed(() => props.step?.grid || [])
const cols = computed(() => (grid.value[0] ? grid.value[0].length : 0))
const flat = computed(() => grid.value.flat())

const size = computed(() => {
  const c = cols.value
  if (c <= 6) return 58
  if (c <= 8) return 44
  if (c <= 10) return 40
  if (c <= 14) return 36
  return 22
})

function classOf(v, idx) {
  const r = Math.floor(idx / cols.value)
  const c = idx % cols.value
  const conflict = props.step?.conflict
  if (conflict && conflict[0] === r && conflict[1] === c) return 'conflict'

  switch (v) {
    case 1:
      return 'wall'
    case 2:
      return 'visited'
    case 3:
      return 'current'
    case 4:
      return 'path'
    case 5:
      return 'frontier'
    case 6:
      return 'queen'
    case 7:
      return 'swamp'
    default:
      return ''
  }
}
</script>
