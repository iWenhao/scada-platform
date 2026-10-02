/**
 * 预览 3D 场景的组合式函数：渲染器、相机、灯光、地面网格、轨道控制与拾取。
 *
 * three 只在切到 3D 视图时经异步组件边界加载（Preview3DStage 由
 * defineAsyncComponent 引入），2D 用户不承担 three 的包体积。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { computeDefaultCamera } from './coordinates'
import type { SceneBounds } from './coordinates'
import { ConnectionMeshManager, ElementMeshManager } from './sceneSync'
import type { Scene3DElement } from './sceneSync'
import type { Connection } from '@/types/connection'

export function use3DScene(options: {
  /** 点选元素回调：null 表示点在空白处（取消选中） */
  onPick: (elementId: string | null) => void
}) {
  const { onPick } = options

  let container: HTMLElement | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let labelRenderer: CSS2DRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let controls: OrbitControls | null = null
  let frame = 0
  let bounds: SceneBounds | null = null
  let resizeObserver: ResizeObserver | null = null
  let disposed = false

  const meshes = new ElementMeshManager()
  const connections = new ConnectionMeshManager()
  // 地面（平面 + 网格）随场景范围变化整体重建
  const groundGroup = new THREE.Group()

  function init(target: HTMLElement): void {
    if (renderer || disposed) return
    container = target

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    target.appendChild(renderer.domElement)

    // 标签渲染层盖在画布上，但不拦截鼠标（交互全部走画布）
    labelRenderer = new CSS2DRenderer()
    const labelDom = labelRenderer.domElement
    labelDom.style.position = 'absolute'
    labelDom.style.inset = '0'
    labelDom.style.pointerEvents = 'none'
    target.appendChild(labelDom)

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#0b1220')
    scene.add(meshes.object3D, connections.object3D, groundGroup)

    camera = new THREE.PerspectiveCamera(50, 1, 1, 40000)

    // 半球光给环境基调，方向光负责立体感与投影
    scene.add(new THREE.HemisphereLight('#cfe8ff', '#0a0f1a', 1.0))
    const sun = new THREE.DirectionalLight('#ffffff', 1.6)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    scene.add(sun, sun.target)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    // 不允许钻到地面以下
    controls.maxPolarAngle = Math.PI / 2 - 0.03

    bindPickEvents(renderer.domElement)

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(target)
    resize()

    const loop = () => {
      if (disposed) return
      frame = requestAnimationFrame(loop)
      controls?.update()
      if (labelRenderer && scene && camera) labelRenderer.render(scene, camera)
      if (renderer && scene && camera) renderer.render(scene, camera)
    }
    loop()
  }

  /** 场景范围变化（切页面）时重建地面并重新取景 */
  function setSceneBounds(next: SceneBounds, gridSize = 20): void {
    if (!scene || !controls) return
    bounds = next
    rebuildGround(gridSize)
    const span = Math.max(next.width, next.depth)
    controls.maxDistance = span * 4
    // 方向光跟随场景中心，阴影相机罩住整个画面
    const sun = scene.children.find(c => c instanceof THREE.DirectionalLight) as THREE.DirectionalLight
    if (sun) {
      sun.position.set(next.centerX + span * 0.4, span * 1.2, next.centerZ + span * 0.5)
      sun.target.position.set(next.centerX, 0, next.centerZ)
      const cam = sun.shadow.camera
      cam.left = -span * 0.75
      cam.right = span * 0.75
      cam.top = span * 0.75
      cam.bottom = -span * 0.75
      cam.near = 1
      cam.far = span * 4
      cam.updateProjectionMatrix()
    }
    resetCamera()
  }

  function rebuildGround(gridSize: number): void {
    if (!bounds) return
    clearGroup(groundGroup)
    const pad = Math.max(Math.max(bounds.width, bounds.depth) * 0.25, 200)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(bounds.width + pad * 2, bounds.depth + pad * 2),
      new THREE.MeshStandardMaterial({ color: '#101a2c', roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(bounds.centerX, -0.5, bounds.centerZ)
    ground.receiveShadow = true
    const divisions = Math.max(8, Math.round(Math.max(bounds.width, bounds.depth) / Math.max(gridSize, 1)))
    const grid = new THREE.GridHelper(
      Math.max(bounds.width, bounds.depth) + pad * 2,
      divisions,
      '#1f3244',
      '#16242f',
    )
    grid.position.set(bounds.centerX, 0, bounds.centerZ)
    groundGroup.add(ground, grid)
  }

  function clearGroup(group: THREE.Group): void {
    for (const child of [...group.children]) {
      child.removeFromParent()
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose()
      const material = mesh.material as THREE.Material | undefined
      material?.dispose()
    }
  }

  function updateItems(items: Scene3DElement[], selectedId: string | null): void {
    meshes.update(items, selectedId)
  }

  function updateConnections(list: Connection[]): void {
    connections.update(list)
  }

  /** 回到默认斜上方机位（首次进入 / 重置视角共用） */
  function resetCamera(): void {
    if (!camera || !controls || !bounds) return
    const view = computeDefaultCamera(bounds)
    camera.position.set(view.position.x, view.position.y, view.position.z)
    controls.target.set(view.target.x, view.target.y, view.target.z)
    controls.update()
  }

  /** 俯视机位：与 2D 画布同方位对照 */
  function topView(): void {
    if (!camera || !controls || !bounds) return
    const span = Math.max(bounds.width, bounds.depth)
    camera.position.set(bounds.centerX, span * 1.15 + 150, bounds.centerZ + span * 0.02)
    controls.target.set(bounds.centerX, 0, bounds.centerZ)
    controls.update()
  }

  /** 点击拾取：按下与抬起位移小于阈值才算点击，避免与轨道旋转冲突 */
  function bindPickEvents(dom: HTMLElement): void {
    let downX = 0
    let downY = 0
    dom.addEventListener('pointerdown', (e) => {
      downX = e.clientX
      downY = e.clientY
    })
    dom.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return
      if (!renderer || !camera) return
      const rect = dom.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(meshes.pickTargets, false)
      onPick((hits[0]?.object.userData.id as string) ?? null)
    })
  }

  function resize(): void {
    if (!container || !renderer || !labelRenderer || !camera) return
    const width = container.clientWidth
    const height = container.clientHeight
    if (width <= 0 || height <= 0) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    labelRenderer.setSize(width, height)
  }

  /** 释放全部 GPU/DOM 资源；组件卸载时调用，可安全重复调用 */
  function dispose(): void {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    controls?.dispose()
    meshes.dispose()
    connections.dispose()
    clearGroup(groundGroup)
    renderer?.dispose()
    renderer?.domElement.remove()
    labelRenderer?.domElement.remove()
    renderer = null
    labelRenderer = null
    scene = null
    camera = null
    controls = null
  }

  return {
    init,
    setSceneBounds,
    updateItems,
    updateConnections,
    resetCamera,
    topView,
    dispose,
  }
}
