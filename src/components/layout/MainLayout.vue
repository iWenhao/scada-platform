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
  height: 52px;
  background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
  box-shadow: 0 1px 0 rgba(0, 212, 170, 0.08);
}

.content-area {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  width: 248px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary);
}

.canvas-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-canvas);
}

.canvas-slot {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.right-panel {
  width: 288px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-secondary);
}

.bottom-panel {
  height: 180px;
  flex-shrink: 0;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}
</style>
