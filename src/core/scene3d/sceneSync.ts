/**
 * 3D 场景的增量同步：把 Vue 侧算好的元素视图模型落成 three 网格。
 *
 * 设备数据每秒都在变，但元素的形状/位置极少变——所以几何按"参数指纹"复用，
 * 每次只更新材质颜色、标签文案与选中态，避免重建几何导致 GC 抖动。
 */
import * as THREE from 'three'
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'
import { elementToWorld } from './coordinates'
import { getComponent3DShape, getGeometryParams } from './elementShapes'
import type { Connection } from '@/types/connection'

/** 3D 场景的元素视图模型（文案已由 Vue 侧按 2D 口径格式化好） */
export interface Scene3DElement {
  id: string
  type: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  /** 状态色（与 2D 画布同口径，见 elementStatus.ts） */
  color: string
  /** 名称标签文案（showName 开关控制），空串表示不显示 */
  label: string
  /** 实时数值文案（showValue 开关控制），空串表示不显示 */
  value: string
}

interface MeshEntry {
  mesh: THREE.Mesh
  material: THREE.MeshStandardMaterial
  label: CSS2DObject
  labelEl: HTMLDivElement
  nameEl: HTMLSpanElement
  valueEl: HTMLSpanElement
  /** 几何参数指纹：变化才重建几何 */
  geomKey: string
  color: string
  selected: boolean
}

/** 选中态的自发光强度（未选中时用基础值保证状态色在暗场景里依然鲜亮） */
const EMISSIVE_BASE = 0.35
const EMISSIVE_SELECTED = 0.9

function buildGeometry(
  params: ReturnType<typeof getGeometryParams>,
): THREE.BufferGeometry {
  switch (params.kind) {
    case 'cylinder':
      return new THREE.CylinderGeometry(params.radius, params.radius, params.height, 28)
    case 'cylinder-horizontal':
      return new THREE.CylinderGeometry(params.radius, params.radius, params.length, 28)
    case 'box':
    default:
      return new THREE.BoxGeometry(params.width, params.height, params.depth)
  }
}

/** 几何参数指纹（同参数即同几何，可复用） */
function geometryKey(params: ReturnType<typeof getGeometryParams>): string {
  switch (params.kind) {
    case 'cylinder':
      return `c:${Math.round(params.radius)}x${Math.round(params.height)}`
    case 'cylinder-horizontal':
      return `ch:${Math.round(params.radius)}x${Math.round(params.length)}`
    default:
      return `b:${Math.round(params.width)}x${Math.round(params.height)}x${Math.round(params.depth)}`
  }
}

export class ElementMeshManager {
  private group = new THREE.Group()
  private entries = new Map<string, MeshEntry>()

  get object3D(): THREE.Group {
    return this.group
  }

  /** 拾取目标（随元素增减维护，避免每帧遍历场景） */
  get pickTargets(): THREE.Mesh[] {
    return Array.from(this.entries.values()).map(e => e.mesh)
  }

  update(items: Scene3DElement[], selectedId: string | null): void {
    const seen = new Set<string>()
    for (const item of items) {
      seen.add(item.id)
      this.upsertMesh(item, selectedId === item.id)
    }
    // 移除已删除的元素
    for (const [id, entry] of this.entries) {
      if (!seen.has(id)) {
        this.removeEntry(id, entry)
      }
    }
  }

  private upsertMesh(item: Scene3DElement, selected: boolean): void {
    const placement = elementToWorld(item)
    const params = getGeometryParams(getComponent3DShape(item.type), item.width, item.height)
    const key = geometryKey(params)
    let entry = this.entries.get(item.id)

    if (!entry) {
      entry = this.createEntry(item.id)
      this.entries.set(item.id, entry)
    }

    // 几何：参数变化才重建
    if (entry.geomKey !== key) {
      entry.mesh.geometry.dispose()
      entry.mesh.geometry = buildGeometry(params)
      entry.geomKey = key
    }

    // 摆放：立式体块底面贴地；卧式圆柱先绕 Z 躺倒（轴线沿世界 X）、再绕竖直轴偏转
    // （three 默认欧拉序 XYZ 按列向量先应用 Z 后应用 Y，一次 set 即可表达"躺倒+朝向"）
    const mesh = entry.mesh
    mesh.position.set(placement.x, 0, placement.z)
    if (params.kind === 'cylinder-horizontal') {
      mesh.rotation.set(0, placement.rotationY, Math.PI / 2)
      mesh.position.y = params.radius
      mesh.userData.topY = params.radius * 2
    } else {
      mesh.rotation.set(0, placement.rotationY, 0)
      mesh.position.y = params.height / 2
      mesh.userData.topY = params.height
    }

    // 状态色与选中态：只改材质，不动几何
    if (entry.color !== item.color || entry.selected !== selected) {
      entry.color = item.color
      entry.selected = selected
      entry.material.color.set(item.color)
      entry.material.emissive.set(item.color)
      entry.material.emissiveIntensity = selected ? EMISSIVE_SELECTED : EMISSIVE_BASE
      mesh.scale.setScalar(selected ? 1.06 : 1)
    }

    // 标签锚在体块顶面上方
    entry.label.position.set(0, (mesh.userData.topY as number) + 14, 0)
    const text = entry.nameEl.textContent ?? ''
    if (text !== item.label) entry.nameEl.textContent = item.label
    if (entry.valueEl.textContent !== item.value) entry.valueEl.textContent = item.value
    const hasText = Boolean(item.label || item.value)
    entry.labelEl.style.display = hasText ? '' : 'none'
  }

  private createEntry(id: string): MeshEntry {
    const material = new THREE.MeshStandardMaterial({
      color: '#8fe6d3',
      emissive: '#8fe6d3',
      emissiveIntensity: EMISSIVE_BASE,
      roughness: 0.55,
      metalness: 0.15,
    })
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
    mesh.userData.id = id
    mesh.castShadow = true
    mesh.receiveShadow = true

    const labelEl = document.createElement('div')
    labelEl.className = 'e3d-label'
    const nameEl = document.createElement('span')
    nameEl.className = 'e3d-label-name'
    const valueEl = document.createElement('span')
    valueEl.className = 'e3d-label-value'
    labelEl.append(nameEl, valueEl)
    const label = new CSS2DObject(labelEl)
    mesh.add(label)

    this.group.add(mesh)
    return { mesh, material, label, labelEl, nameEl, valueEl, geomKey: '', color: '', selected: false }
  }

  private removeEntry(id: string, entry: MeshEntry): void {
    entry.mesh.removeFromParent()
    // CSS2DObject 离开场景后 DOM 不会自动摘除，需手动清理避免泄漏
    entry.labelEl.remove()
    entry.mesh.geometry.dispose()
    entry.material.dispose()
    this.entries.delete(id)
  }

  dispose(): void {
    for (const [id, entry] of this.entries) {
      this.removeEntry(id, entry)
    }
  }
}

/** 连线在地面上的抬升高度 */
const CONNECTION_Y = 6
const CONNECTION_RADIUS = 4

export class ConnectionMeshManager {
  private group = new THREE.Group()

  get object3D(): THREE.Group {
    return this.group
  }

  /**
   * 重建全部连线。连线数量少且只在页面切换时变化，
   * 与元素不同（元素要逐秒刷新颜色），这里整组重建更简单可靠。
   */
  update(connections: Connection[]): void {
    this.clear()
    for (const conn of connections) {
      const pts = conn.points
      if (!pts || pts.length < 4) continue
      const points: THREE.Vector3[] = []
      for (let i = 0; i < pts.length - 1; i += 2) {
        points.push(new THREE.Vector3(pts[i], CONNECTION_Y, pts[i + 1]))
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1)
      const geometry = new THREE.TubeGeometry(curve, points.length * 6, CONNECTION_RADIUS, 10, false)
      const material = new THREE.MeshStandardMaterial({
        color: conn.style?.stroke || '#666666',
        emissive: conn.style?.stroke || '#666666',
        emissiveIntensity: 0.25,
        roughness: 0.6,
        metalness: 0.1,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.userData.connectionId = conn.id
      this.group.add(mesh)
    }
  }

  clear(): void {
    for (const child of [...this.group.children]) {
      child.removeFromParent()
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.MeshStandardMaterial | undefined
      material?.dispose()
    }
  }

  dispose(): void {
    this.clear()
    this.group.removeFromParent()
  }
}
