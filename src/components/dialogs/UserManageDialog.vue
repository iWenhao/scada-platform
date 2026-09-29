<template>
  <el-dialog
    :model-value="modelValue"
    title="用户管理"
    width="640px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="user-toolbar">
      <el-button type="primary" size="small" @click="openCreate">
        <el-icon><Plus /></el-icon>
        新建用户
      </el-button>
    </div>

    <el-table :data="users" size="small" empty-text="暂无用户">
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="displayName" label="显示名" width="120" />
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="roleTag(row.role)">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" text @click="openPassword(row)">改口令</el-button>
          <el-button
            size="small"
            text
            type="danger"
            :disabled="row.id === authStore.user?.id"
            @click="handleRemove(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="editVisible"
      :title="editingId ? '编辑用户' : '新建用户'"
      width="420px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="form.displayName" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" class="w-full">
            <el-option v-for="r in roles" :key="r" :label="roleLabel(r)" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="!editingId" label="口令">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pwdVisible" title="修改口令" width="420px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="新口令">
          <el-input v-model="newPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePassword">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { resolveApiBase } from '@/storage/config'
import { authHeaders } from '@/auth/session'
import { ROLE_LABELS, type Role } from '@/types/auth'

interface AdminUser {
  id: string
  username: string
  displayName: string
  role: Role
}

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const authStore = useAuthStore()
const users = ref<AdminUser[]>([])
const roles: Role[] = ['viewer', 'operator', 'engineer', 'admin']

const editVisible = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ username: '', displayName: '', role: 'operator' as Role, password: '' })

const pwdVisible = ref(false)
const pwdUserId = ref('')
const newPassword = ref('')

function roleLabel(r: Role) {
  return ROLE_LABELS[r] || r
}

function roleTag(r: Role) {
  if (r === 'admin') return 'danger'
  if (r === 'engineer') return 'warning'
  if (r === 'operator') return 'success'
  return 'info'
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  return body
}

async function refresh() {
  try {
    const body = await api('/auth/users')
    users.value = body.users || []
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载用户失败')
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) void refresh()
  },
)

onMounted(() => {
  if (props.modelValue) void refresh()
})

function openCreate() {
  editingId.value = null
  form.value = { username: '', displayName: '', role: 'operator', password: '' }
  editVisible.value = true
}

function openEdit(row: AdminUser) {
  editingId.value = row.id
  form.value = {
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    password: '',
  }
  editVisible.value = true
}

async function handleSave() {
  try {
    if (editingId.value) {
      await api('/auth/users', {
        method: 'PATCH',
        body: JSON.stringify({
          id: editingId.value,
          displayName: form.value.displayName,
          role: form.value.role,
        }),
      })
    } else {
      if (!form.value.username.trim() || form.value.password.length < 4) {
        ElMessage.warning('用户名必填，口令至少 4 位')
        return
      }
      await api('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          username: form.value.username.trim(),
          displayName: form.value.displayName.trim() || form.value.username.trim(),
          role: form.value.role,
          password: form.value.password,
        }),
      })
    }
    editVisible.value = false
    await refresh()
    ElMessage.success('已保存')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

function openPassword(row: AdminUser) {
  pwdUserId.value = row.id
  newPassword.value = ''
  pwdVisible.value = true
}

async function handlePassword() {
  if (newPassword.value.length < 4) {
    ElMessage.warning('口令至少 4 位')
    return
  }
  try {
    await api('/auth/users', {
      method: 'PATCH',
      body: JSON.stringify({ id: pwdUserId.value, password: newPassword.value }),
    })
    pwdVisible.value = false
    ElMessage.success('口令已更新')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '更新失败')
  }
}

async function handleRemove(row: AdminUser) {
  try {
    await ElMessageBox.confirm(`删除用户「${row.username}」？`, '删除用户', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await api(`/auth/users?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<style scoped lang="scss">
.user-toolbar {
  margin-bottom: 12px;
}

.w-full {
  width: 100%;
}
</style>
