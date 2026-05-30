import type { ComponentDefinition, ComponentGroup } from '@/types/scada'

/** 组件注册表 */
const componentRegistry = new Map<string, ComponentDefinition>()

/** 注册组件 */
export function registerComponent(component: ComponentDefinition) {
  componentRegistry.set(component.type, component)
}

/** 批量注册组件 */
export function registerComponents(components: ComponentDefinition[]) {
  components.forEach(registerComponent)
}

/** 获取组件定义 */
export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return componentRegistry.get(type)
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
