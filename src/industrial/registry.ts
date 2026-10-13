import type { ComponentDefinition, ComponentGroup, ElementCapabilities } from '@/types/scada'

/** 组件注册表 */
const componentRegistry = new Map<string, ComponentDefinition>()

/** 注册组件 */
export function registerComponent(component: ComponentDefinition) {
  componentRegistry.set(component.type, component)
}

/** 注销组件（删除自定义组件时使用） */
export function unregisterComponent(type: string): void {
  componentRegistry.delete(type)
}

/** 批量注册组件 */
export function registerComponents(components: ComponentDefinition[]) {
  components.forEach(registerComponent)
}

/** 获取组件定义 */
export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return componentRegistry.get(type)
}

/**
 * 取组件的属性面板能力开关（缺省补全为 true）。
 *
 * 属性面板用它决定哪些通用分段该显示——未注册的类型（例如自定义图元尚未加载）
 * 按全部支持处理，避免在报错边缘把面板裁空。
 */
export function getElementCapabilities(type: string): Required<ElementCapabilities> {
  const c = componentRegistry.get(type)?.capabilities ?? {}
  return {
    navigate: c.navigate !== false,
    dataBinding: c.dataBinding !== false,
    statusRules: c.statusRules !== false,
    nameLabel: c.nameLabel !== false,
    valueLabel: c.valueLabel !== false,
  }
}

/** 获取所有组件 */
export function getAllComponents(): ComponentDefinition[] {
  return Array.from(componentRegistry.values())
}

/** 获取所有组件（按分组） */
export function getComponentsByGroup(): Map<ComponentGroup, ComponentDefinition[]> {
  const grouped = new Map<ComponentGroup, ComponentDefinition[]>()
  
  for (const component of componentRegistry.values()) {
    const group = grouped.get(component.group) || []
    group.push(component)
    grouped.set(component.group, group)
  }
  
  return grouped
}

/** 检查组件是否已注册 */
export function hasComponent(type: string): boolean {
  return componentRegistry.has(type)
}
