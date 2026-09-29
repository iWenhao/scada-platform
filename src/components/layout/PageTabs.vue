<template>
  <div class="page-tabs">
    <div class="tabs-scroll">
      <div
        v-for="page in pageStore.pages"
        :key="page.id"
        class="page-tab"
        :class="{ active: page.id === pageStore.activePageId }"
        @click="handleSwitch(page.id)"
        @dblclick="startRename(page)"
      >
        <span class="tab-name">{{ page.name }}</span>
        <el-dropdown
          v-if="pageStore.pages.length > 1 || page.id === pageStore.activePageId"
          trigger="click"
          @command="(cmd: string) => handleCommand(cmd, page)"
          @click.stop
        >
          <el-icon class="tab-more" @click.stop><ArrowDown /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename">重命名</el-dropdown-item>
              <el-dropdown-item command="duplicate">复制画面</el-dropdown-item>
              <el-dropdown-item
                command="delete"
                :disabled="pageStore.pages.length <= 1"
                divided
              >
                删除画面
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <el-tooltip content="新建画面" placement="bottom">
      <el-button class="add-btn" size="small" @click="handleAdd">
        <el-icon><Plus /></el-icon>
      </el-button>
    </el-tooltip>

    <el-dialog v-model="renameVisible" title="重命名画面" width="360px" append-to-body>
      <el-input
        v-model="renameValue"
        placeholder="画面名称"
        maxlength="40"
        @keyup.enter="confirmRename"
      />
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePageStore } from '@/stores/pageStore'
import { useProjectStore } from '@/stores/projectStore'
import { useHistory } from '@/core/canvas/useHistory'
import type { ScadaPage } from '@/types/page'

const pageStore = usePageStore()
const projectStore = useProjectStore()
const { clearHistory } = useHistory()

onMounted(() => {
  // 直开 /editor 时可能还没有任何画面，补一张空白主页
  if (!pageStore.pages.length) pageStore.reset()
})

const renameVisible = ref(false)
const renameValue = ref('')
const renamingId = ref('')

function markDirty() {
  projectStore.markDirty()
}

function handleSwitch(id: string) {
  if (id === pageStore.activePageId) return
  // 画面切换后撤销栈里是上一页的内容，直接清空避免串页
  pageStore.switchPage(id)
  clearHistory()
}

function handleAdd() {
  pageStore.addPage()
  clearHistory()
  markDirty()
}

function startRename(page: ScadaPage) {
  renamingId.value = page.id
  renameValue.value = page.name
  renameVisible.value = true
}

function confirmRename() {
  const ok = pageStore.renamePage(renamingId.value, renameValue.value)
  if (!ok) {
    ElMessage.warning('名称不能为空或与其它画面重复')
    return
  }
  renameVisible.value = false
  markDirty()
}

async function handleCommand(cmd: string, page: ScadaPage) {
  if (cmd === 'rename') {
    startRename(page)
    return
  }
  if (cmd === 'duplicate') {
    pageStore.duplicatePage(page.id)
    clearHistory()
    markDirty()
    return
  }
  if (cmd === 'delete') {
    if (pageStore.pages.length <= 1) {
      ElMessage.warning('至少保留一张画面')
      return
    }
    try {
      await ElMessageBox.confirm(
        `删除画面「${page.name}」？其中的元素与连线将一并删除。`,
        '删除画面',
        { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
      )
    } catch {
      return
    }
    pageStore.removePage(page.id)
    clearHistory()
    markDirty()
  }
}
</script>

<style scoped lang="scss">
.page-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.tabs-scroll {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;

  &::-webkit-scrollbar {
    height: 4px;
  }
}

.page-tab {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px 0 12px;
  height: 26px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  font-size: 12px;
  transition: background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease, transform .15s ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-active);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }

  &.active {
    color: var(--text-primary);
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
    font-weight: 600;
    box-shadow: 0 0 0 1px rgba(0, 212, 170, 0.25);
  }
}

.tab-more {
  opacity: 0.5;
  font-size: 12px;
  padding: 2px;

  &:hover {
    opacity: 1;
  }
}

.add-btn {
  flex-shrink: 0;
  border-radius: 8px;
}
</style>
