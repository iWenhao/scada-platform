<template>
  <el-dialog
    v-model="visible"
    title="状态规则配置"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="status-rule-editor">
      <div class="rule-list">
        <div class="rule-list-header">
          <span>规则列表</span>
          <el-button size="small" @click="addRule">
            <el-icon><Plus /></el-icon>
            添加规则
          </el-button>
        </div>
        
        <div class="rule-items">
          <div
            v-for="(rule, index) in rules"
            :key="rule.id"
            class="rule-item"
            :class="{ active: selectedIndex === index }"
            @click="selectRule(index)"
          >
            <div
              class="rule-color"
              :style="{ backgroundColor: rule.color }"
            />
            <span class="rule-name">{{ rule.name }}</span>
            <el-button
              size="small"
              type="danger"
              text
              @click.stop="removeRule(index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      
      <div v-if="selectedRule" class="rule-detail">
        <el-form :model="selectedRule" label-width="100px">
          <el-form-item label="状态名称">
            <el-input v-model="selectedRule.name" />
          </el-form-item>
          
          <el-form-item label="状态颜色">
            <el-color-picker v-model="selectedRule.color" />
          </el-form-item>

          <el-form-item label="报警级别">
            <el-select
              v-model="selectedRule.severity"
              clearable
              placeholder="按颜色自动判定"
            >
              <el-option label="正常" value="normal" />
              <el-option label="预警" value="warning" />
              <el-option label="报警" value="critical" />
            </el-select>
            <span class="hint">只有预警与报警会计入报警面板</span>
          </el-form-item>
          
          <el-form-item label="优先级">
            <el-input-number
              v-model="selectedRule.priority"
              :min="1"
              :max="100"
            />
            <span class="hint">数字越小优先级越高</span>
          </el-form-item>
          
          <el-form-item label="条件类型">
            <el-select v-model="selectedRule.condition.type">
              <el-option label="比较" value="compare" />
              <el-option label="区间" value="range" />
              <el-option label="逻辑与" value="and" />
              <el-option label="逻辑或" value="or" />
              <el-option label="表达式" value="expression" />
            </el-select>
          </el-form-item>
          
          <!-- 比较条件 -->
          <template v-if="selectedRule.condition.type === 'compare'">
            <el-form-item label="变量名">
              <el-input v-model="selectedRule.condition.variable" />
            </el-form-item>
            <el-form-item label="运算符">
              <el-select v-model="selectedRule.condition.operator">
                <el-option label="大于 >" value=">" />
                <el-option label="小于 <" value="<" />
                <el-option label="等于 =" value="=" />
                <el-option label="大于等于 >=" value=">=" />
                <el-option label="小于等于 <=" value="<=" />
                <el-option label="不等于 !=" value="!=" />
              </el-select>
            </el-form-item>
            <el-form-item label="比较值">
              <el-input-number v-model="selectedRule.condition.value" />
            </el-form-item>
          </template>
          
          <!-- 区间条件 -->
          <template v-if="selectedRule.condition.type === 'range'">
            <el-form-item label="变量名">
              <el-input v-model="selectedRule.condition.variable" />
            </el-form-item>
            <el-form-item label="最小值">
              <el-input-number v-model="selectedRule.condition.min" />
            </el-form-item>
            <el-form-item label="最大值">
              <el-input-number v-model="selectedRule.condition.max" />
            </el-form-item>
          </template>
          
          <!-- 表达式条件 -->
          <template v-if="selectedRule.condition.type === 'expression'">
            <el-form-item label="表达式">
              <el-input
                v-model="selectedRule.condition.expr"
                type="textarea"
                :rows="3"
                placeholder="例如: speed > 100 AND temp < 80"
              />
            </el-form-item>
          </template>
        </el-form>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { StatusRule } from '@/types/scada'

const props = defineProps<{
  modelValue: boolean
  initialRules: StatusRule[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [rules: StatusRule[]]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const rules = ref<StatusRule[]>([])
const selectedIndex = ref<number>(-1)

const selectedRule = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < rules.value.length) {
    return rules.value[selectedIndex.value]
  }
  return null
})

watch(() => props.modelValue, (val) => {
  if (val) {
    rules.value = JSON.parse(JSON.stringify(props.initialRules))
    selectedIndex.value = rules.value.length > 0 ? 0 : -1
  }
})

function selectRule(index: number) {
  selectedIndex.value = index
}

function addRule() {
  const newRule: StatusRule = {
    id: `rule_${Date.now()}`,
    name: '新状态',
    color: '#00d4aa',
    // 新建规则默认不算报警，避免用户随手加规则就刷满报警面板
    severity: 'normal',
    condition: {
      type: 'compare',
      variable: 'speed',
      operator: '>',
      value: 0,
    },
    priority: rules.value.length + 1,
  }
  
  rules.value.push(newRule)
  selectedIndex.value = rules.value.length - 1
}

function removeRule(index: number) {
  rules.value.splice(index, 1)
  if (selectedIndex.value >= rules.value.length) {
    selectedIndex.value = rules.value.length - 1
  }
}

function handleConfirm() {
  emit('confirm', [...rules.value])
  visible.value = false
}
</script>

<style scoped lang="scss">
.status-rule-editor {
  display: flex;
  gap: 16px;
  min-height: 400px;
}

.rule-list {
  width: 200px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow: hidden;
}

.rule-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  
  span {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }
}

.rule-items {
  max-height: 350px;
  overflow-y: auto;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-primary);
  transition: background-color 0.2s;
  
  &:hover {
    background: var(--bg-tertiary);
  }
  
  &.active {
    background: var(--bg-tertiary);
    border-left: 3px solid var(--accent-primary);
  }
  
  .rule-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  
  .rule-name {
    flex: 1;
    font-size: 13px;
    color: var(--text-primary);
  }
}

.rule-detail {
  flex: 1;
  padding: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow-y: auto;
}

.hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}
</style>
