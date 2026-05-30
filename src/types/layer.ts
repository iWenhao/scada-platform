/** 图层类型 */
export type LayerType = 'background' | 'pipeline' | 'device' | 'annotation'

/** 图层 */
export interface Layer {
  id: string
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  order: number
}

/** 默认图层配置 */
export const defaultLayers: Layer[] = [
  {
    id: 'background',
    name: '背景层',
    type: 'background',
    visible: true,
    locked: true,
    order: 0,
  },
  {
    id: 'pipeline',
    name: '管道层',
    type: 'pipeline',
    visible: true,
    locked: false,
    order: 1,
  },
  {
    id: 'device',
    name: '设备层',
    type: 'device',
    visible: true,
    locked: false,
    order: 2,
  },
  {
    id: 'annotation',
    name: '标注层',
    type: 'annotation',
    visible: true,
    locked: false,
    order: 3,
  },
]
