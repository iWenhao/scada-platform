/**
 * 3D 场景集成核对（临时校验产物，不进构建）。
 *
 * 上一个探针只验证了「模型长什么样」，绕过了真实的场景装配路径。sceneSync 这一轮是
 * 重写过的（模型组 + 不可见拾取盒 + 可动件逐帧 + 管线锚到设备高度），所以这里直接调用
 * **真实的 use3DScene**（渲染器/相机/灯光/环境贴图/阴影/地面/轨道控制/拾取全在其中），
 * 喂一份完整的小型厂区布局，看整体是不是能看。
 *
 * 与生产路径的唯一差别是：元素视图模型由这里手写，而不是 Preview3DStage 从 Pinia
 * 与 useElementVisuals 算出来（那部分由 vue-tsc 与单测覆盖）。
 */
import { use3DScene } from '@/core/scene3d/use3DScene'
import { computeSceneBounds } from '@/core/scene3d/coordinates'
import type { Scene3DElement } from '@/core/scene3d/sceneSync'
import type { Connection } from '@/types/connection'

const FALLBACK_BG = '#0b1220'

function el(
  id: string,
  type: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  motion?: { running: boolean; degPerSec: number },
): Scene3DElement {
  return { id, type, name, x, y, width, height, rotation: 0, color, label: name, value: '', motion }
}

const RUN = '#00d4aa'
const STOP = '#666666'
const WARN = '#ffa502'

const elements: Scene3DElement[] = [
  el('e1', 'shearer', '采煤机', 40, 60, 176, 96, RUN, { running: true, degPerSec: 140 }),
  el('e2', 'roadheader', '掘进机', 40, 250, 160, 96, STOP, { running: false, degPerSec: 0 }),
  el('e3', 'conveyor', '皮带输送机 1', 40, 500, 176, 80, RUN),
  el('e4', 'conveyor', '皮带输送机 2', 360, 500, 176, 80, RUN),
  el('e5', 'tank', '精煤仓 A', 500, 60, 128, 160, RUN),
  el('e6', 'tank', '精煤仓 B', 500, 280, 128, 160, WARN),
  el('e7', 'coal_bunker', '原煤仓', 760, 60, 112, 168, RUN),
  el('e8', 'pump', '给料泵', 760, 340, 128, 128, RUN),
  el('e9', 'motor', '泵电机', 940, 340, 128, 112, RUN),
  el('e10', 'valve', '电动闸阀', 300, 280, 110, 144, STOP),
]

const connections: Connection[] = [
  {
    id: 'c1',
    type: 'polyline',
    sourceId: 'e1',
    sourcePort: 'bottom',
    targetId: 'e3',
    targetPort: 'top',
    points: [128, 156, 128, 500],
    style: { stroke: '#4a8a7a', strokeWidth: 2 },
  },
  {
    id: 'c2',
    type: 'polyline',
    sourceId: 'e3',
    sourcePort: 'right',
    targetId: 'e4',
    targetPort: 'left',
    points: [216, 540, 360, 540],
    style: { stroke: '#4a8a7a', strokeWidth: 2 },
  },
  {
    id: 'c3',
    type: 'polyline',
    sourceId: 'e5',
    sourcePort: 'bottom',
    targetId: 'e8',
    targetPort: 'top',
    points: [564, 220, 564, 340, 824, 340],
    style: { stroke: '#8a7a4a', strokeWidth: 2 },
  },
]

const container = document.getElementById('scene') as HTMLElement
const picked = document.getElementById('picked') as HTMLElement

const pickedIds = new Set<string>()
let blankPicks = 0

const scene = use3DScene({
  onPick(id) {
    if (id) pickedIds.add(id)
    else blankPicks++
  },
})

scene.init(container)

// CanvasConfig 的其它字段与取景无关，这里给最小值即可
const canvasConfig = { width: 1200, height: 800, gridSize: 20 } as never
const bounds = computeSceneBounds(elements, canvasConfig)
scene.setSceneBounds(bounds, 20)
scene.updateConnections(connections)
scene.updateItems(elements, 'e1')

// 让管线在设备高度就绪后再算一次（与 Preview3DStage 里「元素更新后重算管线」同序）
scene.updateConnections(connections)

/**
 * 拾取自检：在整个画布上按网格扫一遍 pointerdown/up，统计能命中哪些元素。
 * 这一项必须实测——不可见拾取盒若打不中，点设备会静默失效（无报错、无反馈），
 * 属于静态检查完全看不出的一类问题。
 */
function probePicking(): string {
  const canvas = container.querySelector('canvas') as HTMLCanvasElement
  const rect = canvas.getBoundingClientRect()
  for (let gy = 16; gy < rect.height - 16; gy += 20) {
    for (let gx = 16; gx < rect.width - 16; gx += 20) {
      const clientX = rect.left + gx
      const clientY = rect.top + gy
      canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX, clientY, bubbles: true }))
      canvas.dispatchEvent(new PointerEvent('pointerup', { clientX, clientY, bubbles: true }))
    }
  }
  return `拾取自检：命中 ${pickedIds.size} / ${elements.length} 个元素 [${[...pickedIds].join(', ')}]，空白处 ${blankPicks} 次`
}

setTimeout(() => {
  picked.textContent = probePicking()
  ;(window as unknown as { __DONE__: boolean }).__DONE__ = true
}, 1200)
