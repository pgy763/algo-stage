<template>
  <div class="code-panel">
    <div class="panel-head">
      <span>源码</span>
      <span style="margin-left: auto; text-transform: none; letter-spacing: 0">{{ code.length }} 行</span>
    </div>
    <div ref="body" class="code-body">
      <div
        v-for="(line, i) in code"
        :key="i"
        class="code-line"
        :class="{ active: i === activeLine }"
      >
        <span class="ln">{{ i + 1 }}</span>
        <span v-html="highlight(line)"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  code: { type: Array, default: () => [] },
  activeLine: { type: Number, default: 0 }
})

const body = ref(null)

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(line) {
  if (!line) return ''
  const esc = escapeHtml(line)
  return esc.replace(
    /(\/\/.*$)|('[^']*'|"[^"]*"|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|(\b(?:const|let|var|function|return|if|else|for|while|break|continue|new|of|in|true|false|null|undefined)\b)|(\b[A-Za-z_$][\w$]*(?=\s*\())/g,
    (m, com, str, num, kw, fn) => {
      if (com) return `<span class="tk-com">${com}</span>`
      if (str) return `<span class="tk-str">${str}</span>`
      if (num) return `<span class="tk-num">${num}</span>`
      if (kw) return `<span class="tk-kw">${kw}</span>`
      if (fn) return `<span class="tk-fn">${fn}</span>`
      return m
    }
  )
}

watch(
  () => props.activeLine,
  async () => {
    await nextTick()
    const el = body.value?.querySelector('.code-line.active')
    if (el) {
      const box = body.value
      const top = el.offsetTop
      const h = el.offsetHeight
      if (top < box.scrollTop || top + h > box.scrollTop + box.clientHeight) {
        box.scrollTo({ top: top - box.clientHeight / 2 + h / 2, behavior: 'smooth' })
      }
    }
  }
)
</script>
