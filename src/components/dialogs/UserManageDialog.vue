<template>
  <el-dialog :model-value="modelValue" title="用户管理" width="640px" @update:model-value="emit('update:modelValue', $event)">
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

    <!-- 创建 / 编辑 -->
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

    <!-- 改口令 -->
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
import {
  loadUsers,
  addUser,
  updateUserProfile,
  changePassword,
  removeUser,
} from '@/auth/userLibrary'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_LABELS, type AuthUser, type Role } from '@/types/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const authStore = useAuthStore()
const users = ref<AuthUser[]>([])
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

async function refresh() {
  users.value = await loadUsers()
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

function openEdit(row: AuthUser) {
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
  if (editingId.value) {
    const ok = await updateUserProfile(editingId.value, {
      displayName: form.value.displayName,
      role: form.value.role,
    })
    ElMessage[ok ? 'success' : 'error'](ok ? '已保存' : '保存失败')
  } else {
    if (!form.value.username.trim() || form.value.password.length < 4) {
      ElMessage.warning('用户名必填，口令至少 4 位')
      return
    }
    const created = await addUser(
      form.value.username.trim(),
      form.value.displayName.trim() || form.value.username.trim(),
      form.value.role,
      form.value.password,
    )
    if (!created) {
      ElMessage.error('用户名已存在')
      return
    }
    ElMessage.success('已创建')
  }
  editVisible.value = false
  await refresh()
}

function openPassword(row: AuthUser) {
  pwdUserId.value = row.id
  newPassword.value = ''
  pwdVisible.value = true
}

async function handlePassword() {
  if (newPassword.value.length < 4) {
    ElMessage.warning('口令至少 4 位')
    return
  }
  const ok = await changePassword(pwdUserId.value, newPassword.value)
  ElMessage[ok ? 'success' : 'error'](ok ? '口令已更新' : '更新失败')
  pwdVisible.value = false
}

async function handleRemove(row: AuthUser) {
  try {
    await ElMessageBox.confirm(`删除用户「${row.username}」？`, '删除用户', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const ok = await removeUser(row.id)
  if (!ok) {
    ElMessage.error('删除失败：至少保留一名管理员')
    return
  }
  await refresh()
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
