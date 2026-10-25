<template>
  <div class="auth-page">
    <SoftBackground :intensity="0.8" />

    <div class="auth-card">
      <router-link to="/" class="auth-back">← 返回首页</router-link>

      <div class="auth-head">
        <span class="brand-mark">◈</span>
        <h1>{{ isRegister ? '创建一个本地账号' : '欢迎回来' }}</h1>
        <p>
          {{
            isRegister
              ? '登录后可以把代码作品保存下来，随时回来接着调'
              : '登录后能看到你保存过的代码作品'
          }}
        </p>
      </div>

      <div class="auth-tabs">
        <button :class="{ active: !isRegister }" @click="switchMode(false)">登录</button>
        <button :class="{ active: isRegister }" @click="switchMode(true)">注册</button>
      </div>

      <form @submit.prevent="submit">
        <label class="auth-field">
          <span>用户名</span>
          <input v-model="name" autocomplete="username" placeholder="随便起个名字" />
        </label>

        <label class="auth-field">
          <span>密码</span>
          <input
            v-model="password"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            placeholder="至少 6 位"
          />
        </label>

        <label v-if="isRegister" class="auth-field">
          <span>确认密码</span>
          <input v-model="confirm" type="password" autocomplete="new-password" placeholder="再输一次" />
        </label>

        <div v-if="error" class="auth-error">{{ error }}</div>

        <button class="btn btn-primary auth-submit" type="submit" :disabled="busy">
          {{ busy ? '处理中…' : isRegister ? '注册并登录' : '登录' }}
        </button>
      </form>

      <div class="auth-note">
        <b>说明</b>：这是一个纯前端项目，没有服务器。账号和作品都存在你当前浏览器的
        localStorage 里，换设备或清缓存就没了。密码会加盐哈希，但请<b>不要用真实密码</b>。
        可以在「我的作品」里导出 JSON 备份。
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SoftBackground from '../components/SoftBackground.vue'
import { login, register } from '../store/auth.js'

const router = useRouter()
const isRegister = ref(false)
const name = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

function switchMode(reg) {
  isRegister.value = reg
  error.value = ''
}

async function submit() {
  error.value = ''
  if (isRegister.value && password.value !== confirm.value) {
    error.value = '两次密码不一样'
    return
  }
  busy.value = true
  try {
    if (isRegister.value) await register(name.value, password.value)
    else await login(name.value, password.value)
    router.push('/works')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.auth-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 40px 20px;
}

.auth-card {
  position: relative;
  z-index: 1;
  width: min(430px, 100%);
  padding: 30px 32px 26px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(16px);
}

.auth-back {
  font-size: 12.5px;
  color: var(--muted);
  display: inline-block;
  margin-bottom: 18px;
}

.auth-head {
  text-align: center;
  margin-bottom: 22px;
}

.auth-head .brand-mark {
  margin: 0 auto 14px;
  width: 38px;
  height: 38px;
  font-size: 18px;
}

.auth-head h1 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}

.auth-head p {
  font-size: 12.8px;
  color: var(--muted);
  line-height: 1.6;
}

.auth-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(15, 23, 42, 0.045);
  margin-bottom: 20px;
}

.auth-tabs button {
  flex: 1;
  padding: 7px;
  border-radius: 7px;
  font-size: 13px;
  color: var(--muted);
  transition: 0.16s;
}

.auth-tabs button.active {
  background: #fff;
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.auth-field {
  display: block;
  margin-bottom: 14px;
}

.auth-field span {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

.auth-field input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 13.5px;
  color: var(--text);
  outline: none;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.auth-field input:focus {
  border-color: rgba(8, 145, 178, 0.55);
  box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
}

.auth-error {
  font-size: 12.5px;
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 8px 11px;
  margin-bottom: 14px;
}

.auth-submit {
  width: 100%;
  padding: 11px;
  font-size: 14px;
  margin-top: 4px;
}

.auth-note {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--border);
  font-size: 11.5px;
  line-height: 1.75;
  color: var(--dim);
}

.auth-note b {
  color: var(--muted);
}
</style>
