# AGENTS.md — AI 编码代理工作指南

> 本文件供 AI 编码代理（以及新加入的开发者）在本仓库工作时遵循。
> 面向使用者的操作手册在 [docs/USER_GUIDE.md](docs/USER_GUIDE.md)，架构图与二次开发指南在 [README.md](README.md)。

## 项目概述

SCADA Platform：基于 **Vue 3 + TypeScript + Konva.js (vue-konva) + Pinia + Element Plus + Vite** 的开源工业组态可视化编辑平台。纯前端项目，无后端；数据来自可插拔的数据源适配器（Mock / WebSocket / HTTP 轮询 / OPC UA 网关）。

三页面结构：`/` 首页（项目管理）→ `/editor` 组态编辑器 → `/preview` 只读运行预览。

## 常用命令

```bash
pnpm install            # 安装依赖（pnpm-workspace.yaml 已内置构建脚本白名单）
pnpm dev                # 开发服务器，http://localhost:5173
pnpm server             # 存储后端(http://localhost:5174)，数据存 server/data/*.json
pnpm build              # 生产构建 = vue-tsc --noEmit + vite build，提交前必跑
npx vitest run          # 测试单次运行（pnpm test 是 watch 模式，会挂住终端）
pnpm lint               # ESLint
```

验证基准：任何功能提交前，`vue-tsc --noEmit` 零错误 + `vitest run` 全过 + `pnpm build` 成功；UI 改动需浏览器实测交互。

## 存储后端

`server/index.mjs` 是零依赖的键值存储服务（数据为 `DATA_DIR` 下的 `*.json`，默认 `server/data/`），前端 `RemoteStorageAdapter` 通过 `/api/storage/*` 访问，Vite 代理 `/api`。启动时 `initStorage()` 自动探测：后端在线用远程存储，不在线回落 localStorage。API 根路径由 `VITE_API_BASE` 配置（默认 `/api`），Token 由 `VITE_API_TOKEN` 配置；后端支持 `PORT` / `DATA_DIR` / `MAX_BODY_BYTES` / `CORS_ORIGIN` / `AUTH_TOKEN`（见 `.env.example`），便于前后端分开部署。改 `vite.config.ts` 代理或 server 路由后需重启 dev server。

## 环境与已知坑

- **Node ≥ 18**；pnpm 10/11 会拦截依赖构建脚本，白名单已在 `pnpm-workspace.yaml`（esbuild、@parcel/watcher、vue-demi），不要删掉它。
- `pnpm install` 报 "Already up to date" 但运行时报 `Cannot find module .../vite/...`：node_modules 链接损坏，**删除 node_modules 重新 install**。
- 大规模重构/删除文件后 Vite HMR 可能残留陈旧模块，症状：白屏（`#app` 为空）、样式或代码改了不生效、Konva 事件监听指向旧舞台实例。按以下顺序排查（先轻后重），**不要急着改代码**：
  1. **重启 dev server**，浏览器硬刷新（Ctrl+Shift+R）再判断；必要时关掉全部旧标签页、开全新 tab——多次 HMR 后同一 tab 会有 Konva 多 stage 实例污染，导致实测误判（功能实际正常但旧 tab 里不生效）；
  2. 仍异常：`rm -rf node_modules/.vite` 清掉 Vite 依赖预构建缓存，再重启 dev server；
  3. 仍报 `Cannot find module .../vite/...`：node_modules 链接损坏，转上方重装流程。
- **dev server 只认 5173，不要让它漂移**：5173 被旧实例占用时 Vite 会自动跳到 5174，而 5174 既是存储后端（`pnpm server`）端口又是 `/api` 代理目标——Vite 落在 5174 会让代理指向自身形成回环，表现为登录/存储请求异常。发现 5173 被占：先停掉旧实例（`netstat -ano | findstr :5173` 找 PID）再启动；自己临时起过 dev server 验证完要停掉。
- **`vite.config.ts` 的 `server.host: '127.0.0.1'` 绑定勿删**：Clash Verge（mihomo）TUN 模式会拦截本机 IPv6 回环 `::1` 的 TCP 连接，删掉该绑定后 Node 17+ 的 Vite 只监听 `[::1]`，复发「服务已启动但浏览器打不开」——症状像 node_modules 损坏，先用 `node -e` 分别测 `127.0.0.1` 与 `::1` 回环连通性再排查。
- **编辑器「恢复草稿」弹窗的行为**：挂载时若存在未正式保存的自动草稿会弹框询问——选「恢复」不会删除草稿文件，「丢弃」才删；恢复后直接刷新页面会丢失内存中未保存的改动（草稿只在正式保存或丢弃时清理），实测与排查时别把「恢复」当成已持久化。
- git 推送报 `SSL_ERROR_SYSCALL`：github.com 被网络重置，走本地代理推送：
  `git -c http.proxy=http://127.0.0.1:7897 push origin dev`（端口以实际代理为准）。
- **推送失败不重试**：如果 push 失败（网络被墙等），提交保留在本地即可，不要连续多次重试；
  等待一段时间后再试一次，仍失败就留到下次推送，避免浪费时间和触发网络风控。

## 工作流约定

- **分支**：日常开发提交到 `dev` 分支并推送 `origin dev`；master 用于发布合并。
- **提交粒度**：一个功能/修复一个提交，信息用中文，格式 `功能:/修复:/重构:/清理:/测试:/文档: 一句话说明`。
- **变更日志**：功能与修复类提交需同步更新 `CHANGELOG.md` 的 `[Unreleased]` 区。
- **版本号**：从 `0.0.1` 起步，末位每次 +1，满 10 进位（0.0.9 → 0.0.10 → 0.1.0）；发版时版本号后附当天日期 YYMMDD（如 `0.0.2-260928`，CHANGELOG 标题与 tag 使用），`package.json` 保留三段数字并同步修改。
- **发版时机**：版本号只在用户明确说"发版"时才更新（改 `package.json` + 把 CHANGELOG 的 `[Unreleased]` 定稿为新版本号）。平时提交一律不动版本号，新内容只写入 `[Unreleased]`。
- **不提交**：`node_modules/`、`dist/`、诊断用的临时代码（如 index.html 里的错误钩子）。
- **UI 交互约定**：新功能必须有可见 UI 入口——只有快捷键没有按钮等同没做；次级操作图标默认隐藏、悬停显示或收进「⋯ 更多」类菜单，按钮放显眼位置（如面板标题右侧）；不做视觉冗余的堆砌，普通用户的标准是"看得到、找得到、用得顺"。
- `components.d.ts` / `auto-imports.d.ts` 是 unplugin 自动生成的，跟随相关改动一起提交即可。

## 架构与扩展点

### 新增工业组件（最重要的高频扩展）

照 `src/industrial/coal/index.ts` 中现有组件（如 `ShearerDefinition`）的格式写 `ComponentDefinition`：

1. `type` 全局唯一且用英文小写（如 `shearer`），Mock 设备按 `<type>_1` 命名即可被 `deviceStore.suggestDeviceId()` 自动绑定。
2. 提供 SVG `icon`（viewBox 0 0 100 100，线条风格，`currentColor` 会被画布替换颜色）、`defaultWidth/Height`、`statusRules`（优先级数字越小越高）、`dataBindings`（首个绑定变量会显示在元素上）、`properties`。
3. 在 `src/components/layout/ComponentPanel.vue` 注册并补充分组名。
4. 在 `MockDataAdapter` 的 update 数据与 `listDevices()` 中补充对应模拟设备。
5. 同步更新 README 组件表与 docs/USER_GUIDE.md 的设备清单。

### 数据源适配器

实现 `src/datasource/types.ts` 的 `DataSourceAdapter` 接口，在 `DataSourceManager.getAdapter()` 注册 case。消息解析统一走 `parseDataUpdate()`（设备映射 / 单设备对象 / 读数数组三种格式），不要另写解析。适配器应实现 `listDevices()`。注意：浏览器无法直连 OPC UA 二进制协议，OPC UA 走 WebSocket 网关（协议见 `OpcUaGatewayAdapter.ts` 文件头）。

### 画布（src/core/canvas/）

`ScadaCanvas.vue` 只保留模板、鼠标事件分发（平移→框选→连线的优先级）与装配；逻辑在组合式函数中，**新画布逻辑写进对应 composable 而不是往主文件里堆**：

- `useCanvasViewport` 舞台尺寸/平移/缩放，`useGridLines` 网格，`useElementVisuals` 状态着色/图标/端口
- `useElementSelection` 框选，`useConnectionDraw` 连线，`useElementDrag` 拖拽/吸附/变换
- 可纯函数化的算法放独立文件并配测试（参考 `alignment.ts` + `alignment.test.ts`）

预览页 `src/views/preview/index.vue` 与编辑器的元素渲染逻辑保持一致（着色/数值/图层可见性），改编辑器渲染时同步检查预览页。

### 状态与持久化

- 选择状态是 `canvasStore.selectedIds` 数组（多选），`selectedId` 是兼容用的 computed。
- 元素通过 `deviceId` 绑定数据源设备，状态引擎按 `element.deviceId || element.id` 取数。
- 项目持久化走 `src/storage/` 的 `getStorage()` 抽象（localStorage + 内存降级），**不要直接调用 localStorage**。
- 编辑操作（拖入/拖动/连线/属性修改）后调用 `useHistory()` 单例的 `saveState()`；`useHistory` 是模块级共享栈，不要在多个组件里各自 new 状态。

## 代码风格

- 组合式函数（composable）承载画布/编辑逻辑；Pinia store 只放跨组件状态。
- TypeScript 严格模式开启 `noUnusedLocals/noUnusedParameters`：未使用的变量/参数会挂构建，事件参数不用时改名 `_e`。
- Vue SFC 中 Element Plus 组件与图标（`@element-plus/icons-vue` 全局注册于 main.ts）无需手动导入。
- 注释用中文，说明"为什么"而非"做了什么"。
- **Element Plus 暗色主题是两层结构，不要合并**：官方 `dark/css-vars.css` + `html.dark` 类做变量兜底，`dark-theme.scss` 是品牌调色层（海军蓝/青色）且限定在 `html.dark` 作用域——两层分工不同，清理样式时勿把品牌层当重复删掉。
- **凡是涉及服务端代码（`server/**`）的改动都必须加上注释**：新增/修改的函数、配置项、路由、数据文件格式要有中文说明（模块职责、接口约定、安全/兼容注意点），风格对齐现有 `server/auth.mjs`、`server/notify.mjs`、`server/index.mjs`。
- **防重复：先找现成的，三次必收敛**：
  - 写新逻辑前先搜索项目内是否已有实现（工具 `src/utils/`、展示映射 `src/status/`、画布共享逻辑 `src/core/canvas/` 的 composable 与纯函数），有就复用，不要复制一份改改；
  - 同一段逻辑**第三次出现必须抽公共模块**，宁可当场花十分钟收敛，不要留下第四份（错误的抽象比重复更贵，但重复放任不管就是债）；
  - 公共实现保持**单一来源**，扩展时优先复用、不要另写平行实现：实体 ID 生成走 `src/utils/id.ts`（`createElementId` / `createConnectionId` / `createLayerId` / `createPageId` / `createTagId`），连接状态→文案/Tag 类型/样式走 `src/status/connection.ts`，元素复制/粘贴/删除走 `useEditClipboard`，WebSocket 系适配器继承 `BaseWebSocketAdapter`，项目存储键统一 `projectStorage.ts`，server 端 JSONL 读写走 `server/lib/jsonl.mjs`、HTTP 型通知发送与 headers 归一化走 `notify/common.mjs`；
  - 发版前可跑一遍重复扫描体检（如 `npx jscpd src server --min-tokens 60`），重复率明显上升或出现成段克隆时当次收敛。
- **文件过长/过大时自动拆分**（不要等积重难返）：
  - 参考阈值：Vue SFC **> 400 行**、TS/JS 逻辑文件 **> 400 行**、`server/**/*.mjs` **> 400 行**、单文件 SCSS **> 500 行**；
  - 拆法：对话框/面板按区块拆子组件；样式外置 `*.scss`；逻辑抽 `use*.ts` composable；服务端按域拆 `lib/` 或 `notify/` 类模块；
  - 拆完必须 `vue-tsc --noEmit` + `vitest run` 通过，行为保持不变；
  - 数据/图标定义类长文件（如 `industrial/**` 组件目录）可例外，不必硬拆。
- **收尾硬性检查（必做，不可跳过）**：每次功能改完、准备提交前，必须统计 `src/**` 与 `server/**` 下 `*.ts` / `*.vue` / `*.mjs` 行数；发现超过上述阈值的文件，**当次拆完再提交**，禁止「先提交超长文件以后再拆」。可用：

  ```bash
  Get-ChildItem src,server -Recurse -Include *.ts,*.vue,*.mjs |
    ForEach-Object { [PSCustomObject]@{ Lines=(Get-Content $_.FullName | Measure-Object -Line).Lines; Path=$_.FullName } } |
    Where-Object { $_.Lines -gt 400 } | Sort-Object Lines -Descending
  ```

## 测试

- 单测放被测文件同目录（`*.test.ts`），覆盖分布直接看各目录下的同名测试文件，不在此枚举（清单会过期）。
- Pinia 测试用 `setActivePinia(createPinia())`；时间相关用 `vi.useFakeTimers()`；WebSocket/scroll 等浏览器 API 用 `vi.stubGlobal` 打桩。
- 新增核心逻辑时补同目录测试；UI 组件暂不强求。
- **UI 改动的浏览器实测套路**：组件拖放是 HTML5 原生拖拽、Konva 画布内对象常规点击命中不了——测右键菜单对 `.konvajs-content` 合成 `contextmenu` 事件（坐标 = 容器 rect + 元素中心），测拖入需合成 `dragover`/`drop` DragEvent，被遮挡的按钮可在页面内程序化 `el.click()`；元素坐标可查 `examples/demo-project.json`。灌 3D 演示工程用 `scripts/seed-demo3d.mjs`（admin/admin123 登录换 token）。
