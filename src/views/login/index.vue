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
          <img src="/logo.svg" alt="SCADA Platform" class="brand-logo" />
        </div>
        <div class="brand-text">
          <h1>SCADA Platform</h1>
          <p>INDUSTRIAL VISUALIZATION · 工业组态可视化平台</p>
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
import { SEED_USERS } from '@/auth/userLibrary'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

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

<style scoped lang="scss">
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0, 212, 170, 0.12), transparent 55%),
    linear-gradient(160deg, #0b1020 0%, #12182e 45%, #0a1628 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

/* 网格地板 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0, 212, 170, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 212, 170, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 20%, transparent 75%);
  pointer-events: none;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.35;
  pointer-events: none;
  animation: drift 12s ease-in-out infinite alternate;
}

.orb-a {
  width: 320px;
  height: 320px;
  background: #00d4aa;
  top: -80px;
  left: 10%;
}

.orb-b {
  width: 280px;
  height: 280px;
  background: #3498db;
  bottom: -60px;
  right: 8%;
  animation-delay: -4s;
}

.orb-c {
  width: 180px;
  height: 180px;
  background: #00b894;
  top: 40%;
  right: 22%;
  opacity: 0.2;
  animation-delay: -7s;
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(24px, -18px, 0) scale(1.08);
  }
}

.cursor-glow {
  position: absolute;
  top: 0;
  left: 0;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(0, 212, 170, 0.22) 0%,
    rgba(0, 212, 170, 0.08) 35%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
  will-change: transform;
  transition: opacity 0.35s ease;
  filter: blur(8px);
}

.bg-scan {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.05) 3px,
    rgba(0, 0, 0, 0.05) 4px
  );
  pointer-events: none;
  opacity: 0.4;
}

.login-shell {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  display: block;
}

.brand-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 212, 170, 0.12);
  border: 1px solid rgba(0, 212, 170, 0.35);
  box-shadow:
    0 0 24px rgba(0, 212, 170, 0.25),
    inset 0 0 16px rgba(0, 212, 170, 0.12);
}

.brand-text h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(90deg, #e8fff8, #00d4aa 55%, #3498db);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-text p {
  margin: 4px 0 0;
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(160, 176, 192, 0.85);
}

.login-card {
  position: relative;
  border-radius: 20px;
  padding: 1px;
  background: linear-gradient(
    145deg,
    rgba(0, 212, 170, 0.55),
    rgba(52, 152, 219, 0.25),
    rgba(255, 255, 255, 0.08)
  );
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.04);
}

.card-glow {
  position: absolute;
  inset: -1px;
  border-radius: 20px;
  background: radial-gradient(ellipse 60% 40% at 20% 0%, rgba(0, 212, 170, 0.2), transparent 60%);
  pointer-events: none;
}

.card-inner {
  border-radius: 19px;
  padding: 28px 28px 22px;
  background: rgba(12, 18, 36, 0.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.card-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 22px;
}

.title-main {
  font-size: 18px;
  font-weight: 700;
  color: #e8f1f0;
}

.title-sub {
  font-size: 11px;
  letter-spacing: 2px;
  color: rgba(0, 212, 170, 0.75);
  text-transform: uppercase;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(160, 176, 192, 0.9);
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;

  &:focus-within {
    border-color: rgba(0, 212, 170, 0.65);
    background: rgba(0, 212, 170, 0.08);
    box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.15);
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: #e8f1f0;
    font-size: 14px;

    &::placeholder {
      color: rgba(140, 155, 170, 0.55);
    }
  }
}

.input-icon {
  font-size: 14px;
  opacity: 0.75;
}

.eye {
  border: none;
  background: transparent;
  color: rgba(0, 212, 170, 0.9);
  font-size: 11px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;

  &:hover {
    background: rgba(0, 212, 170, 0.12);
  }
}

.login-error {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  color: #ffb4b4;
  background: rgba(255, 71, 87, 0.12);
  border: 1px solid rgba(255, 71, 87, 0.35);
}

.login-btn {
  position: relative;
  margin-top: 6px;
  height: 48px;
  border: none;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(90deg, #00d4aa, #00b894 55%, #3498db);
  box-shadow: 0 12px 28px rgba(0, 212, 170, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: transform 0.15s ease, box-shadow 0.2s ease, filter 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px rgba(0, 212, 170, 0.38);
    filter: brightness(1.05);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.btn-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    120deg,
    transparent 20%,
    rgba(255, 255, 255, 0.28) 45%,
    transparent 70%
  );
  transform: translateX(-120%);
  animation: sheen 3.2s ease-in-out infinite;
}

@keyframes sheen {
  0%,
  60% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
}

.btn-text {
  position: relative;
  z-index: 1;
  color: #06241c;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
}

.btn-arrow {
  position: relative;
  z-index: 1;
  color: #06241c;
  font-size: 16px;
  font-weight: 700;
}

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 22px 0 14px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  }

  span {
    font-size: 11px;
    color: rgba(150, 165, 180, 0.75);
    letter-spacing: 1px;
    white-space: nowrap;
  }
}

.seed-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.seed-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, transform 0.15s;

  &:hover {
    border-color: rgba(0, 212, 170, 0.5);
    background: rgba(0, 212, 170, 0.08);
    transform: translateY(-1px);
  }
}

.seed-role {
  font-size: 10px;
  letter-spacing: 1px;

  &.admin {
    color: #ff8a8a;
  }
  &.engineer {
    color: #ffc46b;
  }
  &.operator {
    color: #6be3c8;
  }
  &.viewer {
    color: #8eb6e8;
  }
}

.seed-user {
  font-size: 13px;
  color: #e8f1f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.seed-pwd {
  font-size: 11px;
  color: rgba(150, 165, 180, 0.65);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.footer-hint {
  margin: 18px 0 0;
  text-align: center;
  font-size: 11px;
  color: rgba(130, 145, 160, 0.6);
  letter-spacing: 0.5px;
}

@media (max-width: 420px) {
  .seed-grid {
    grid-template-columns: 1fr;
  }
}
</style>
