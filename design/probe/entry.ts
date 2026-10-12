// 校验用入口：把真实模块与真实组件定义打包成浏览器可直接运行的 bundle，
// 避免「手写复刻几何」带来的偏差。
export * from '../../src/core/canvas/iconBounds'
export * from '../../src/core/canvas/elementLayout'

export { ShearerDefinition, RoadheaderDefinition, ConveyorDefinition } from '../../src/industrial/coal'
export { TurbineDefinition, BoilerDefinition } from '../../src/industrial/power'
export { ValveDefinition, PumpDefinition, TankDefinition, DisplayDefinition } from '../../src/industrial/basic'
export { MotorDefinition } from '../../src/industrial/electrical'
export { SedimentTankDefinition } from '../../src/industrial/water'
