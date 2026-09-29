<template>
  <div class="main-layout">
    <!-- 工具栏 -->
    <div class="toolbar">
      <Toolbar />
    </div>
    
    <div class="content-area">
      <!-- 左侧组件面板 -->
      <div v-if="uiStore.leftPanelOpen" class="left-panel">
        <ComponentPanel />
      </div>
      
      <!-- 中间画布区域 -->
      <div class="canvas-area">
        <PageTabs />
        <div class="canvas-slot">
          <slot />
        </div>
      </div>
      
      <!-- 右侧属性面板 -->
      <div v-if="uiStore.rightPanelOpen" class="right-panel">
        <PropertyPanel />
      </div>
    </div>
    
    <!-- 底部图层面板 -->
    <div v-if="uiStore.bottomPanelOpen" class="bottom-panel">
      <LayerPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUiStore } from '@/stores/uiStore'
import Toolbar from './Toolbar.vue'
import ComponentPanel from './ComponentPanel.vue'
import PropertyPanel from './PropertyPanel.vue'
import LayerPanel from './LayerPanel.vue'
import PageTabs from './PageTabs.vue'

const uiStore = useUiStore()
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
}

.toolbar {
  height: 48px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
}

.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.canvas-slot {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.right-panel {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bottom-panel {
  height: 200px;
  flex-shrink: 0;
  border-top: 1px solid var(--border-primary);
}
</style>
