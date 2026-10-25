<template>
  <div class="table-matrix">
    <div class="tm-scroll">
      <div class="tm-grid" :style="{ gridTemplateColumns: `34px repeat(${cols}, minmax(38px, 1fr))` }">
        <div class="tm-corner"></div>
        <div v-for="j in cols" :key="'h' + j" class="tm-head">{{ j - 1 }}</div>

        <template v-for="(row, i) in matrix" :key="'r' + i">
          <div class="tm-head">{{ i }}</div>
          <div
            v-for="(v, j) in padded(row)"
            :key="'c' + i + '-' + j"
            class="tm-cell"
            :class="{ cur: isCurrent(i, j), filled: v !== null && v !== undefined && v !== 0 }"
          >
            {{ fmtCell(v) }}
          </div>
        </template>
      </div>
    </div>

    <div class="tm-legend">
      <span>行 × 列</span>
      <span v-if="cell" class="tm-cur">当前 [{{ cell[0] }}][{{ cell[1] }}]</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  step: { type: Object, required: true }
})

const matrix = computed(() => props.step?.matrix || [])
const cell = computed(() => props.step?.cell || null)
const cols = computed(() => {
  let n = 0
  for (const row of matrix.value) n = Math.max(n, row.length)
  return Math.max(1, n)
})

function padded(row) {
  const out = [...(row || [])]
  while (out.length < cols.value) out.push(null)
  return out
}

function isCurrent(i, j) {
  return cell.value && cell.value[0] === i && cell.value[1] === j
}

function fmtCell(v) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number' && Math.abs(v) >= 100000) return v.toExponential(0)
  return String(v)
}
</script>

<style scoped>
.table-matrix {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 18px;
  width: 100%;
  min-height: 100%;
  justify-content: center;
}

.tm-scroll {
  max-width: 100%;
  overflow: auto;
}

.tm-grid {
  display: grid;
  gap: 4px;
}

.tm-corner,
.tm-head {
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: 11px;
  color: #94a3b8;
  height: 34px;
}

.tm-cell {
  display: grid;
  place-items: center;
  height: 34px;
  min-width: 38px;
  font-family: var(--mono);
  font-size: 12.5px;
  color: #64748b;
  background: #fcfdff;
  border: 1px solid rgba(15, 23, 42, 0.11);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.tm-cell.filled {
  color: #0f172a;
  background: #eef6ff;
  border-color: rgba(59, 130, 246, 0.22);
}

.tm-cell.cur {
  color: #fff;
  background: linear-gradient(180deg, #38bdf8, #0ea5e9);
  border-color: #0ea5e9;
  box-shadow: 0 3px 10px rgba(14, 165, 233, 0.35);
  transform: translateY(-1px);
}

.tm-legend {
  display: flex;
  gap: 14px;
  font-size: 11.5px;
  color: var(--dim);
}

.tm-cur {
  color: #0284c7;
}
</style>
