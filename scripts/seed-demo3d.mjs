/**
 * 3D 演示工程种子脚本（浏览器实测用）：通过存储 API 写入 demo3d 工程的草稿与发布版。
 * 用法：node scripts/seed-demo3d.mjs [端口，默认 5174]
 */
const PORT = process.argv[2] || '5174'
const BASE = `http://127.0.0.1:${PORT}/api/storage`

// 存储接口除 health/login 外都要求会话，先登录换 token（种子账号见 server/auth.mjs）
const loginRes = await fetch(`http://127.0.0.1:${PORT}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})
if (!loginRes.ok) {
  console.error('login failed:', loginRes.status)
  process.exit(1)
}
const { token } = await loginRes.json()
const authHeaders = { 'content-type': 'text/plain; charset=utf-8', authorization: `Bearer ${token}` }

const layers = [
  { id: 'background', name: '背景层', type: 'background', visible: true, locked: true, order: 0 },
  { id: 'pipeline', name: '管道层', type: 'pipeline', visible: true, locked: false, order: 1 },
  { id: 'device', name: '设备层', type: 'device', visible: true, locked: false, order: 2 },
  { id: 'annotation', name: '标注层', type: 'annotation', visible: true, locked: false, order: 3 },
]

const canvasConfig = {
  width: 1920, height: 1080, backgroundColor: '', showGrid: true,
  gridSize: 20, gridColor: '', snapToGrid: true, enableZoom: true,
  minZoom: 0.1, maxZoom: 5, enablePan: true,
}

function rules(list) { return list }
const teal = '#00d4aa', red = '#ff4757', orange = '#ffa502'

function el(partial) {
  return {
    id: '', type: '', deviceId: '', x: 0, y: 0, width: 100, height: 100,
    rotation: 0, name: '', layerId: 'device', showName: true, showValue: false,
    properties: {}, statusRules: [], dataBindings: [],
    ...partial,
  }
}

const elements = [
  el({
    id: 'el_tank', type: 'tank', deviceId: 'tank_1', x: 260, y: 160, width: 130, height: 170,
    name: '清水罐',
    dataBindings: [{ property: 'level', variable: 'level' }],
    statusRules: rules([
      { id: 'hot', name: '高温', color: orange, severity: 'warning', priority: 1, condition: { type: 'compare', variable: 'temp', operator: '>', value: 45 } },
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'level', min: 0, max: 100 } },
    ]),
  }),
  el({
    id: 'el_pipe_h', type: 'pipe', deviceId: 'pump_1', x: 430, y: 320, width: 250, height: 24,
    name: '输水干管',
    dataBindings: [{ property: 'flow', variable: 'flow' }],
    statusRules: rules([
      { id: 'high', name: '大流量', color: red, severity: 'warning', priority: 1, condition: { type: 'compare', variable: 'flow', operator: '>=', value: 85 } },
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'flow', min: 0, max: 85 } },
    ]),
  }),
  el({
    id: 'el_pump', type: 'pump', deviceId: 'pump_1', x: 720, y: 270, width: 160, height: 90,
    name: '供水泵',
    dataBindings: [{ property: 'flow', variable: 'flow' }],
    statusRules: rules([
      { id: 'overload', name: '超压', color: red, severity: 'critical', priority: 1, condition: { type: 'compare', variable: 'pressure', operator: '>=', value: 8 } },
      { id: 'ok', name: '运行', color: teal, priority: 2, condition: { type: 'range', variable: 'flow', min: 0, max: 100 } },
    ]),
  }),
  el({
    id: 'el_pipe_v', type: 'pipe', deviceId: 'pump_1', x: 960, y: 150, width: 24, height: 210,
    name: '出水立管',
    dataBindings: [{ property: 'flow', variable: 'flow' }],
    statusRules: rules([
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'flow', min: 0, max: 100 } },
    ]),
  }),
  el({
    id: 'el_motor', type: 'motor', deviceId: 'motor_1', x: 720, y: 470, width: 140, height: 80,
    name: '驱动电机',
    dataBindings: [{ property: 'speed', variable: 'speed' }],
    statusRules: rules([
      { id: 'hot', name: '过热', color: red, severity: 'critical', priority: 1, condition: { type: 'compare', variable: 'temp', operator: '>', value: 70 } },
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'speed', min: 0, max: 3000 } },
    ]),
  }),
  el({
    id: 'el_fan', type: 'fan', deviceId: 'fan_1', x: 1140, y: 180, width: 100, height: 100,
    name: '冷却风机',
    dataBindings: [{ property: 'vibration', variable: 'vibration' }],
    statusRules: rules([
      { id: 'vib', name: '振动偏大', color: orange, severity: 'warning', priority: 1, condition: { type: 'compare', variable: 'vibration', operator: '>', value: 6 } },
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'speed', min: 0, max: 1600 } },
    ]),
  }),
  el({
    id: 'el_valve', type: 'valve', deviceId: 'valve_1', x: 1150, y: 470, width: 90, height: 60,
    name: '调节阀',
    dataBindings: [{ property: 'openDegree', variable: 'openDegree' }],
    statusRules: rules([
      { id: 'closed', name: '近关', color: red, severity: 'warning', priority: 1, condition: { type: 'compare', variable: 'openDegree', operator: '<', value: 15 } },
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'openDegree', min: 0, max: 100 } },
    ]),
  }),
  el({
    id: 'el_sensor', type: 'sensor', deviceId: 'sensor_1', x: 1470, y: 220, width: 60, height: 90,
    name: '温度传感器', showValue: true,
    dataBindings: [{ property: 'value', variable: 'value' }],
    statusRules: rules([
      { id: 'high', name: '高报', color: red, severity: 'critical', priority: 1, condition: { type: 'compare', variable: 'value', operator: '>', value: 100 } },
      { id: 'ok', name: '正常', color: teal, priority: 2, condition: { type: 'range', variable: 'value', min: 0, max: 100 } },
    ]),
  }),
  el({
    id: 'el_display', type: 'display', deviceId: 'tank_1', x: 1420, y: 500, width: 200, height: 90,
    name: '液位显示', showValue: true,
    properties: { unit: 'm', factor: 0.01, decimals: 2 },
    dataBindings: [{ property: 'value', variable: 'level' }],
    statusRules: [],
  }),
]

const conn = (id, s, t) => ({
  id, type: 'straight', sourceId: s[0], sourcePort: s[1], targetId: t[0], targetPort: t[1],
  points: [s[2], s[3], t[2], t[3]],
  style: { stroke: '#3f6f8f', strokeWidth: 3, animated: true, flowSpeed: 1, flowDirection: 'forward' },
})

const connections = [
  conn('c1', ['el_tank', 'right', 390, 245], ['el_pipe_h', 'left', 430, 332]),
  conn('c2', ['el_pipe_h', 'right', 680, 332], ['el_pump', 'left', 720, 315]),
  conn('c3', ['el_pump', 'right', 880, 315], ['el_pipe_v', 'left', 960, 255]),
  conn('c4', ['el_pump', 'bottom', 800, 360], ['el_motor', 'top', 800, 470]),
  conn('c5', ['el_fan', 'bottom', 1190, 280], ['el_valve', 'top', 1195, 470]),
]

const page = {
  id: 'page_3d_demo', name: '3D 演示', canvasConfig, elements, connections, layers,
}

const project = {
  version: '1.1',
  name: 'demo3d',
  description: '3D 视图切换验证用演示工程',
  timestamp: Date.now(),
  pages: [page],
  activePageId: page.id,
  canvas: JSON.stringify({ version: '1.0', canvasConfig, elements, connections }),
  connections,
  layers: JSON.stringify({ layers }),
  dataSource: { type: 'mock', name: 'default' },
  alarmDefs: [],
}

const body = JSON.stringify(project)
for (const key of ['scada_project_demo3d', 'scada_published_demo3d']) {
  const res = await fetch(`${BASE}/set?key=${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: authHeaders,
    body,
  })
  console.log(key, '->', res.ok ? 'OK' : `HTTP ${res.status}`)
}
