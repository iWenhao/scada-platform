<template>
  <div class="project-card" :class="{ published: !!project.publishedAt }">
    <div class="thumb">
      <img v-if="project.thumbnail" :src="project.thumbnail" class="thumb-img" :alt="project.name" />
      <div v-else class="thumb-scene">
        <div class="node n1" />
        <div class="node n2" />
        <div class="node n3" />
        <div class="pipe p1" />
        <div class="pipe p2" />
      </div>
      <div class="thumb-label">{{ project.name }}</div>
    </div>
    <div class="card-body">
      <div class="badge-row">
        <el-tag v-if="project.publishedAt" size="small" type="success">已发布</el-tag>
        <el-tag v-else size="small" type="info">草稿</el-tag>
        <span class="page-count">{{ project.pageCount || 1 }} 画面</span>
      </div>
      <div class="project-title" :title="project.name">
        <input
          v-if="editing"
          :value="modelValue"
          class="rename-input"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('confirm-rename')"
          @keyup.escape="emit('cancel-rename')"
          @blur="emit('confirm-rename')"
        />
        <span v-else class="title-text" @dblclick="emit('start-rename')">{{ project.name }}</span>
      </div>
      <div class="project-meta">
        修改 {{ project.lastModified }}
        <template v-if="project.publishedAt"> · 发布 {{ formatTime(project.publishedAt) }}</template>
      </div>
      <div class="card-actions">
        <el-button class="btn-accent" size="small" @click="emit('open')">打开编辑</el-button>
        <el-button class="btn-quiet" size="small" @click="emit('preview')">预览</el-button>
        <el-button
          v-if="!project.publishedAt"
          class="btn-quiet"
          size="small"
          @click="emit('publish')"
        >
          发布
        </el-button>
        <el-button v-else class="btn-quiet" size="small" @click="emit('unpublish')">
          取消发布
        </el-button>
        <el-dropdown class="card-more" @command="handleCommand">
          <el-button class="btn-quiet btn-more" size="small" text aria-label="更多操作">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="datasource">数据源</el-dropdown-item>
              <el-dropdown-item command="alarm">报警</el-dropdown-item>
              <el-dropdown-item command="tags">点表</el-dropdown-item>
              <el-dropdown-item command="rename" divided>重命名</el-dropdown-item>
              <!-- class 写不进 el-dropdown-item 的 li（EP 不透传 attrs），所以用内层 span 做钩子；
                   .menu-danger-label 的危险样式是全局规则，见 src/styles/index.scss -->
              <el-dropdown-item command="delete"><span class="menu-danger-label">删除</span></el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectRow } from './types'

defineProps<{
  project: ProjectRow
  editing?: boolean
  modelValue?: string
}>()

const emit = defineEmits<{
  open: []
  preview: []
  publish: []
  unpublish: []
  config: [kind: string]
  more: [cmd: string]
  'start-rename': []
  'confirm-rename': []
  'cancel-rename': []
  'update:modelValue': [v: string]
}>()

// 「⋯ 更多」同时承载配置项与卡片操作，按命令分流回原有两个事件，父组件契约不变
const CONFIG_COMMANDS = ['datasource', 'alarm', 'tags']

function handleCommand(cmd: string) {
  if (CONFIG_COMMANDS.includes(cmd)) emit('config', cmd)
  else emit('more', cmd)
}

function formatTime(t: number) {
  return new Date(t).toLocaleString()
}
</script>

<style scoped>
.thumb-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
