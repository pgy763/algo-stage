<template>
  <div class="tree-view">
    <svg class="tree-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line
        v-for="e in edges"
        :key="e.key"
        :x1="e.x1"
        :y1="e.y1"
        :x2="e.x2"
        :y2="e.y2"
        :stroke="e.done ? 'rgba(16,185,129,0.55)' : 'rgba(15,23,42,0.15)'"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      />
    </svg>

    <div
      v-for="n in nodes"
      :key="n.id"
      class="tree-node"
      :class="classOf(n.id)"
      :style="{ left: n.x + '%', top: n.y + '%' }"
    >
      {{ n.val }}
    </div>

    <div v-if="order && order.length" class="tree-order">
      <span class="order-chip" v-for="(v, i) in order" :key="i">{{ v }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  step: { type: Object, required: true }
})

const nodes = computed(() => props.step?.nodes || [])
const order = computed(() => props.step?.order || [])

const edges = computed(() => {
  const list = []
  const visited = props.step?.visited || []
  for (const n of nodes.value) {
    // 二叉树用 left/right；多叉树（Trie、N 叉树）用 children
    const kids = Array.isArray(n.children) ? n.children : [n.left, n.right]
    for (const child of kids) {
      if (child == null || child < 0) continue
      const c = nodes.value[child]
      if (!c) continue
      list.push({
        key: n.id + '-' + child,
        x1: n.x,
        y1: n.y,
        x2: c.x,
        y2: c.y,
        done: visited.includes(n.id) && visited.includes(child)
      })
    }
  }
  return list
})

function classOf(id) {
  const s = props.step || {}
  if (s.current === id) return 'current'
  if ((s.visited || []).includes(id)) return 'visited'
  if ((s.stack || []).includes(id)) return 'in-stack'
  return ''
}
</script>
