<template>
  <div class="dashboard-container">
    <TopNav
      :display-name="authStore.displayName"
      :role="authStore.role"
      :can-manage-users="authStore.canManageUsers"
      @system="handleSystemCommand"
      @user="handleUserCommand"
    />

    <div class="dashboard-content">
      <div class="hero">
        <div>
          <h1>欢迎回来，{{ authStore.displayName || '用户' }}</h1>
          <p class="hero-sub">{{ heroSummary }}</p>
        </div>
        <div class="hero-actions">
          <el-button @click="importProject">导入</el-button>
        </div>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">工程项目</div>
          <div class="stat-value">{{ recentProjects.length }}<span class="stat-unit">个</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value accent">
            {{ publishedCount }}<span class="stat-unit">运行版生效中</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">数据源</div>
          <div class="stat-value sm">
            <span class="status-dot" />
            {{ dataSourceLabel }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-label">未确认报警</div>
          <div class="stat-value" :class="alarmStore.unackedCount ? 'danger' : ''">
            {{ alarmStore.unackedCount }}
            <span v-if="alarmStore.activeCount" class="stat-badge">{{ alarmStore.activeCount }} 条活跃</span>
          </div>
        </div>
      </div>

      <div class="section-head">
        <h2>最近项目</h2>
        <span class="section-sub">按修改时间排序</span>
      </div>

      <div v-if="recentProjects.length" class="project-grid">
        <ProjectCard
          v-for="row in recentProjects"
          :key="row.name"
          :project="row"
          :editing="editingName === row.name"
          :model-value="editingValue"
          @update:model-value="editingValue = $event"
          @open="loadProject(row.name)"
          @preview="previewProject(row.name)"
          @publish="publishProject(row.name)"
          @unpublish="unpublishProject(row.name)"
          @config="(k) => openProjectConfig(row.name, k)"
          @more="(c) => handleCardCommand(c, row.name)"
          @start-rename="startRename(row.name)"
          @confirm-rename="confirmRename(row.name)"
          @cancel-rename="cancelRename"
        />
        <div class="project-card ghost" @click="goToEditor">
          <div class="ghost-center">
            <div class="ghost-plus">＋</div>
            <div class="ghost-title">新建工程</div>
            <div class="ghost-sub">从空白开始组态</div>
            <el-button size="small" type="primary" plain class="demo-btn" @click.stop="importDemo">
              导入示例 Demo
            </el-button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="ghost-plus lg">＋</div>
        <h3>还没有组态工程</h3>
        <p>新建空白工程，或导入示例快速体验工艺流程、报警与趋势。</p>
        <div class="empty-actions">
          <el-button type="primary" @click="goToEditor">新建工程</el-button>
          <el-button @click="importDemo">导入示例 Demo</el-button>
          <el-button @click="importProject">导入 JSON</el-button>
        </div>
      </div>

      <div class="footer-hint">
        <p>提示：发布后的工程才会出现在预览 / 运行端；草稿改动不影响值班画面。</p>
      </div>
    </div>

    <NotifyConfigDialog v-model="showNotifyConfig" />
    <UserManageDialog v-model="showUserManage" />
    <DataSourceDialog v-model="showDataSource" />
    <AlarmConfigDialog v-model="showAlarmConfig" />
    <TagTableDialog v-model="showTagTable" />
    <BrandingDialog v-model="showBranding" />

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
import { useAlarmStore } from '@/stores/alarmStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { getStorage } from '@/storage'
import { connectionStatusView } from '@/status/connection'
import { ElMessageBox, ElMessage } from 'element-plus'
import NotifyConfigDialog from '@/components/dialogs/NotifyConfigDialog.vue'
import UserManageDialog from '@/components/dialogs/UserManageDialog.vue'
import DataSourceDialog from '@/components/dialogs/DataSourceDialog.vue'
import AlarmConfigDialog from '@/components/dialogs/AlarmConfigDialog.vue'
import TagTableDialog from '@/components/dialogs/TagTableDialog.vue'
import BrandingDialog from '@/components/dialogs/BrandingDialog.vue'
import TopNav from './TopNav.vue'
import ProjectCard from './ProjectCard.vue'
import type { ProjectRow } from './types'
import { thumbKey } from '@/core/canvas/thumbnail'
import demoProjectJson from '../../../examples/demo-project.json?raw'
import './dashboard.scss'
import './project-card.scss'

const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const alarmStore = useAlarmStore()
const deviceStore = useDeviceStore()

const recentProjects = ref<ProjectRow[]>([])
const showOpenDialog = ref(false)
const showNotifyConfig = ref(false)
const showUserManage = ref(false)
const showDataSource = ref(false)
const showAlarmConfig = ref(false)
const showTagTable = ref(false)
const showBranding = ref(false)

const editingName = ref<string | null>(null)
const editingValue = ref('')

const publishedCount = computed(() => recentProjects.value.filter(p => p.publishedAt).length)

const dataSourceLabel = computed(() => connectionStatusView(deviceStore.connectionStatus).text)

const heroSummary = computed(() => {
  const alarms = alarmStore.unackedCount
  const pub = publishedCount.value
  const parts: string[] = []
  parts.push(alarms ? `今天有 ${alarms} 条未确认报警` : '暂无未确认报警')
  if (pub) parts.push(`${pub} 个工程已发布`)
  return parts.join(' · ')
})

function handleSystemCommand(cmd: string) {
  if (cmd === 'notify') showNotifyConfig.value = true
  else if (cmd === 'branding') showBranding.value = true
  else if (cmd === 'users') showUserManage.value = true
}

async function handleUserCommand(cmd: string) {
  if (cmd === 'users') showUserManage.value = true
  else if (cmd === 'logout') {
    await authStore.logout()
    window.location.href = '/login'
  }
}

function handleCardCommand(cmd: string, name: string) {
  if (cmd === 'rename') startRename(name)
  else if (cmd === 'delete') void deleteProject(name)
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

async function openProjectConfig(name: string, kind: string) {
  if (!(await projectStore.loadProject(name))) {
    ElMessage.error('项目加载失败')
    return
  }
  if (kind === 'datasource') showDataSource.value = true
  else if (kind === 'alarm') showAlarmConfig.value = true
  else if (kind === 'tags') showTagTable.value = true
}

onMounted(() => {
  void loadRecentProjects()
})

async function loadRecentProjects() {
  const names = await projectStore.getSavedProjects()
  const rows = await Promise.all(
    names.map(async name => {
      try {
        const raw = await getStorage().get(`scada_project_${name}`)
        const data = raw ? JSON.parse(raw) : null
        const publishedAt = await projectStore.getPublishedAt(name)
        const pageCount = Array.isArray(data?.pages) ? data.pages.length : 1
        const thumb = await getStorage().get(thumbKey(name))
        return {
          name,
          lastModified: data?.timestamp ? new Date(data.timestamp).toLocaleString() : '未知',
          publishedAt,
          pageCount,
          timestamp: data?.timestamp || 0,
          thumbnail: thumb || null,
        }
      } catch {
        return {
          name,
          lastModified: '未知',
          publishedAt: null,
          pageCount: 1,
          timestamp: 0,
          thumbnail: null,
        }
      }
    }),
  )
  rows.sort((a, b) => b.timestamp - a.timestamp)
  recentProjects.value = rows
}

async function publishProject(name: string) {
  try {
    await ElMessageBox.confirm(
      `将「${name}」当前内容发布为运行版？预览将显示发布版。`,
      '发布工程',
      { type: 'warning', confirmButtonText: '发布', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  if (!(await projectStore.loadProject(name))) {
    ElMessage.error('项目加载失败')
    return
  }
  await projectStore.publishProject()
  ElMessage.success('已发布')
  await loadRecentProjects()
}

async function unpublishProject(name: string) {
  try {
    await ElMessageBox.confirm(`取消发布「${name}」？预览将回落到草稿。`, '取消发布', {
      type: 'warning',
      confirmButtonText: '取消发布',
      cancelButtonText: '返回',
    })
  } catch {
    return
  }
  await projectStore.unpublishProject(name)
  ElMessage.success('已取消发布')
  await loadRecentProjects()
}

function goToEditor() {
  projectStore.resetProject()
  router.push('/editor')
}

function previewProject(name: string) {
  router.push({ path: '/preview', query: { project: name } })
}

function importProject() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const json = ev.target?.result as string
      if (projectStore.importProject(json)) {
        ElMessage.success('项目导入成功')
        router.push('/editor')
      } else {
        ElMessage.error('项目导入失败')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function importDemo() {
  try {
    if (projectStore.importProject(demoProjectJson)) {
      ElMessage.success('示例工程已导入')
      router.push('/editor')
    } else {
      ElMessage.error('示例导入失败')
    }
  } catch {
    ElMessage.error('示例导入失败')
  }
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
    await ElMessageBox.confirm(`确定要删除项目「${name}」吗？发布快照也会一并删除。`, '确认', {
      type: 'warning',
    })
  } catch {
    return
  }
  await projectStore.deleteProject(name)
  await loadRecentProjects()
  ElMessage.success('项目已删除')
}
</script>
