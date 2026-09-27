/**
 * 存储 API 连接配置：从构建环境读取，便于前后端分开部署。
 * - VITE_API_BASE   API 根路径，默认 '/api'（同源反代）；跨域时设为完整地址
 * - VITE_API_TOKEN  可选 Bearer Token，与后端 AUTH_TOKEN 对应
 */
export function resolveApiBase(): string {
  const base = import.meta.env.VITE_API_BASE || '/api'
  return String(base).trim().replace(/\/+$/, '')
}

export function resolveApiToken(): string | null {
  const token = import.meta.env.VITE_API_TOKEN
  const trimmed = token ? String(token).trim() : ''
  return trimmed || null
}
