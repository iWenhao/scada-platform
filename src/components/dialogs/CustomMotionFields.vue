<template>
  <el-form-item label="运转动效">
    <el-switch v-model="enabled" active-text="有旋转部件" />
    <p v-if="enabled" class="tip">
      把旋转部件从上面的主图元里<b>删掉</b>，再贴到这里——主图元是一整张位图，
      位图里的某个圆无法单独旋转，留在主图元里会出现「静止件 + 转动件」重影。
    </p>
  </el-form-item>

  <div v-if="enabled" class="motion-block">
    <el-input
      v-model="svg"
      type="textarea"
      :rows="2"
      spellcheck="false"
      placeholder='旋转部件片段，例如 <circle cx="50" cy="50" r="14" stroke="currentColor" fill="none" />'
    />
    <div class="motion-fields">
      <label>圆心 X
        <el-input-number v-model="cx" :controls="false" size="small" />
      </label>
      <label>圆心 Y
        <el-input-number v-model="cy" :controls="false" size="small" />
      </label>
      <label>方向
        <el-select v-model="direction" size="small">
          <el-option label="顺时针" :value="1" />
          <el-option label="逆时针" :value="-1" />
        </el-select>
      </label>
      <label>角速度
        <el-input-number v-model="degPerUnit" :controls="false" size="small" />
      </label>
      <label>驱动变量
        <el-input v-model="driveVariable" size="small" placeholder="留空取第一个绑定" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
/*
 * 动效件表单区。字段用多 v-model（Vue ≥3.4 的 defineModel）逐项绑定，父组件
 * （CustomComponentDialog）仍是唯一数据源——它要在保存时读这些值装配 motion 定义。
 *
 * 数字字段的类型是 number | undefined：el-input-number 清空时 emits undefined，
 * 声明宽一点省得模板侧 v-model 报类型错误（父组件保存时统一 Number() 兜底）。
 */
const enabled = defineModel<boolean>('enabled', { required: true })
const svg = defineModel<string>('svg', { required: true })
const cx = defineModel<number | undefined>('cx', { required: true })
const cy = defineModel<number | undefined>('cy', { required: true })
const direction = defineModel<1 | -1>('direction', { required: true })
const degPerUnit = defineModel<number | undefined>('degPerUnit', { required: true })
const driveVariable = defineModel<string>('driveVariable', { required: true })
</script>

<style src="./custom-component.scss" scoped lang="scss"></style>
