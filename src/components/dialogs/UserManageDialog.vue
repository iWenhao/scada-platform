<template>
  <el-dialog
    :model-value="modelValue"
    width="640px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="dlg-title-block">
        <div class="t">用户管理</div>
        <div class="sub">账号 · 角色 · 口令</div>
      </div>
    </template>
    <div class="user-toolbar">
      <el-button type="primary" size="small" @click="openCreate">
        <el-icon><Plus /></el-icon>
        新建用户
      </el-button>
      <el-input
        v-model="search"
        size="small"
        class="user-search"
        placeholder="搜索用户名 / 显示名"
        clearable
      />
    </div>

    <el-table v-loading="loading" :data="filteredUsers" size="small" max-height="360" empty-text="暂无用户">
      <el-table-column label="用户" min-width="200">
        <template #default="{ row }">
          <span class="avatar">{{ (row.displayName || row.username).charAt(0) }}</span>
          <span class="uname">{{ row.displayName || row.username }}</span>
          <span class="uname-sub">@{{ row.username }}</span>
          <span v-if="row.id === authStore.user?.id" class="you-badge">当前登录</span>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <el-tag size="small" class="role-tag" :type="roleTag(row.role)">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="right">
        <template #default="{ row }">
          <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
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
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="显示名" prop="displayName">
          <el-input v-model="form.displayName" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <!-- 禁止改自己的角色：admin 把自己降权后当场失去管理入口，和「不能删自己」同级 -->
          <el-select v-model="form.role" class="w-full" :disabled="editingSelf">
            <el-option v-for="r in roles" :key="r" :label="roleLabel(r)" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editingSelf" label=" ">
          <span class="role-note">不能修改当前登录账号的角色</span>
        </el-form-item>
        <!-- 改口令并入编辑弹窗：新建必填，编辑留空表示不修改 -->
        <el-form-item label="口令" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="editingId ? '留空则不修改口令' : ''"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/authStore'
import { apiData, apiFetch } from '@/api/client'
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
const search = ref('')
const loading = ref(false)

const editVisible = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ username: '', displayName: '', role: 'operator' as Role, password: '' })
const formRef = ref<FormInstance | null>(null)

// 正在编辑自己：角色下拉禁用，防止 admin 自我降权后失去管理入口
const editingSelf = computed(() => !!editingId.value && editingId.value === authStore.user?.id)

const formRules = computed<FormRules>(() => ({
  username: [{ required: true, message: '用户名必填', trigger: 'blur' }],
  // 编辑时留空 = 不改口令；填了才校验长度（与新建同一判据，不再两处手写检查）
  password: editingId.value
    ? [{ min: 4, message: '口令至少 4 位', trigger: 'blur' }]
    : [{ required: true, min: 4, message: '新建用户口令至少 4 位', trigger: 'blur' }],
}))

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(
    (u) => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q),
  )
})

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
  loading.value = true
  try {
    const list = await apiData<AdminUser[]>('/auth/users')
    users.value = Array.isArray(list) ? list : []
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '加载用户失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      void refresh()
    } else {
      // 外层关闭时嵌套的编辑弹窗不会自己收起，须联动关掉
      editVisible.value = false
    }
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
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  try {
    if (editingId.value) {
      const patch: Record<string, string> = {
        id: editingId.value,
        displayName: form.value.displayName.trim() || form.value.username,
        role: form.value.role,
      }
      // 口令并入编辑：留空表示不修改，服务端 PATCH 只在给了 password 时更新
      if (form.value.password) patch.password = form.value.password
      await apiFetch('/auth/users', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
    } else {
      await apiFetch('/auth/users', {
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
    await apiFetch(`/auth/users?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<style scoped lang="scss">
.user-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.user-search {
  width: 180px;
  margin-left: auto;
}

.w-full {
  width: 100%;
}

.role-note {
  font-size: 12px;
  color: var(--text-secondary);
}

/* —— 方案 A 视觉精修 —— */
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-secondary);
  color: var(--accent-primary);
  font-size: 12px;
  margin-right: 8px;
  vertical-align: middle;
}

.uname {
  font-weight: 600;
  vertical-align: middle;
}

.uname-sub {
  margin-left: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  vertical-align: middle;
}

.you-badge {
  margin-left: 8px;
  font-size: 10px;
  color: var(--accent-primary);
  border: 1px solid var(--accent-secondary);
  border-radius: 999px;
  padding: 1px 7px;
  vertical-align: middle;
}

// 角色标签统一成胶囊，颜色仍走 el-tag 的语义 type
.role-tag {
  border-radius: 999px;
}
</style>
