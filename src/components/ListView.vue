<template>
  <div class="list-view">
    <div v-for="row in rows" :key="row.name" class="list-row">
      <span class="list-label">{{ row.name }}</span>
      <div class="list-chain">
        <template v-for="(v, i) in shown(row.vals)" :key="i">
          <div class="lnode" :class="{ tail: i === row.vals.length - 1 }">{{ v }}</div>
          <span class="larrow">→</span>
        </template>
        <span v-if="row.vals.length > LIMIT" class="lellipsis">…</span>
        <span class="lnull">∅</span>
      </div>
    </div>

    <div v-if="badges.length" class="list-badges">
      <span v-for="b in badges" :key="b.name" class="badge">
        <b>{{ b.name }}</b>
        <span class="badge-arrow">→</span>
        <span class="badge-vals">{{ b.vals.join(' → ') }}</span>
      </span>
    </div>

    <div v-if="!rows.length" class="list-empty">这一步链表已经走空了</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const LIMIT = 24

const props = defineProps({
  step: { type: Object, required: true }
})

const rows = computed(() => props.step?.rows || [])
const badges = computed(() => props.step?.badges || [])

function shown(vals) {
  return vals.length > LIMIT ? vals.slice(0, LIMIT) : vals
}
</script>

<style scoped>
.list-view {
  width: 100%;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: flex-start;
  justify-content: center;
  min-height: 100%;
  overflow: auto;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
}

.list-label {
  font-family: var(--mono);
  font-size: 12px;
  color: #7c3aed;
  min-width: 44px;
  text-align: right;
  flex-shrink: 0;
}

.list-chain {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
}

.lnode {
  min-width: 44px;
  height: 40px;
  padding: 0 8px;
  display: grid;
  place-items: center;
  font-family: var(--mono);
  font-size: 13.5px;
  color: #0f172a;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 7px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  transition: all 0.2s;
}

.lnode.tail {
  border-color: rgba(8, 145, 178, 0.5);
  background: #ecfeff;
}

.larrow {
  color: #94a3b8;
  font-size: 13px;
  margin: 0 1px;
}

.lnull {
  font-family: var(--mono);
  font-size: 13px;
  color: #94a3b8;
  margin-left: 4px;
}

.lellipsis {
  color: #94a3b8;
  margin: 0 5px;
}

.list-empty {
  font-size: 13px;
  color: var(--dim);
}

.list-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px dashed rgba(15, 23, 42, 0.1);
  width: 100%;
  max-width: 620px;
}

.badge {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-family: var(--mono);
  font-size: 11.5px;
  color: #64748b;
}

.badge b {
  color: #7c3aed;
  font-weight: 600;
}

.badge-arrow {
  color: #cbd5e1;
}

.badge-vals {
  color: #475569;
}
</style>
