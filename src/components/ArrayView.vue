<template>
  <div ref="root" class="array-view-wrap">
    <div class="array-view" :style="{ '--cell-size': cellSize + 'px' }">
      <div v-for="(v, i) in array" :key="i" class="cell-wrap" :class="{ 'in-range': inRange(i) }">
        <!-- 同一格上可能落好几个指针（quickselect 里 l 和 i 会重合），
             绝对定位会互相盖住，合成一个标签 -->
        <span v-if="pointersAt(i).length" class="pointer">{{ pointersAt(i).map((p) => p.name).join(' ') }}</span>
        <div
          class="cell"
          :class="stateOf(i)"
          :style="{ fontSize: fontSizeOf(v) }"
        >
          {{ v }}
        </div>
        <div class="cell-index">{{ i }}</div>
      </div>

      <div v-if="barStyle" class="range-bar" :style="barStyle"></div>
    </div>

    <div v-if="aux && aux.length" class="aux-row">
      <span class="aux-label">缓冲区</span>
      <div v-for="(v, i) in aux" :key="'a' + i" class="aux-cell">{{ v }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

const props = defineProps({
  step: { type: Object, required: true }
})

const root = ref(null)
const barStyle = ref(null)

const array = computed(() => props.step?.array || [])
const aux = computed(() => props.step?.aux || null)

const cellSize = computed(() => {
  const n = array.value.length
  if (n > 30) return 32
  if (n > 22) return 38
  if (n > 16) return 46
  if (n > 11) return 54
  if (n > 8) return 62
  return 68
})

function fontSizeOf(v) {
  const s = String(v).length
  if (s >= 4) return '11px'
  if (s >= 3) return '13px'
  return undefined
}

function stateOf(i) {
  const s = props.step || {}
  if ((s.swap || []).includes(i)) return 'swap'
  if ((s.compare || []).includes(i)) return 'compare'
  if ((s.sorted || []).includes(i)) return 'done'
  return ''
}

function inRange(i) {
  const r = props.step?.range
  return r ? i >= r.from && i <= r.to : false
}

function pointersAt(i) {
  return (props.step?.pointers || []).filter((p) => p.index === i)
}

function measure() {
  const r = props.step?.range
  if (!r || !root.value) {
    barStyle.value = null
    return
  }
  const cells = root.value.querySelectorAll('.array-view .cell-wrap')
  const a = cells[r.from]
  const b = cells[r.to]
  const box = root.value.querySelector('.array-view')
  if (!a || !b || !box) {
    barStyle.value = null
    return
  }
  const ar = a.getBoundingClientRect()
  const br = b.getBoundingClientRect()
  const vr = box.getBoundingClientRect()
  barStyle.value = {
    left: ar.left - vr.left + 'px',
    width: br.right - ar.left + 'px'
  }
}

watch(
  () => props.step,
  () => nextTick(measure),
  { immediate: true }
)
</script>

<style scoped>
.array-view-wrap {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 10px;
}

.array-view {
  position: relative;
}

/* 区间底色只是"背景"，不能盖掉交换/比较/完成这三种状态色 */
.cell-wrap.in-range .cell:not(.swap):not(.compare):not(.done) {
  background: linear-gradient(180deg, #f8feff, #eefbfe);
  border-color: rgba(6, 182, 212, 0.32);
  box-shadow: 0 1px 3px rgba(6, 182, 212, 0.08);
}

.range-bar {
  position: absolute;
  bottom: 2px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.85), rgba(34, 211, 238, 0.2));
  box-shadow: 0 1px 6px rgba(6, 182, 212, 0.35);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}
</style>
