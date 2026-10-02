<template>
  <div class="login-page" @pointermove="onPointerMove">
    <!-- 动态背景：网格 + 光晕 + 扫描线 -->
    <div class="bg-grid" />
    <div class="bg-orb orb-a" />
    <div class="bg-orb orb-b" />
    <div class="bg-orb orb-c" />
    <div class="bg-scan" />
    <!-- 鼠标跟随光晕 -->
    <div class="cursor-glow" :style="glowStyle" />

    <div class="login-shell">
      <!-- 品牌区 -->
      <div class="brand">
        <div class="brand-mark">
          <img :src="branding.displayIcon" :alt="branding.displayName" class="brand-logo" />
        </div>
        <div class="brand-text">
          <h1>{{ branding.displayName }}</h1>
          <p>INDUSTRIAL VISUALIZATION · {{ branding.displaySubtitle }}</p>
        </div>
      </div>

      <!-- 玻璃登录卡 -->
      <div class="login-card">
        <div class="card-glow" />
        <div class="card-inner">
          <div class="card-title">
            <span class="title-main">登录控制台</span>
            <span class="title-sub">Sign in to continue</span>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <label class="field">
              <span class="field-label">用户名</span>
              <div class="input-wrap">
                <span class="input-icon">👤</span>
                <input
                  v-model="username"
                  type="text"
                  autocomplete="username"
                  placeholder="请输入用户名"
                />
              </div>
            </label>

            <label class="field">
              <span class="field-label">口令</span>
              <div class="input-wrap">
                <span class="input-icon">🔒</span>
                <input
                  v-model="password"
                  :type="showPwd ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="请输入口令"
                  @keyup.enter="handleLogin"
                />
                <button type="button" class="eye" @click="showPwd = !showPwd">
                  {{ showPwd ? '隐藏' : '显示' }}
                </button>
              </div>
            </label>

            <div v-if="authStore.loginError" class="login-error">
              {{ authStore.loginError }}
            </div>

            <button type="submit" class="login-btn" :disabled="authStore.loading">
              <span class="btn-glow" />
              <span class="btn-text">
                {{ authStore.loading ? '登录中…' : '进入系统' }}
              </span>
              <span class="btn-arrow">→</span>
            </button>
          </form>

          <div class="divider">
            <span>演示账号（点击填入）</span>
          </div>

          <div class="seed-grid">
            <button
              v-for="s in seeds"
              :key="s.username"
              type="button"
              class="seed-chip"
              @click="fill(s)"
            >
              <span class="seed-role" :class="s.role">{{ roleLabel(s.role) }}</span>
              <span class="seed-user">{{ s.username }}</span>
              <span class="seed-pwd">{{ s.password }}</span>
            </button>
          </div>
        </div>
      </div>

      <p class="footer-hint">
        建议使用 Chrome / Edge · 生产环境请修改默认口令
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useBrandingStore } from '@/stores/brandingStore'
import { SEED_USERS } from '@/auth/userLibrary'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
// 品牌由 main.ts 在挂载前加载（远程模式走公开接口，未登录也能读到）
const branding = useBrandingStore()

const username = ref('admin')
const password = ref('')
const showPwd = ref(false)
const glowX = ref(-999)
const glowY = ref(-999)

const glowStyle = computed(() => ({
  transform: `translate3d(${glowX.value - 180}px, ${glowY.value - 180}px, 0)`,
}))

function onPointerMove(e: PointerEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  glowX.value = e.clientX - rect.left
  glowY.value = e.clientY - rect.top
}

const seeds = SEED_USERS

function roleLabel(role: string) {
  if (role === 'admin') return '管理员'
  if (role === 'engineer') return '工程师'
  if (role === 'operator') return '操作员'
  return '观察员'
}

function fill(s: { username: string; password: string }) {
  username.value = s.username
  password.value = s.password
}

async function handleLogin() {
  const ok = await authStore.login(username.value.trim(), password.value)
  if (!ok) return
  const redirect = (route.query.redirect as string) || '/'
  router.replace(redirect)
}
</script>

<style src="./login.scss" scoped lang="scss"></style>
