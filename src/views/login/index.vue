<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>SCADA Platform</span>
          <span class="sub">登录</span>
        </div>
      </template>

      <el-form label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="用户名">
          <el-input v-model="username" placeholder="用户名" autocomplete="username" />
        </el-form-item>
        <el-form-item label="口令">
          <el-input
            v-model="password"
            type="password"
            placeholder="口令"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-alert
          v-if="authStore.loginError"
          type="error"
          :title="authStore.loginError"
          :closable="false"
          class="login-error"
        />
        <el-button
          type="primary"
          class="login-btn"
          :loading="authStore.loading"
          @click="handleLogin"
        >
          登录
        </el-button>
      </el-form>

      <el-divider>演示账号</el-divider>
      <div class="seed-hints">
        <div v-for="s in seeds" :key="s.username" class="seed-row" @click="fill(s)">
          <el-tag size="small" :type="tagType(s.role)">{{ s.role }}</el-tag>
          <code>{{ s.username }}</code>
          <span class="pwd">{{ s.password }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { SEED_USERS } from '@/auth/userLibrary'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('')

const seeds = SEED_USERS

function tagType(role: string) {
  if (role === 'admin') return 'danger'
  if (role === 'engineer') return 'warning'
  return 'info'
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
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary, #0d1117);
}

.login-card {
  width: 380px;
  background: var(--bg-secondary, #161b22);
  border-color: var(--border-primary, #30363d);
}

.card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-weight: 600;

  .sub {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 400;
  }
}

.login-error {
  margin-bottom: 12px;
}

.login-btn {
  width: 100%;
}

.seed-hints {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.seed-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-secondary);

  &:hover {
    color: var(--text-primary);
  }

  code {
    font-family: monospace;
  }

  .pwd {
    margin-left: auto;
    color: var(--text-muted);
  }
}
</style>
