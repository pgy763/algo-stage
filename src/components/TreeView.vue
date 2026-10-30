<template>
  <div class="tree-view">
    <svg class="tree-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <g v-for="e in edges" :key="e.key">
        <line class="tree-edge" :class="{ done: e.done }" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" vector-effect="non-scaling-stroke" />
        <!-- 有向图：在边的 70% 处画一个 V 形箭头，方向即依赖方向 -->
        <polyline v-if="e.arrow" class="tree-arrow" :class="{ done: e.done }" :points="e.arrow" vector-effect="non-scaling-stroke" />
      </g>
    </svg>

    <div
      v-for="n in nodes"
      :key="n.id"
      class="tree-node"
      :class="classOf(n.id)"
      :style="{ left: n.x + '%', top: n.y + '%' }"
    >
      <span class="tree-val">{{ n.val }}</span>
      <!-- 节点角标：拓扑排序用它显示入度，二叉树不用 -->
      <span v-if="n.sub != null && n.sub !== ''" class="tree-sub" :class="{ zero: n.sub === 0 }">{{ n.sub }}</span>
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

// 按 id 查，不按下标 —— 多个视图都在复用这张表，id 和数组下标不一定相等
const nodeMap = computed(() => new Map(nodes.value.map((n) => [n.id, n])))

/** 在边的 70% 处算一个 V 形箭头（viewBox 是 0..100，坐标直接用百分比） */
function arrowOf(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const cx = a.x + dx * 0.7
  const cy = a.y + dy * 0.7
  const size = 3.2
  const wing = 1.9
  const p1 = `${(cx - ux * size - uy * wing).toFixed(2)},${(cy - uy * size + ux * wing).toFixed(2)}`
  const p2 = `${cx.toFixed(2)},${cy.toFixed(2)}`
  const p3 = `${(cx - ux * size + uy * wing).toFixed(2)},${(cy - uy * size - ux * wing).toFixed(2)}`
  return `${p1} ${p2} ${p3}`
}

const edges = computed(() => {
  const s = props.step || {}
  const list = []

  // 1) 显式边：有向图 / DAG 用 step.edges = [{ from, to, done? }]
  if (Array.isArray(s.edges) && s.edges.length) {
    for (const e of s.edges) {
      const a = nodeMap.value.get(e.from)
      const b = nodeMap.value.get(e.to)
      if (!a || !b) continue
      list.push({
        key: `${e.from}->${e.to}`,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        done: !!e.done,
        arrow: s.directed ? arrowOf(a, b) : ''
      })
    }
    return list
  }

  // 2) 从父子关系推：二叉树用 left/right，多叉树（Trie）用 children
  const visited = s.visited || []
  for (const n of nodes.value) {
    const kids = Array.isArray(n.children) ? n.children : [n.left, n.right]
    for (const child of kids) {
      if (child == null || child < 0) continue
      const c = nodeMap.value.get(child)
      if (!c) continue
      list.push({
        key: n.id + '-' + child,
        x1: n.x,
        y1: n.y,
        x2: c.x,
        y2: c.y,
        done: visited.includes(n.id) && visited.includes(child),
        arrow: ''
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