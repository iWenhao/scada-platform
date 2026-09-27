<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1>SCADA Platform</h1>
      <p>工业组态可视化编辑平台</p>
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
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button size="small" @click="loadProject(row.name)">打开</el-button>
              <el-button size="small" type="danger" @click="deleteProject(row.name)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/projectStore'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const projectStore = useProjectStore()

const recentProjects = ref<Array<{ name: string; lastModified: string }>>([])
const showOpenDialog = ref(false)

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

function confirmRename(oldName: string) {
  if (editingName.value === null) return
  const newName = editingValue.value.trim()
  editingName.value = null
  if (!newName || newName === oldName) return

  if (projectStore.renameSavedProject(oldName, newName)) {
    ElMessage.success('已重命名')
  } else {
    ElMessage.error('重命名失败：名称为空或与已有项目重名')
  }
  loadRecentProjects()
}

function cancelRename() {
  editingName.value = null
}

onMounted(() => {
  loadRecentProjects()
})

function loadRecentProjects() {
  const projects = projectStore.getSavedProjects()
  recentProjects.value = projects.map(name => {
    try {
      const raw = localStorage.getItem(`scada_project_${name}`)
      const data = raw ? JSON.parse(raw) : null
      return {
        name,
        lastModified: data?.timestamp ? new Date(data.timestamp).toLocaleString() : '未知',
      }
    } catch {
      return { name, lastModified: '未知' }
    }
  })
}

function goToEditor() {
  projectStore.resetProject()
  router.push('/editor')
}

function openProject() {
  loadRecentProjects()
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

function loadProject(name: string) {
  if (projectStore.loadProject(name)) {
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
    projectStore.deleteProject(name)
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
  background: var(--bg-primary);
  padding: 40px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 60px;
  
  h1 {
    font-size: 36px;
    color: var(--accent-primary);
    margin-bottom: 8px;
  }
  
  p {
    font-size: 16px;
    color: var(--text-secondary);
  }
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-card {
  cursor: pointer;
  transition: all 0.3s;
  background: var(--bg-secondary);
  border-color: var(--border-primary);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--accent-primary);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--text-primary);
    
    span {
      font-size: 18px;
      font-weight: 500;
    }
  }
  
  p {
    color: var(--text-secondary);
    font-size: 14px;
  }
}

.recent-projects {
  margin-top: 60px;
  
  h2 {
    font-size: 20px;
    color: var(--text-primary);
    margin-bottom: 20px;
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

.open-project-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--accent-primary);
    background: var(--bg-tertiary);
  }

  .open-project-info {
    .open-project-name {
      font-size: 14px;
      color: var(--text-primary);
    }

    .open-project-time {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
  }
}

:deep(.el-card__header) {
  background: var(--bg-tertiary);
  border-bottom-color: var(--border-primary);
}

:deep(.el-table) {
  background: var(--bg-secondary);
  color: var(--text-primary);
  
  th.el-table__cell {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-bottom-color: var(--border-primary);
  }
  
  td.el-table__cell {
    border-bottom-color: var(--border-primary);
  }
}
</style>
