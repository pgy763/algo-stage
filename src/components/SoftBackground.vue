<template>
  <div class="soft-bg" :style="{ opacity: intensity }">
    <canvas ref="canvas"></canvas>
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>
    <div class="blob b4"></div>
    <div class="mesh"></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps({
  /** 整体浓度：首页 1，内容页 0.5 左右 */
  intensity: { type: Number, default: 1 }
})

const canvas = ref(null)

let ctx = null
let raf = 0
let w = 0
let h = 0
let dpr = 1
let dots = []
let running = true
const mouse = { x: -9999, y: -9999, active: false }
const LINK = 130
const PULL = 190

const PALETTE = [
  '14, 165, 233', // 天蓝
  '99, 102, 241', // 靛蓝
  '168, 85, 247', // 紫
  '20, 184, 166' // 青绿
]

const rand = (a, b) => Math.random() * (b - a) + a

function initDots() {
  const count = Math.max(26, Math.min(78, Math.floor((w * h) / 24000)))
  dots = Array.from({ length: count }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.22, 0.22),
    vy: rand(-0.22, 0.22),
    r: rand(1.4, 3.2),
    c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    a: rand(0.4, 0.85)
  }))
}

function resize() {
  if (!canvas.value) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  w = window.innerWidth
  h = window.innerHeight
  canvas.value.width = Math.floor(w * dpr)
  canvas.value.height = Math.floor(h * dpr)
  canvas.value.style.width = w + 'px'
  canvas.value.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  initDots()
  if (reducedMotion?.matches) drawStatic()
}

function tick() {
  if (!running) return
  ctx.clearRect(0, 0, w, h)

  // 连线
  for (let i = 0; i < dots.length; i++) {
    const a = dots[i]
    for (let j = i + 1; j < dots.length; j++) {
      const b = dots[j]
      const dx = a.x - b.x
      const dy = a.y - b.y
      const d2 = dx * dx + dy * dy
      if (d2 > LINK * LINK) continue
      const d = Math.sqrt(d2)
      ctx.strokeStyle = `rgba(56, 132, 220, ${(1 - d / LINK) * 0.16})`
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  // 粒子
  for (const p of dots) {
    if (mouse.active) {
      const dx = mouse.x - p.x
      const dy = mouse.y - p.y
      const d = Math.hypot(dx, dy)
      if (d < PULL && d > 0.1) {
        const f = (1 - d / PULL) * 0.03
        p.vx += (dx / d) * f
        p.vy += (dy / d) * f
      }
    }
    p.vx *= 0.982
    p.vy *= 0.982
    const sp = Math.hypot(p.vx, p.vy)
    if (sp > 0.9) {
      p.vx = (p.vx / sp) * 0.9
      p.vy = (p.vy / sp) * 0.9
    }
    if (sp < 0.05) {
      p.vx += rand(-0.035, 0.035)
      p.vy += rand(-0.035, 0.035)
    }
    p.x += p.vx
    p.y += p.vy

    if (p.x < -30) p.x = w + 30
    if (p.x > w + 30) p.x = -30
    if (p.y < -30) p.y = h + 30
    if (p.y > h + 30) p.y = -30

    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${p.c}, ${p.a})`
    ctx.fill()
  }

  raf = requestAnimationFrame(tick)
}

function onMove(e) {
  mouse.x = e.clientX
  mouse.y = e.clientY
  mouse.active = true
}

function onLeave() {
  mouse.active = false
  mouse.x = -9999
  mouse.y = -9999
}

/**
 * mouseout 会在「离开任意一个子元素」时冒泡上来触发，
 * 鼠标划过按钮都会把引力关掉一次，粒子会一顿一顿的。
 * 只有真正离开窗口（relatedTarget 为空、且没有落在别的元素上）才算离开。
 */
function onOut(e) {
  if (!e.relatedTarget && !e.toElement) onLeave()
}

/** 系统开了「减弱动态效果」就只画一帧静态粒子，不跑 rAF */
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

function onVisibility() {
  if (document.hidden) {
    running = false
    cancelAnimationFrame(raf)
  } else if (!running && !reducedMotion?.matches) {
    running = true
    tick()
  }
}

function onMotionPrefChange() {
  if (reducedMotion?.matches) {
    running = false
    cancelAnimationFrame(raf)
    drawStatic()
  } else if (!running) {
    running = true
    tick()
  }
}

/** 静态版：画一帧就停 */
function drawStatic() {
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  for (const p of dots) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${p.c}, ${p.a})`
    ctx.fill()
  }
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  resize()
  if (reducedMotion?.matches) {
    drawStatic()
  } else {
    tick()
  }
  window.addEventListener('resize', resize)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseout', onOut)
  document.addEventListener('visibilitychange', onVisibility)
  reducedMotion?.addEventListener?.('change', onMotionPrefChange)
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseout', onOut)
  document.removeEventListener('visibilitychange', onVisibility)
  reducedMotion?.removeEventListener?.('change', onMotionPrefChange)
})
</script>

<style scoped>
.soft-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: linear-gradient(180deg, #f8fbff 0%, #eff5fd 45%, #eaf2fc 100%);
}

canvas {
  position: absolute;
  inset: 0;
  display: block;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.72;
  will-change: transform;
}

.b1 {
  width: 700px;
  height: 700px;
  left: -8%;
  top: -18%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.8), transparent 68%);
  animation: float1 24s ease-in-out infinite;
}

.b2 {
  width: 620px;
  height: 620px;
  right: -6%;
  top: -8%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.72), transparent 68%);
  animation: float2 31s ease-in-out infinite;
}

.b3 {
  width: 580px;
  height: 580px;
  left: 28%;
  bottom: -26%;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.58), transparent 68%);
  animation: float3 27s ease-in-out infinite;
}

.b4 {
  width: 420px;
  height: 420px;
  right: 18%;
  bottom: -18%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.42), transparent 70%);
  animation: float4 36s ease-in-out infinite;
}

@keyframes float1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(80px, 60px) scale(1.14);
  }
}

@keyframes float2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-70px, 90px) scale(1.1);
  }
}

@keyframes float3 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(90px, -70px) scale(1.16);
  }
}

@keyframes float4 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-60px, -50px) scale(1.12);
  }
}

.mesh {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(15, 23, 42, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.055) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, #000 5%, transparent 72%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 20%, #000 5%, transparent 72%);
}

/* 系统偏好「减弱动态效果」时，四个光斑也别再飘了（JS 那边粒子同样只画一帧） */
@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none !important;
  }
}
</style>
