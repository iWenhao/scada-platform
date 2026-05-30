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
          <el-table-column prop="name" label="项目名称" />
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

onMounted(() => {
  loadRecentProjects()
})

function loadRecentProjects() {
  const projects = projectStore.getSavedProjects()
  recentProjects.value = projects.map(name => ({
    name,
    lastModified: '未知', // 实际应该从项目数据中读取
  }))
}

function goToEditor() {
  projectStore.resetProject()
  router.push('/editor')
}

function openProject() {
  // TODO: 打开项目选择对话框
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
