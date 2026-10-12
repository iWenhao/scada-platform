/**
 * 3D 设备模型核对页（临时校验产物，不进构建）。
 *
 * 用**仓库里的真实模块**（assemblies / deviceModels）在真实 WebGL 里渲染每种设备，
 * 逐个截下来铺在页面上——这一轮改动的成败标准是「看起来像不像设备」，
 * 静态检查与单测都回答不了（AGENTS.md 亦要求：用户可见输出必须真跑一次看结果）。
 *
 * 同时对照两种摆放口径（plan / elevation），因为「2D 符号是俯视还是立面」这个约定
 * 直接决定 3D 里的轮廓与 2D 是否对得上。
 */
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildDeviceModel, type PlacementMode } from '@/core/scene3d/deviceModels'

const BG = '#0b1220'

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(420, 300)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
scene.background = new THREE.Color(BG)
// 与 use3DScene 一致：金属必须有环境可反射
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
pmrem.dispose()

scene.add(new THREE.HemisphereLight('#cfe8ff', '#0a0f1a', 1.15))
const sun = new THREE.DirectionalLight('#ffffff', 1.7)
sun.position.set(180, 320, 240)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
const shadowCam = sun.shadow.camera as THREE.OrthographicCamera
shadowCam.left = -220
shadowCam.right = 220
shadowCam.top = 220
shadowCam.bottom = -220
shadowCam.near = 1
shadowCam.far = 1500
shadowCam.updateProjectionMatrix()
scene.add(sun)

/** 每屏重建：设备与地面都挂在这两个组下，切换用例时整组清空 */
const modelGroup = new THREE.Group()
const groundGroup = new THREE.Group()
scene.add(modelGroup, groundGroup)

const camera = new THREE.PerspectiveCamera(50, 420 / 300, 1, 20000)

function clearGroup(group: THREE.Group): void {
  for (const child of [...group.children]) {
    child.removeFromParent()
    child.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry?.dispose()
        for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          mat?.dispose()
        }
      }
    })
  }
}

interface Case {
  type: string
  label: string
  width: number
  height: number
  mode: PlacementMode
  /** 状态色，缺省取「运行」的绿 */
  color?: string
}

const CASES: Case[] = [
  { type: 'shearer', label: '采煤机', width: 176, height: 96, mode: 'elevation' },
  { type: 'roadheader', label: '掘进机', width: 160, height: 96, mode: 'elevation' },
  { type: 'conveyor', label: '皮带输送机', width: 176, height: 80, mode: 'elevation' },
  { type: 'tank', label: '储罐', width: 128, height: 160, mode: 'elevation' },
  { type: 'coal_bunker', label: '原煤仓', width: 112, height: 168, mode: 'elevation' },
  { type: 'pump', label: '离心泵', width: 128, height: 128, mode: 'elevation' },
  { type: 'shearer', label: '采煤机 · 运行', width: 176, height: 96, mode: 'elevation', color: '#00d4aa' },
  { type: 'shearer', label: '采煤机 · 停机', width: 176, height: 96, mode: 'elevation', color: '#666666' },
  { type: 'shearer', label: '采煤机 · 截割过载', width: 176, height: 96, mode: 'elevation', color: '#ffa502' },
  { type: 'tank', label: '储罐 · 停机', width: 128, height: 160, mode: 'plan', color: '#666666' },
  { type: 'valve', label: '阀门（未建模 · 保底体块）', width: 110, height: 144, mode: 'elevation' },
  { type: 'motor', label: '电机（未建模 · 保底体块）', width: 128, height: 112, mode: 'elevation' },
]

function renderCase(item: Case): { url: string; info: string } {
  clearGroup(modelGroup)
  clearGroup(groundGroup)

  const built = buildDeviceModel(
    { type: item.type, width: item.width, height: item.height },
    item.mode,
  )
  const model = built.device.group
  model.scale.setScalar(built.scale)
  // 状态着色：与 sceneSync 一致——状态色既染漆面也做微弱自发光
  const color = item.color ?? '#00d4aa'
  for (const mat of built.device.materials) {
    mat.color.set(color)
    mat.emissive.set(color)
    mat.emissiveIntensity = 0.12
  }
  modelGroup.add(model)

  const worldW = built.device.size.width * built.scale
  const worldH = built.device.size.height * built.scale
  const worldD = built.device.size.depth * built.scale

  // 地面 + 网格（尺寸跟着设备走，便于读尺度）
  const span = Math.max(worldW, worldH, worldD)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 3, span * 3),
    new THREE.MeshStandardMaterial({ color: '#101a2c', roughness: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  groundGroup.add(ground)
  groundGroup.add(new THREE.GridHelper(span * 3, 12, '#1f3244', '#16242f'))

  // 相机：斜前方，按设备尺寸取景
  const target = new THREE.Vector3(0, worldH * 0.45, 0)
  const radius = Math.max(span, 60)
  camera.position.set(target.x + radius * 0.55, target.y + radius * 0.65, target.z + radius * 0.95)
  camera.lookAt(target)

  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')

  return {
    url,
    info: `元素 ${item.width}×${item.height} · 缩放 ${built.scale.toFixed(2)} · 世界 ${worldW.toFixed(0)}×${worldH.toFixed(0)}×${worldD.toFixed(0)} · 可动件 ${built.device.rotors.length}`,
  }
}

const grid = document.getElementById('grid') as HTMLElement
for (const item of CASES) {
  const card = document.createElement('div')
  card.className = 'card'
  const { url, info } = renderCase(item)
  card.innerHTML = `<img src="${url}" width="420" height="300" alt="${item.label}" /><div class="cap"><b>${item.label}</b><span>${info}</span></div>`
  grid.appendChild(card)
}

;(window as unknown as { __DONE__: boolean }).__DONE__ = true
