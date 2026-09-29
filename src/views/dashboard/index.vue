<template>
  <div class="dashboard-container">
    <!-- 顶栏 -->
    <div class="top-nav">
      <div class="nav-brand">
        <div class="brand-mark" />
        <div>
          <div class="brand-title">SCADA Platform</div>
          <div class="brand-sub">工业组态可视化平台</div>
        </div>
      </div>
      <div class="nav-actions">
        <el-dropdown @command="handleSystemCommand">
          <el-button text>
            <el-icon><Tools /></el-icon>
            系统设置
            <el-icon><ArrowDown /></el-icon>
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

    <div class="dashboard-content">
      <!-- 欢迎条 -->
      <div class="hero">
        <div>
          <h1>欢迎回来，{{ authStore.displayName || '用户' }}</h1>
          <p class="hero-sub">{{ heroSummary }}</p>
        </div>
        <div class="hero-actions">
          <el-button type="primary" @click="goToEditor">
            <el-icon><Plus /></el-icon>
            新建工程
          </el-button>
          <el-button @click="importProject">导入</el-button>
        </div>
      </div>

      <!-- 工作台数据条 -->
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

      <!-- 最近项目卡片 -->
      <div class="section-head">
        <h2>最近项目</h2>
        <span class="section-sub">按修改时间排序</span>
      </div>

      <div v-if="recentProjects.length" class="project-grid">
        <div
          v-for="row in recentProjects"
          :key="row.name"
          class="project-card"
          :class="{ published: !!row.publishedAt }"
        >
          <div class="thumb">
            <div class="thumb-scene">
              <div class="node n1" />
              <div class="node n2" />
              <div class="node n3" />
              <div class="pipe p1" />
              <div class="pipe p2" />
            </div>
            <div class="thumb-label">{{ row.name }}</div>
          </div>
          <div class="card-body">
            <div class="badge-row">
              <el-tag v-if="row.publishedAt" size="small" type="success">已发布</el-tag>
              <el-tag v-else size="small" type="info">草稿</el-tag>
              <span class="page-count">{{ row.pageCount || 1 }} 画面</span>
            </div>
            <div class="project-title" :title="row.name">
              <input
                v-if="editingName === row.name"
                v-model="editingValue"
                v-focus
                class="rename-input"
                @keyup.enter="confirmRename(row.name)"
                @keyup.escape="cancelRename"
                @blur="confirmRename(row.name)"
              />
              <span v-else class="title-text" @dblclick="startRename(row.name)">{{ row.name }}</span>
            </div>
            <div class="project-meta">
              修改 {{ row.lastModified }}
              <template v-if="row.publishedAt"> · 发布 {{ formatTime(row.publishedAt) }}</template>
            </div>
            <div class="card-actions">
              <el-button type="primary" size="small" @click="loadProject(row.name)">打开编辑</el-button>
              <el-button size="small" @click="previewProject(row.name)">预览</el-button>
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
              <el-button
                v-if="!row.publishedAt"
                size="small"
                type="success"
                plain
                @click="publishProject(row.name)"
              >
                发布
              </el-button>
              <el-button v-else size="small" type="warning" plain @click="unpublishProject(row.name)">
                取消发布
              </el-button>
              <el-dropdown @command="(cmd: string) => handleCardCommand(cmd, row.name)">
                <el-button size="small" text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>

        <!-- 新建 / 示例 -->
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

    <!-- 系统设置 -->
    <NotifyConfigDialog v-model="showNotifyConfig" />
    <UserManageDialog v-model="showUserManage" />

    <!-- 项目配置 -->
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
import { useAlarmStore } from '@/stores/alarmStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { getStorage } from '@/storage'
import { ElMessageBox, ElMessage } from 'element-plus'
import { ROLE_LABELS } from '@/types/auth'
import NotifyConfigDialog from '@/components/dialogs/NotifyConfigDialog.vue'
import UserManageDialog from '@/components/dialogs/UserManageDialog.vue'
import DataSourceDialog from '@/components/dialogs/DataSourceDialog.vue'
import AlarmConfigDialog from '@/components/dialogs/AlarmConfigDialog.vue'
import TagTableDialog from '@/components/dialogs/TagTableDialog.vue'
// 打包进前端，便于「导入示例 Demo」离线可用
import demoProjectJson from '../../../examples/demo-project.json?raw'

const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()
const alarmStore = useAlarmStore()
const deviceStore = useDeviceStore()

interface ProjectRow {
  name: string
  lastModified: string
  publishedAt: number | null
  pageCount: number
  timestamp: number
}

const recentProjects = ref<ProjectRow[]>([])
const showOpenDialog = ref(false)

const showNotifyConfig = ref(false)
const showUserManage = ref(false)
const showDataSource = ref(false)
const showAlarmConfig = ref(false)
const showTagTable = ref(false)

const editingName = ref<string | null>(null)
const editingValue = ref('')

const vFocus = {
  mounted: (el: HTMLInputElement) => el.focus(),
}

const publishedCount = computed(() => recentProjects.value.filter(p => p.publishedAt).length)

const dataSourceLabel = computed(() => {
  const s = deviceStore.connectionStatus
  if (s === 'connected') return '已连接'
  if (s === 'error') return '连接错误'
  return '未连接'
})

const heroSummary = computed(() => {
  const alarms = alarmStore.unackedCount
  const pub = publishedCount.value
  const parts: string[] = []
  parts.push(alarms ? `今天有 ${alarms} 条未确认报警` : '暂无未确认报警')
  if (pub) parts.push(`${pub} 个工程已发布`)
  return parts.join(' · ')
})

const roleLabel = computed(() => (authStore.role ? ROLE_LABELS[authStore.role] : ''))
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
  if (cmd === 'users') showUserManage.value = true
  else if (cmd === 'logout') {
    await authStore.logout()
    window.location.href = '/login'
  }
}

function handleCardCommand(cmd: string, name: string) {
  if (cmd === 'rename') {
    startRename(name)
  } else if (cmd === 'delete') {
    void deleteProject(name)
  }
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
        return {
          name,
          lastModified: data?.timestamp ? new Date(data.timestamp).toLocaleString() : '未知',
          publishedAt,
          pageCount,
          timestamp: data?.timestamp || 0,
        }
      } catch {
        return { name, lastModified: '未知', publishedAt: null, pageCount: 1, timestamp: 0 }
      }
    }),
  )
  rows.sort((a, b) => b.timestamp - a.timestamp)
  recentProjects.value = rows
}

function formatTime(t: number) {
  return new Date(t).toLocaleString()
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

/** 导入内置示例工程（已打进前端包，离线可用） */
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

<style scoped lang="scss">
.dashboard-container {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.07), transparent),
    var(--bg-primary);
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 40px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.brand-sub {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 1px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  border: 1px solid var(--border-primary);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 36px 40px 48px;
}

.hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
  }
}

.hero-sub {
  color: var(--text-secondary);
  font-size: 13px;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 36px;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: baseline;
  gap: 8px;

  .stat-unit {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-muted);
  }

  &.accent {
    color: var(--accent-primary);
  }

  &.danger {
    color: var(--accent-danger);
  }

  &.sm {
    font-size: 18px;
    align-items: center;
    gap: 10px;
    padding-top: 6px;
  }

  .stat-badge {
    font-size: 11px;
    color: var(--accent-danger);
    background: rgba(255, 71, 87, 0.12);
    padding: 2px 8px;
    border-radius: 10px;
  }
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--status-unknown);
  box-shadow: 0 0 0 3px rgba(102, 102, 102, 0.2);
}

// 与 deviceStore 连接状态粗同步（详情在数据源对话框）
.stat-card:nth-child(3) .stat-value {
  color: var(--accent-primary);
  .status-dot {
    background: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(0, 212, 170, 0.18);
  }
}

.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;

  h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
  }
}

.section-sub {
  font-size: 12px;
  color: var(--text-muted);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;

  &.published {
    border-color: rgba(0, 212, 170, 0.45);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--accent-primary);
  }
}

.thumb {
  height: 140px;
  background: linear-gradient(145deg, var(--bg-tertiary), var(--bg-secondary));
  position: relative;
  overflow: hidden;
}

.thumb-scene {
  position: absolute;
  inset: 0;
  opacity: 0.85;
}

.node {
  position: absolute;
  border-radius: 6px;
  border: 1.5px solid;
}

.n1 {
  left: 18%;
  top: 38%;
  width: 54px;
  height: 34px;
  border-color: var(--accent-primary);
  background: rgba(0, 212, 170, 0.2);
}

.n2 {
  left: 42%;
  top: 30%;
  width: 36px;
  height: 48px;
  border-color: var(--accent-info);
  background: rgba(52, 152, 219, 0.2);
}

.n3 {
  left: 62%;
  top: 42%;
  width: 64px;
  height: 28px;
  border-color: var(--accent-warning);
  background: rgba(255, 165, 2, 0.15);
}

.pipe {
  position: absolute;
  height: 2px;
  background: var(--accent-primary);
  opacity: 0.55;
}

.p1 {
  left: calc(18% + 54px);
  top: 52%;
  width: 42px;
}

.p2 {
  left: calc(42% + 36px);
  top: 52%;
  width: 38px;
  background: var(--accent-primary);
  opacity: 0.4;
}

.thumb-label {
  position: absolute;
  left: 12px;
  top: 10px;
  font-size: 11px;
  color: rgba(224, 224, 224, 0.7);
}

.card-body {
  padding: 14px 16px 16px;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.page-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-primary);
  padding: 2px 8px;
  border-radius: 10px;
}

.project-title {
  margin-bottom: 6px;

  .title-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    cursor: text;
  }
}

.project-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.project-card.ghost {
  border-style: dashed;
  cursor: pointer;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: var(--accent-primary);
  }
}

.ghost-center {
  text-align: center;
  padding: 24px;
}

.ghost-plus {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent-primary);

  &.lg {
    width: 64px;
    height: 64px;
    font-size: 32px;
    margin-bottom: 16px;
  }
}

.ghost-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.ghost-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.demo-btn {
  width: 160px;
}

.empty-state {
  text-align: center;
  padding: 64px 20px;
  background: var(--bg-secondary);
  border: 1px dashed var(--border-primary);
  border-radius: 14px;

  h3 {
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  p {
    color: var(--text-secondary);
    font-size: 13px;
    margin: 0 0 20px;
  }
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.footer-hint {
  margin-top: 36px;
  padding-top: 16px;
  border-top: 1px solid var(--border-primary);

  p {
    margin: 0;
    font-size: 12px;
    color: var(--text-muted);
  }
}

.open-project-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.open-project-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-primary);
  cursor: pointer;

  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
  }
}

.open-project-info {
  .open-project-name {
    color: var(--text-primary);
    font-size: 14px;
  }

  .open-project-time {
    color: var(--text-muted);
    font-size: 12px;
  }
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

@media (max-width: 900px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
