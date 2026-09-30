<template>
  <!-- 工具栏线性图标：统一线宽/圆角，比默认字体图标更「工装」 -->
  <svg
    class="tool-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 选择：箭头 + 准星角 -->
    <g v-if="name === 'select'">
      <path d="M5 3.5 L5 17.5 L9.2 13.6 L12.1 20.2 L14.6 19 L11.7 12.5 L17.2 12.2 Z" />
      <path d="M17 5.5 h2.5 M18.25 4.25 v2.5" opacity="0.75" />
    </g>

    <!-- 连线：两节点 + 贝塞尔 -->
    <g v-else-if="name === 'connect'">
      <circle cx="5.5" cy="17.5" r="2.2" />
      <circle cx="18.5" cy="6.5" r="2.2" />
      <path d="M7.4 15.8 C10 12, 12 10, 16.3 8" />
    </g>

    <!-- 平移：抓手 -->
    <g v-else-if="name === 'hand'">
      <path d="M8 11.5 V6.8 a1.4 1.4 0 0 1 2.8 0 V11" />
      <path d="M10.8 11 V5.8 a1.4 1.4 0 0 1 2.8 0 V11" />
      <path d="M13.6 11.2 V7.2 a1.4 1.4 0 0 1 2.8 0 V13.2 c0 3.6-2 6.2-5.4 6.2 h-1.2 c-2.8 0-4.6-1.6-5.2-4.2 L4 12.4 a1.3 1.3 0 0 1 2.4-1 L7.2 13.2" />
    </g>

    <!-- 标尺 -->
    <g v-else-if="name === 'ruler'">
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M7 8 v3 M11 8 v4.5 M15 8 v3 M19 8 v4.5" />
    </g>

    <!-- 小地图 -->
    <g v-else-if="name === 'minimap'">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <rect x="7" y="8" width="6.5" height="5" rx="0.8" opacity="0.9" />
      <circle cx="16.5" cy="15.2" r="1.1" fill="currentColor" stroke="none" />
      <path d="M3.5 16.5 h5.5 M15 5 v3.5" opacity="0.55" />
    </g>

    <!-- 撤销 / 重做 -->
    <g v-else-if="name === 'undo'">
      <path d="M8.5 7.5 H14 a4.5 4.5 0 1 1 0 9 H10" />
      <path d="M10.5 4.8 L7.2 7.5 L10.5 10.2" />
    </g>
    <g v-else-if="name === 'redo'">
      <path d="M15.5 7.5 H10 a4.5 4.5 0 1 0 0 9 H14" />
      <path d="M13.5 4.8 L16.8 7.5 L13.5 10.2" />
    </g>

    <!-- 复制 / 粘贴 / 删除 -->
    <g v-else-if="name === 'copy'">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8 V6.2 A1.7 1.7 0 0 0 14.3 4.5 H6.2 A1.7 1.7 0 0 0 4.5 6.2 v8.1 A1.7 1.7 0 0 0 6.2 16 H8" />
    </g>
    <g v-else-if="name === 'paste'">
      <path d="M9 5.5 H7.5 A1.5 1.5 0 0 0 6 7 v12 A1.5 1.5 0 0 0 7.5 20.5 h9 A1.5 1.5 0 0 0 18 19 V7 a1.5 1.5 0 0 0-1.5-1.5 H15" />
      <rect x="9" y="3.5" width="6" height="3.5" rx="1.2" />
      <path d="M9.5 12 h5 M9.5 15.5 h3.5" />
    </g>
    <g v-else-if="name === 'delete'">
      <path d="M5.5 7.5 h13" />
      <path d="M9 7.5 V5.8 a1.3 1.3 0 0 1 1.3-1.3 h3.4 A1.3 1.3 0 0 1 15 5.8 V7.5" />
      <path d="M7.5 7.5 l1 12.2 a1.5 1.5 0 0 0 1.5 1.3 h4a1.5 1.5 0 0 0 1.5-1.3 l1-12.2" />
      <path d="M10.2 11 v6 M13.8 11 v6" />
    </g>

    <!-- 缩放 -->
    <g v-else-if="name === 'zoom-in'">
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.5 15.5 L20 20 M11 8.5 v5 M8.5 11 h5" />
    </g>
    <g v-else-if="name === 'zoom-out'">
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.5 15.5 L20 20 M8.5 11 h5" />
    </g>
    <g v-else-if="name === 'fit'">
      <path d="M4 9 V5.5 A1.5 1.5 0 0 1 5.5 4 H9 M15 4 h3.5 A1.5 1.5 0 0 1 20 5.5 V9 M20 15 v3.5 a1.5 1.5 0 0 1-1.5 1.5 H15 M9 20 H5.5 A1.5 1.5 0 0 1 4 18.5 V15" />
      <rect x="8.2" y="8.2" width="7.6" height="7.6" rx="1.2" opacity="0.85" />
    </g>

    <!-- 工程/文件 -->
    <g v-else-if="name === 'save'">
      <path d="M5 5.5 a1.5 1.5 0 0 1 1.5-1.5 h9.2 L20 8.2 v10.3 a1.5 1.5 0 0 1-1.5 1.5 h-13 A1.5 1.5 0 0 1 4 18.5 V5.5 Z" />
      <rect x="8" y="4" width="7" height="5" rx="0.8" />
      <path d="M8 20.5 v-5.5 h8 v5.5" />
    </g>
    <g v-else-if="name === 'download'">
      <path d="M12 4 v11 M8 11.5 L12 15.5 L16 11.5" />
      <path d="M5 18.5 h14" />
    </g>
    <g v-else-if="name === 'upload'">
      <path d="M12 16 V5 M8 8.8 L12 4.8 L16 8.8" />
      <path d="M5 18.5 h14" />
    </g>
    <g v-else-if="name === 'image'">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4.5 16.5 L9.2 12.2 L12.5 15.2 L15.2 12.8 L19.5 16.8" />
    </g>
    <g v-else-if="name === 'publish'">
      <path d="M12 19 V6.5" />
      <path d="M7.5 11 L12 6.2 L16.5 11" />
      <path d="M5.5 20.5 h13" />
    </g>
    <g v-else-if="name === 'play'">
      <path d="M9 7.2 L17.5 12 L9 16.8 Z" />
    </g>

    <!-- 主题 / 画布 / 设置 / 账号 -->
    <g v-else-if="name === 'theme-dark'">
      <path d="M18.5 14.2 A7 7 0 0 1 9.8 5.5 A7.2 7.2 0 1 0 18.5 14.2 Z" />
    </g>
    <g v-else-if="name === 'theme-light'">
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.5 v2.2 M12 18.3 v2.2 M3.5 12 h2.2 M18.3 12 h2.2 M5.9 5.9 l1.6 1.6 M16.5 16.5 l1.6 1.6 M5.9 18.1 l1.6-1.6 M16.5 7.5 l1.6-1.6" />
    </g>
    <g v-else-if="name === 'canvas'">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M3.5 9.5 h17 M9 5 v14" opacity="0.7" />
    </g>
    <g v-else-if="name === 'tools'">
      <path d="M14.2 6.2 l3.6 3.6 -8.5 8.5 -4.2.6.6-4.2 Z" />
      <path d="M12.4 8 L16 11.6" />
    </g>
    <g v-else-if="name === 'user'">
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M5.5 19.5 c1.2-3.2 3.6-4.8 6.5-4.8 s5.3 1.6 6.5 4.8" />
    </g>

    <!-- 2D / 2.5D 视图 -->
    <g v-else-if="name === 'view-2d'">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 12 H20 M12 4 V20" opacity="0.55" />
    </g>
    <g v-else-if="name === 'view-25d'">
      <path d="M4 10 L12 6 L20 10 L20 18 L12 22 L4 18 Z" fill="currentColor" fill-opacity="0.12" />
      <path d="M4 10 L12 6 L20 10 L12 14 Z" />
      <path d="M12 14 V22" />
      <path d="M4 10 V18 L12 22 V14 Z" opacity="0.75" />
    </g>

    <!-- 标签开关 -->
    <g v-else-if="name === 'label'">
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <text x="12" y="14.5" text-anchor="middle" font-size="6.5" fill="currentColor" stroke="none" font-weight="bold">Ab</text>
    </g>

    <!-- 默认：圆点占位 -->
    <circle v-else cx="12" cy="12" r="4" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<style scoped>
.tool-icon {
  width: 18px;
  height: 18px;
  display: block;
}
</style>
