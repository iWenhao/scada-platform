// shared/consoleBanner.mjs 的类型声明（供 TS 侧引用该 .mjs 时获得类型）。
// 运行时实现是纯 ESM .mjs——Node 端不能 import .ts，而前端侧经 Vite 打包无碍，
// 故用同目录声明文件把类型补齐，两端共用一份实现，避免布局逻辑写两遍。

/**
 * 颜色槽位：渲染方各自映射（浏览器 → CSS color，终端 → ANSI 24 位色）。
 * 'plain' 表示不着色（沿用宿主默认色），用于行首缩进等空白片段。
 */
export type BannerTone = 'plain' | 'logoEdge' | 'logoFill' | 'title' | 'dim'

/** 一段文本及其颜色槽位 */
export interface BannerSpan {
  text: string
  tone: BannerTone
}

/** 横幅的一行 */
export interface BannerRow {
  spans: BannerSpan[]
}

/** 完整横幅模型 */
export interface BannerModel {
  rows: BannerRow[]
}

/** 横幅展示的系统信息，由调用方注入（前端给品牌默认值与前端技术栈，后端给端口与数据目录） */
export interface BannerInfo {
  /** 系统名称（大标题） */
  title: string
  /** 副标题：用于标明进程角色（前端 / 存储后端） */
  subtitle: string
  /** 版本号 */
  version: string
  /** 右侧信息栏行（标签已自行 padEnd 对齐） */
  details: string[]
  /** 提示符用户名，省略时用 visitor（后端传 node 以示区分） */
  prompt?: string
}

/** LOGO 像素画：每行等宽，字符集为 a/b/空格 */
export const LOGO_ART: readonly string[]

/** 前端信息栏（技术栈）：浏览器控制台与 dev 终端横幅共用 */
export const FRONTEND_DETAILS: string[]

/** 显示宽度（按终端列数算）：CJK/全角/常见 emoji 记 2 列 */
export function displayWidth(text: string): number

/** 构建横幅模型：LOGO + 名称 + 信息 + 提示符 */
export function buildBannerModel(info: BannerInfo): BannerModel

/** 纯文本渲染（不着色） */
export function renderPlain(model: BannerModel): string

/** 终端渲染：SGR 24 位真彩色 */
export function renderAnsi(model: BannerModel): string

/** Node 侧：宿主是否支持 24 位真彩色（浏览器侧不调用） */
export function supportsColor(): boolean