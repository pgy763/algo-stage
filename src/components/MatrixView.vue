<template>
  <div class="matrix-view">
    <div class="matrix-axis">
      <span>s1 =</span>
      <span class="axis-char" v-for="(c, i) in s1" :key="'a' + i">{{ c }}</span>
      <span style="margin-left: 10px">s2 =</span>
      <span class="axis-char" v-for="(c, i) in s2" :key="'b' + i">{{ c }}</span>
    </div>

    <div
      class="matrix-table"
      :style="{ gridTemplateColumns: `34px repeat(${s2.length + 1}, 42px)` }"
    >
      <!-- 表头行 -->
      <div class="mcell head"></div>
      <div class="mcell head">∅</div>
      <div v-for="(c, j) in s2" :key="'h' + j" class="mcell head">{{ c }}</div>

      <!-- 数据行 -->
      <template v-for="(row, i) in matrix" :key="'r' + i">
        <div class="mcell head">{{ i === 0 ? '∅' : s1[i - 1] }}</div>
        <div
          v-for="(v, j) in row"
          :key="'c' + i + '-' + j"
          class="mcell"
          :class="classOf(i, j, v)"
        >
          {{ v >= 0 ? v : '' }}
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  step: { type: Object, required: true }
})

const matrix = computed(() => props.step?.matrix || [[]])
const s1 = computed(() => props.step?.s1 || '')
const s2 = computed(() => props.step?.s2 || '')

function classOf(i, j, v) {
  const s = props.step || {}
  const cur = s.cell
  if (cur && cur[0] === i && cur[1] === j) return 'current'
  if ((s.highlightPath || []).some(([r, c]) => r === i && c === j)) return 'path'
  if ((s.from || []).some(([r, c]) => r === i && c === j)) return 'from'
  if (v >= 0) return 'filled'
  return ''
}
</script>

<style scoped>
.matrix-view {
  justify-content: center;
  min-height: 100%;
}
</style>
