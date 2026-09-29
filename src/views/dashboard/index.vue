<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <div class="header-top">
        <div class="header-brand">
          <h1>SCADA Platform</h1>
          <p>工业组态可视化编辑平台</p>
        </div>
        <div class="header-actions">
          <el-dropdown @command="handleSystemCommand">
            <el-button>
              <el-icon><Tools /></el-icon>
              系统设置
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="notify">通知通道</el-dropdown-item>
                <el-dropdown-item v-if="authStore.canManageUsers" command="users">
                  用户管理
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="handleUserCommand">
            <span class="user-chip">
              <el-icon><UserFilled /></el-icon>
              {{ authStore.displayName }}
              <el-tag size="small" :type="roleTag">{{ roleLabel }}</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="authStore.canManageUsers" command="users">
                  用户管理
                </el-dropdown-item>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
    
    <div class="dashboard-content">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="dashboard-card" @click="goToEditor">
            <template #header>
              <div class="card-header">
                <el-icon :size="32"><Edit /></el-icon>
                <span>新建项目</span>
              </div>
            </template>
            <p>创建一个新的组态项目</p>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card class="dashboard-card" @click="openProject">
            <template #header>
              <div class="card-header">
                <el-icon :size="32"><FolderOpened /></el-icon>
                <span>打开项目</span>
              </div>
            </template>
            <p>从本地加载已有项目</p>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card class="dashboard-card" @click="importProject">
            <template #header>
              <div class="card-header">
                <el-icon :size="32"><Upload /></el-icon>
                <span>导入项目</span>
              </div>
            </template>
            <p>从JSON文件导入项目</p>
          </el-card>
        </el-col>
      </el-row>
      
      <div class="recent-projects" v-if="recentProjects.length > 0">
        <h2>最近项目</h2>
        <el-table :data="recentProjects" style="width: 100%">
          <el-table-column prop="name" label="项目名称（双击可重命名）">
            <template #default="{ row }">
              <input
                v-if="editingName === row.name"
                v-model="editingValue"
                v-focus
                class="rename-input"
                @keyup.enter="confirmRename(row.name)"
                @keyup.escape="cancelRename"
                @blur="confirmRename(row.name)"
              />
              <span v-else class="project-name-text" @dblclick="startRename(row.name)">
                {{ row.name }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="lastModified" label="最后修改" width="200" />
          <el-table-column label="操作" width="280">
            <template #default="{ row }">
              <el-button size="small" @click="loadProject(row.name)">打开</el-button>
              <el-dropdown @command="(cmd: string) => openProjectConfig(row.name, cmd)">
                <el-button size="small">
                  配置
                  <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="datasource">数据源</el-dropdown-item>
                    <el-dropdown-item command="alarm">报警</el-dropdown-item>
                    <el-dropdown-item command="tags">点表</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button size="small" type="danger" @click="deleteProject(row.name)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 系统设置 -->
    <NotifyConfigDialog v-model="showNotifyConfig" />
    <UserManageDialog v-model="showUserManage" />

    <!-- 项目配置（先加载工程到 store，再开对应对话框） -->
    <DataSourceDialog v-model="showDataSource" />
    <AlarmConfigDialog v-model="showAlarmConfig" />
    <TagTableDialog v-model="showTagTable" />

    <el-dialog v-model="showOpenDialog" title="打开项目" width="420px">
      <div class="open-project-list">
        <div
          v-for="project in recentProjects"
          :key="project.name"
          class="open-project-item"
          @click="loadProject(project.name); showOpenDialog = false"
        >
          <el-icon :size="20"><FolderOpened /></el-icon>
          <div class="open-project-info">
            <div class="open-project-name">{{ project.name }}</div>
            <div class="open-project-time">{{ project.lastModified }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore'
import { useAuthStore } from '@/stores/authStore'
import { getStorage } from '@/storage'
import { ElMessageBox, ElMessage } from 'element-plus'
import { ROLE_LABELS } from '@/types/auth'
import NotifyConfigDialog from '@/components/dialogs/NotifyConfigDialog.vue'
import UserManageDialog from '@/components/dialogs/UserManageDialog.vue'
import DataSourceDialog from '@/components/dialogs/DataSourceDialog.vue'
import AlarmConfigDialog from '@/components/dialogs/AlarmConfigDialog.vue'
import TagTableDialog from '@/components/dialogs/TagTableDialog.vue'

const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const recentProjects = ref<Array<{ name: string; lastModified: string }>>([])
const showOpenDialog = ref(false)

const showNotifyConfig = ref(false)
const showUserManage = ref(false)
const showDataSource = ref(false)
const showAlarmConfig = ref(false)
const showTagTable = ref(false)

const roleLabel = computed(() =>
  authStore.role ? ROLE_LABELS[authStore.role] : '',
)
const roleTag = computed(() => {
  switch (authStore.role) {
    case 'admin': return 'danger'
    case 'engineer': return 'warning'
    case 'operator': return 'success'
    default: return 'info'
  }
})

function handleSystemCommand(cmd: string) {
  if (cmd === 'notify') showNotifyConfig.value = true
  else if (cmd === 'users') showUserManage.value = true
}

async function handleUserCommand(cmd: string) {
  if (cmd === 'users') {
    showUserManage.value = true
  } else if (cmd === 'logout') {
    await authStore.logout()
    window.location.href = '/login'
  }
}

/** 从首页配置指定项目：载入工程后打开对应对话框，不进入画布 */
async function openProjectConfig(name: string, kind: string) {
  if (!(await projectStore.loadProject(name))) {
    ElMessage.error('项目加载失败')
    return
  }
  if (kind === 'datasource') showDataSource.value = true
  else if (kind === 'alarm') showAlarmConfig.value = true
  else if (kind === 'tags') showTagTable.value = true
}

// 双击重命名：正在编辑的项目名与输入值
const editingName = ref<string | null>(null)
const editingValue = ref('')

// v-focus 局部指令：输入框出现时自动聚焦
const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus(),
}

function startRename(name: string) {
  editingName.value = name
  editingValue.value = name
}

async function confirmRename(oldName: string) {
  if (editingName.value === null) return
  const newName = editingValue.value.trim()
  editingName.value = null
  if (!newName || newName === oldName) return

  if (await projectStore.renameSavedProject(oldName, newName)) {
    ElMessage.success('已重命名')
  } else {
    ElMessage.error('重命名失败：名称为空或与已有项目重名')
  }
  await loadRecentProjects()
}

function cancelRename() {
  editingName.value = null
}

onMounted(() => {
  void loadRecentProjects()
})

async function loadRecentProjects() {
  const names = await projectStore.getSavedProjects()
  recentProjects.value = await Promise.all(
    names.map(async name => {
      try {
        const raw = await getStorage().get(`scada_project_${name}`)
        const data = raw ? JSON.parse(raw) : null
        return {
          name,
          lastModified: data?.timestamp ? new Date(data.timestamp).toLocaleString() : '未知',
        }
      } catch {
        return { name, lastModified: '未知' }
      }
    }),
  )
}

function goToEditor() {
  projectStore.resetProject()
  router.push('/editor')
}

async function openProject() {
  await loadRecentProjects()
  if (recentProjects.value.length === 0) {
    ElMessage.info('暂无已保存的项目，请先新建或导入')
    return
  }
  showOpenDialog.value = true
}

function importProject() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const json = e.target?.result as string
        if (projectStore.importProject(json)) {
          ElMessage.success('项目导入成功')
          router.push('/editor')
        } else {
          ElMessage.error('项目导入失败')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

async function loadProject(name: string) {
  if (await projectStore.loadProject(name)) {
    router.push('/editor')
  } else {
    ElMessage.error('项目加载失败')
  }
}

async function deleteProject(name: string) {
  try {
    await ElMessageBox.confirm(`确定要删除项目"${name}"吗？`, '确认', {
      type: 'warning',
    })
    await projectStore.deleteProject(name)
    loadRecentProjects()
    ElMessage.success('项目已删除')
  } catch {
    // 取消操作
  }
}
</script>

<style scoped lang="scss">
.dashboard-container {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.06), transparent),
    var(--bg-primary);
  padding: 48px 40px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 56px;

  .header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    text-align: left;
  }

  .header-brand {
    flex: 1;
    text-align: center;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 8px;
  }

  h1 {
    font-size: 40px;
    font-weight: 700;
    letter-spacing: 1px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 10px;
  }

  p {
    font-size: 15px;
    color: var(--text-muted);
    letter-spacing: 3px;
  }
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-card {
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 10px;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent-primary), transparent 60%);
    opacity: 0;
    transition: opacity 0.25s;
  }

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--accent-primary);
    border-color: var(--accent-primary);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(-2px);
  }

  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-tertiary);
  }

  :deep(.el-card__body) {
    padding: 16px 20px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 14px;
    color: var(--text-primary);

    .el-icon {
      color: var(--accent-primary);
      font-size: 22px;
    }

    span {
      font-size: 17px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
  }

  p {
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.recent-projects {
  margin-top: 56px;

  h2 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 16px;
    padding-left: 12px;
    border-left: 3px solid var(--accent-primary);
  }
}

.open-project-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.rename-input {
  width: 100%;
  padding: 4px 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 1px solid var(--accent-primary);
  border-radius: 4px;
  outline: none;
}

.project-name-text {
  cursor: text;
}
</style>