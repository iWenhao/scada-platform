# AGENTS.md — AI 编码代理工作指南

> 本文件供 AI 编码代理（以及新加入的开发者）在本仓库工作时遵循。这里的每一条都对**任何机器、任何 agent、任何协作者**成立；只在本机成立的诊断细节已外移到 [docs/ENV_NOTES.md](docs/ENV_NOTES.md)。
> 文档地图：[README.md](README.md)（架构图与二次开发指南）、[docs/USER_GUIDE.md](docs/USER_GUIDE.md)（使用者操作手册）、[docs/DEPLOY.md](docs/DEPLOY.md)（部署）、[docs/2.5D_ILLUSTRATION_GUIDE.md](docs/2.5D_ILLUSTRATION_GUIDE.md)（图元绘制规范，触发即必读）、[docs/PARALLEL_WORK.md](docs/PARALLEL_WORK.md)（多会话并行改动隔离，多人协作才读）、[docs/ENV_NOTES.md](docs/ENV_NOTES.md)（本机环境诊断细节，出现症状才读）、[UI_DESIGN_GUIDE.md](UI_DESIGN_GUIDE.md)（UI 设计稿，历史参考）。

## 字节预算（新增规则前先核）

AGENTS.md 是跨工具标准文件（Codex / Cursor / Jules / Amp 都自动加载），但带硬容量：Codex 侧 `project_doc_max_bytes` 默认 **32 KiB**，从仓库根到当前目录的所有 AGENTS.md **合并计算**，超出部分**从尾部静默截断**——不报错，还会把截断点的汉字劈成半个乱码字符。三条约束：

1. **本文件保持 ≤ 30 KiB**（硬线 32,768 字节，留 2 KiB 给以后新增的规则）。核对取法：`node -e "console.log(require('fs').statSync('AGENTS.md').size)"`（大写名，Linux 区分大小写）
2. **章节顺序＝存活顺序**：下面的排列按「丢了会让代理做错多少工作」，不按阅读舒适度；往末尾追加的内容最先被切。
3. **别用嵌套 AGENTS.md 分层**（预算合并计算，只会更早撞顶）；长篇复盘、只在本机成立的值、触发才需要的细节一律进 `docs/*.md` 并在正文留一行指针（写法见 2.5D 一节）。

## 项目概述

SCADA Platform：基于 **Vue 3 + TypeScript + Konva.js (vue-konva) + Pinia + Element Plus + Vite** 的开源工业组态可视化编辑平台。
- 前端是纯前端项目（构建产物可直接托管）；后端是可选的零依赖存储服务 `server/index.mjs`，不在线时回落 localStorage。
- 数据来自可插拔的数据源适配器（Mock / WebSocket / HTTP 轮询 / OPC UA 网关 / MQTT）。

三页面结构：`/` 首页（项目管理）→ `/editor` 组态编辑器 → `/preview` 只读运行预览。

## 任务清单与进度可见性（任何 agent 必读）

本仓库的既定要求：**多步任务必须有一份对用户可见的进度清单**——开工前列出、过程中更新、收尾给出最终状态。只在内部维护而不展示，等于没做。

- **先自查环境有没有原生清单能力**，有就直接用它。**判断依据是"我这轮有没有 list / todo 类工具"，不是工具的具体名字**（名字会变，别照抄别人的清单）；「UI 面板」与「仓库里的清单文件」两条都要看——有的实现只落文件、面板上反而看不到。
- **没有原生能力时，降级方案是硬要求而非可选项**：在对话正文里给文字版清单，**开工的第一条消息与收尾的最后一条消息各附一份**；状态标记固定用 `✅ 已完成` / `🔄 进行中` / `⬜ 未开始`；清单要一眼看出"哪些做了、哪些没做"，**不要只汇报做完的部分**。
- **清单不等于事实**：它不会自动跟着现实更新，收尾时必须对着 `git status` 与测试结果重新核一遍。已实际发生过「清单显示全部未开始、而代码早已提交」的情况。
- **进度与遗留必须如实呈现**：发现此前说过的事项仍未落地（如某项 P0 未修），主动标注，不要用措辞掩盖。
- **写成仓库约定而不是会话偏好**：换 agent 或换人接手时，这条必须跟着仓库走，不能依赖某次对话的口头说明。

## 常用命令

```bash
pnpm install            # 安装依赖（白名单见 pnpm-workspace.yaml）
pnpm dev                # 开发服务器，http://localhost:5173
pnpm server             # 存储后端(http://localhost:5174)，数据存 server/data/*.json
pnpm build              # 生产构建 = vue-tsc --noEmit + vite build，属推送门槛（见「验证节奏」）
npx vitest run          # 测试单次运行（pnpm test 是 watch 模式，会挂住终端）
pnpm lint               # ESLint
```

提交前的门槛与按改动范围的取舍，统一由「验证节奏」定义。要单独记住的一条：**用户可见的输出（UI / 控制台 / 日志格式）必须真跑一次看结果**，优先级高于全部静态检查。

## 存储后端

`server/index.mjs` 是零依赖的键值存储服务，前端 `RemoteStorageAdapter` 通过 `/api/storage/*` 访问，Vite 代理 `/api`。

- 数据落 `DATA_DIR` 下的 `*.json`，默认 `server/data/`
- 启动时 `initStorage()` 自动探测：后端在线用远程存储，不在线回落 localStorage
- 前端 API 根路径由 `VITE_API_BASE` 配置（默认 `/api`），Token 由 `VITE_API_TOKEN` 配置
- 后端支持 `PORT` / `DATA_DIR` / `MAX_BODY_BYTES` / `CORS_ORIGIN` / `AUTH_TOKEN`（见 `.env.example`），便于前后端分开部署
- 改 `vite.config.ts` 代理或 server 路由后**需重启 dev server**

### 接口响应约定（新增任何端点都走这一条，不要手拼 body）

- 形状只有两种：成功 `2xx` = `{data, meta?}`（etag/分页统计进 `meta`，空 `meta` 整个键省略），失败 = `{error:{code,message}}`。成败唯一判据是 HTTP 状态码，响应体里没有 `ok`
- 服务端出口唯一：`server/lib/http.mjs` 的 `sendData/sendFail`；失败只抛 `lib/apiError.mjs` 的 `ApiError(status, code, message, meta)`，由 `index.mjs` 顶层 catch 翻译，路由不再各自判返回值里有没有 error
- 前端入口唯一：`src/api/client.ts` 的 `apiFetch/apiData`（拼 base、带 Bearer、拆信封、非 2xx 抛 `ApiRequestError`）。两个例外：`storage/index.ts` 的 health 探测只看状态码、`HttpPollingAdapter` 连的是第三方数据源
- **只比 `code`，永不比 `message`**：改一句中文提示不该动到冲突/并发语义（旧代码判 `body.error === 'stale'` 就是反例）。码表与逐端点归属见 `docs/DEPLOY.md` §5.3

## 验证节奏（按改动范围分级，不必每次全跑）

**先记住这条硬约束：改完代码后的默认动作是「跑受影响的测试」，不是「跑全量」。**

理由不是单纯的慢——跑全量**结果本身经常不可信**：`vitest run` 可能因环境权限问题静默少跑若干测试文件（本机实测因沙箱 EPERM，`Test Files` 在 62~65 之间跳），而**少跑的文件不报失败**。付了一分钟，换回一个残缺的绿灯。

### 全量结果怎么算「跑过了」（任何机器都要做这一步）

- **汇总行出现 `Errors` 即视为本次运行不可信**，重跑，必要时 `--no-file-parallelism`（约 3 分钟，实测能稳定跑全 65 个文件）。
- 用 `npx vitest run --reporter=verbose` 拿逐文件列表，与磁盘上的数量比对一致才算覆盖全。取法：`git ls-files | grep -c '\.test\.ts$'`（2026-10-19 实测 = 65，漂移时重跑这条而不是抄旧数字）。
- 写进 CHANGELOG 的「实测用例数」必须来自完整运行，别抄被掐断那次的数字。本机根因与多轮补跑手法见 [docs/ENV_NOTES.md](docs/ENV_NOTES.md)。

日常按嫌疑范围三选一就够了（三者都接受路径子串模糊匹配，多个参数是「或」关系）：

| 想验证的范围 | 命令 |
| --- | --- |
| 单个文件 / 模块 | `npx vitest run 路径或路径片段`（如 `npx vitest run core/canvas`） |
| 一批改动（未提交的也算） | `npx vitest run --changed`（只跑受 git 改动影响的文件） |
| 几条特定用例 | `npx vitest run -t "关键词"` |

门槛分两级：**每次提交跑轻量集，每次推送由 `scripts/hooks/pre-push` 强制跑全量集**。全量的权威时机在推送而不在提交——没有 CI 的仓库，「每次提交跑全量」等于把集成检查提前到每一小步改动，逻辑单元越小越浪费；提交之间的 HEAD 允许个别坏提交，但不出机器。过程中的检查按改动范围挑着跑——各检查的实际价值并不均等，全跑一遍往往既慢又稀释信号：

| 改动情形 | 该跑什么 | 为什么 |
| --- | --- | --- |
| **迭代中（还没改完）——最常见** | **只跑刚动的那个测试文件**（或 `--changed`） | 全量慢，且中途失败多为半成品状态，噪声大于信息 |
| 改了 `server/**` 或 `shared/**` | 加跑 `pnpm typecheck:server`（`tsc -p tsconfig.server.json`） | 前端那套 `vue-tsc` 的 include 只覆盖 `src/`，服务端 `.mjs` 不在其中；这条是服务端唯一的类型检查入口，不跑等于服务端改动零类型把关 |
| 跨模块重构 / 改了类型签名与导出 | 加跑 `vue-tsc --noEmit` | 跨文件重构的错误类型检查最灵（`Record` 缺键、接口字段漏传这类单测看不出来） |
| 每次提交（轻量集，分钟级以内） | 改动路径相关的测试 + `vue-tsc --noEmit` + `node scripts/check-long-files.mjs` | 小改动最易踩的是跨文件类型错，`vue-tsc` 最灵且便宜；全量与 build 留到推送 |
| 每次推送（`pre-push` 强制，全量的唯一权威时机） | 全量 `vitest run`（钩子内失败自动重试一次，应对沙箱 EPERM 抖动）+ `vue-tsc --noEmit` + `vite build --emptyOutDir=false` + `node scripts/check-long-files.mjs` | 项目底线。本仓库没有 CI，这就是唯一的 CI；全量结果按上一节的判据算数 |
| 引入新文件或改动文件较多 | 加跑**改动文件**的 `eslint` | 全量 eslint 会被仓库既有 `.vue` 报警（`vue/html-indent`、`no-mutating-props` 等）淹没，信号被稀释 |
| 影响用户可见的输出（UI / 控制台 / 日志格式） | **必须真跑一次并看结果**，优先级排在上面全部静态检查之前 | 见「测试」一节 |

**本仓库没有 CI**（`.github/` 不存在）。全量门槛由 `scripts/hooks/pre-push` 机器强制（标题格式仍由 `commit-msg` 管）——该钩子被删、或 `core.hooksPath` 失效，全量门槛就只剩这段正文约束，它被截断或删薄即等于取消。

## 测试

**有一类 bug 静态检查抓不到：「渲染出来不对」**。真实案例：启动横幅把 `.` 当背景显示成一片圆点、中文按 1 列算导致信息栏错列——单测与类型检查全绿，用户看到的是一屏乱码。凡是用户要看的输出，**先看真东西，再看绿灯**。配套两条实操：起临时进程、截图这类重动作**只在最后一轮做一次**，启动前查端口占用（见「dev server 只认 5173」），验证完务必关掉；临时验证要和用户正在跑的实例错开（备用端口 + 临时数据目录，别动对方进程与数据），完事把误建的目录与数据文件一并清掉。

### 给测试文件选环境（新增测试时照做）

单测默认跑在 jsdom，但**只有真碰 DOM 的用例才需要它**。jsdom 环境的开销远大于纯逻辑用例本体，白跑很贵。

- **纯逻辑测试**（工具函数、纯数学/几何、协议解析、store 的纯状态流转、数据结构）：文件第一行写 `// @vitest-environment node`。`server/**` 下的测试已全部如此。
- **确实用了** `mount` / `document` / `window` / `localStorage` / canvas / `ResizeObserver` 的：保持默认 jsdom，别改。
- ⚠️ 判据看的是**用例自身**，被测源码可能间接摸浏览器 API——改完一定要真跑一遍确认，炸了就退回默认。

### 约定

- 单测放被测文件同目录（`*.test.ts`），覆盖分布直接看各目录下的同名测试文件，不在此枚举（清单会过期）。
- Pinia 测试用 `setActivePinia(createPinia())`；时间相关用 `vi.useFakeTimers()`；WebSocket/scroll 等浏览器 API 用 `vi.stubGlobal` 打桩。
- 新增核心逻辑时补同目录测试；UI 组件暂不强求。
- **UI 改动的浏览器实测套路**：组件拖放是 HTML5 原生拖拽、Konva 画布内对象常规点击命中不了，得合成事件来测。
  - 右键菜单：对 `.konvajs-content` 合成 `contextmenu` 事件（坐标 = 容器 rect + 元素中心）
  - 拖入：合成 `dragover`/`drop` DragEvent
  - 被遮挡的按钮：可在页面内程序化 `el.click()`
  - 元素坐标可查 `examples/demo-project.json`；种子账号见 `server/auth.mjs`（登录 `/api/auth/login` 换 token 后即可访问 `/api/storage/*`）

## 环境与已知坑

> 本节只收**任何环境都成立**的仓库属性。终端乱码、代理端口、`::1` 被 TUN 拦、误建保留名文件这类**只在本机成立、却要花很久才诊断出来**的细节在 [docs/ENV_NOTES.md](docs/ENV_NOTES.md)——出现对应症状就去读它。

- **Node ≥ 18**；pnpm 10/11 会拦截依赖构建脚本，白名单已在 `pnpm-workspace.yaml`（esbuild、@parcel/watcher、vue-demi），不要删掉它。
- `pnpm install` 报 "Already up to date" 但运行时报 `Cannot find module .../vite/...`：症状是 node_modules 链接损坏，**删除 node_modules 重新 install**。
- **dev server 只认 5173，不要让它漂移**：
  - 5173 被旧实例占用时 Vite 会自动跳到 5174，而 5174 既是存储后端（`pnpm server`）端口又是 `/api` 代理目标——Vite 落在 5174 会让代理指向自身形成回环，表现为登录/存储请求异常；
  - 发现 5173 被占：先停掉旧实例（`netstat -ano | findstr :5173` 找 PID，Linux/macOS 用 `lsof -i:5173`）再启动；
  - 自己临时起过 dev server 验证完要停掉。
- 大规模重构/删除文件后 Vite HMR 可能残留陈旧模块。症状：白屏（`#app` 为空）、样式或代码改了不生效、Konva 事件监听指向旧舞台实例。按以下顺序排查（先轻后重），**不要急着改代码**：
  1. **重启 dev server**，浏览器硬刷新（Ctrl+Shift+R）再判断；必要时关掉全部旧标签页、开全新 tab；
  2. 仍异常：`rm -rf node_modules/.vite` 清掉 Vite 依赖预构建缓存，再重启 dev server；
  3. 仍报 `Cannot find module .../vite/...`：node_modules 链接损坏，转上方重装流程。
  - 为什么强调「开全新 tab」：多次 HMR 后同一 tab 会有 Konva 多 stage 实例污染，导致实测误判（功能实际正常，但旧 tab 里就是不生效）。
- **编辑器「恢复草稿」弹窗的行为**：挂载时若存在未正式保存的自动草稿会弹框询问。选「恢复」**不会**删除草稿文件，选「丢弃」才删；恢复后直接刷新页面会丢失内存中未保存的改动（草稿只在正式保存或丢弃时清理）。实测与排查时别把「恢复」当成已持久化。
- **在 POSIX shell（Git Bash）里丢弃输出要用 `> /dev/null`，不要写 `> nul`**：`nul` 是 cmd 的空设备名，bash 不认，`命令 > nul` 会在**当前目录建出一个名为 `nul` 的真实文件**。正确写法：Git Bash 用 `> /dev/null`（stderr 一起丢用 `> /dev/null 2>&1`）；cmd 用 `> NUL`；PowerShell 用 `> $null`。要留报告就用工具自带参数（如 `npx vitest run --reporter=json --outputFile=report.json`），别靠重定向。这类文件在某些机器上一旦建出来就删不掉，**预防是唯一可靠策略**（判据与复盘见 ENV_NOTES）。
- **控制台中文乱码只影响终端显示，不会污染代码或提交内容**（写文件一律走 edit/write 工具，不用 shell），别因为看到乱码就去"修"文件。但**中文内容校验不要相信控制台渲染**：校验中文一律用 `node -e` 读原始字节并打印码点。修法与反例见 ENV_NOTES。

## 代码风格

- 组合式函数（composable）承载画布/编辑逻辑；Pinia store 只放跨组件状态。
- TypeScript 严格模式开启 `noUnusedLocals/noUnusedParameters`：未使用的变量/参数会挂构建，事件参数不用时改名 `_e`。
- Vue SFC 中 Element Plus 组件与图标（`@element-plus/icons-vue` 全局注册于 main.ts）无需手动导入。
- 注释用中文，说明"为什么"而非"做了什么"。
- **Element Plus 暗色主题是两层结构，不要合并**：两层分工不同，清理样式时勿把品牌层当重复删掉。官方 `dark/css-vars.css` + `html.dark` 类是变量兜底；`dark-theme.scss` 是品牌调色层（海军蓝/青色），限定在 `html.dark` 作用域。
- **凡是涉及服务端代码（`server/**`）的改动都必须加上注释**：新增/修改的函数、配置项、路由、数据文件格式要有中文说明（模块职责、接口约定、安全/兼容注意点），风格对齐现有 `server/auth.mjs`、`server/notify.mjs`、`server/index.mjs`。
- **防重复：先找现成的，三次必收敛**：
  - 写新逻辑前先搜索项目内是否已有实现（工具 `src/utils/`、展示映射 `src/status/`、画布共享逻辑 `src/core/canvas/` 的 composable 与纯函数），有就复用，不要复制一份改改；
  - 同一段逻辑**第三次出现必须抽公共模块**，宁可当场花十分钟收敛，不要留下第四份（错误的抽象比重复更贵，但重复放任不管就是债）；
  - 公共实现保持**单一来源**，扩展时优先复用、不要另写平行实现：实体 ID 生成走 `src/utils/id.ts`（`createElementId` 等一族）；连接状态→文案/Tag 类型/样式走 `src/status/connection.ts`；元素复制/粘贴/删除走 `useEditClipboard`；WebSocket 系适配器继承 `BaseWebSocketAdapter`；项目存储键统一 `projectStorage.ts`；server 端 JSONL 读写走 `server/lib/jsonl.mjs`、HTTP 型通知发送与 headers 归一化走 `notify/common.mjs`。
  - 发版前可跑 `npx jscpd src server --min-tokens 60` 体检，重复率上升或出现成段克隆时当次收敛。
- **文件过长/过大时自动拆分**（不要等积重难返）：
  - 参考阈值：Vue SFC **> 400 行**、TS/JS 逻辑文件 **> 400 行**、`server/**/*.mjs` **> 400 行**、单文件 SCSS **> 500 行**；
  - 拆法：对话框/面板按区块拆子组件；样式外置 `*.scss`；逻辑抽 `use*.ts` composable；服务端按域拆 `lib/` 或 `notify/` 类模块；
  - 拆完必须 `vue-tsc --noEmit` + `vitest run` 通过，行为保持不变；
  - 数据/图标定义类长文件（`src/industrial/**` 组件目录）可例外，不必硬拆；**该例外已内置进检查脚本**（默认跳过 `src/industrial/*`），不需人工判断，脚本会在末尾报出跳过的文件数。
- **收尾硬性检查（必做，不可跳过）**：每次功能改完、准备提交前，必须统计 `src/**` 与 `server/**` 下源码文件的行数；发现超过上述阈值的文件，**当次拆完再提交**，禁止「先提交超长文件以后再拆」。这一条针对**本次改动新增或触及的文件**——脚本报出的既有超限文件属历史欠账，不阻塞与它无关的提交，但**必须在当次汇报里如实列出**，不许默默略过。直接跑：

  ```bash
  node scripts/check-long-files.mjs
  ```

  （`.vue`/`.ts`/`.mjs` 阈值 400 行，`.scss` 500 行；无超限文件时脚本输出 `OK`。计行按 `readFileSync().split('\n')` 且不计末尾换行，与 CRLF/LF 行尾无关——**别换成 `wc -l`**，它数换行符个数、末行无换行时少算 1，空行/LF 文件会失真 3~25 行，原因见脚本头注释。）

## 架构与扩展点

### 新增工业组件（最重要的高频扩展）

照 `src/industrial/coal/index.ts` 中现有组件（如 `RoadheaderDefinition`）的格式写 `ComponentDefinition`：

1. `type` 全局唯一且用英文小写（如 `roadheader`），Mock 设备按 `<type>_1` 命名即可被 `deviceStore.suggestDeviceId()` 自动绑定。
2. 提供 SVG `icon`（viewBox 0 0 100 100，`currentColor` 会被画布替换颜色）、`defaultWidth/Height`、`statusRules`（优先级数字越小越高）、`dataBindings`（首个绑定变量会显示在元素上）、`properties`。图标按**插画级（面基）**写，见下一节。
3. 把定义加进该目录导出的组件数组，由 `src/industrial/panelRegistry.ts` 汇总调用 `registerComponents([...])` 完成注册（`ComponentPanel.vue` 只剩 UI，注册数据层已拆到 panelRegistry，它以副作用方式 import）；新增分组要同时补 `BASIC_GROUPS` / `INDUSTRY_GROUPS` 与 `groupNames`（分组标题与搜索匹配共用这一份）。
4. 在 `MockDataAdapter` 的 update 数据与 `listDevices()` 中补充对应模拟设备。
5. 同步更新 README 组件表与 docs/USER_GUIDE.md 的设备清单。

### 2.5D / 立体观感图元（触发即必读）

凡任务涉及「2.5D」「伪 3D」「立体观感的设备图」「等轴测场景」「把图元画得更立体」，**先读 [docs/2.5D_ILLUSTRATION_GUIDE.md](docs/2.5D_ILLUSTRATION_GUIDE.md) 再动手**（该文档自包含、含全部代码与全部硬约束，不依赖仓库外的文件）。这里只留最容易被违反的三条：

- **先判档，别先选技术**：投影 / 遮挡 / 剖切不在运行时变化 → 走 2D/2.5D，**不要引入 Three.js**；要转视角、真实遮挡、任意剖切、漫游巡检才上 3D（要等轴测观感用 `OrthographicCamera`）。
- **新写设备图元一律按插画级（面基）写**，不新写线条稿；存量分批迁移，`styleIcon()` 对不含 `data-*` 的线条稿原样返回，两档可共存。实现落在 `src/core/canvas/faceLighting.ts`，风格由工程级 `viewMode` 决定（`25d` 展开渐变 / `2d` 平涂），**不要在元素背后铺背景色块**——旧的 `depthLayers.ts` 已删除，那是与「纯图形」方向冲突的做法，别加回来。
- **不手调明暗、颜色只有一条通道**：作者只标面朝向（`data-face="top|front|side|cap"`、`data-shadow`、`data-pipe`；画布图元**不要用** `data-ground`），**不写** `fill` / `fill-opacity` / 渐变，光照由 `FACE_STYLE` token + `bakeLighting()` 统一展开；渐变必须 `stop-color="currentColor"` + `stop-opacity`，`<defs>` 写在片段内部，可动件从主图标挖掉另立片段（两处同步）。不做透视（SVG `transform` 只有 2D 仿射），2.5D 场景显式按 `depth = gridX + gridY` 升序。

### 数据源适配器

实现 `src/datasource/types.ts` 的 `DataSourceAdapter` 接口，在 `DataSourceManager.getAdapter()` 注册 case。

- 消息解析统一走 `parseDataUpdate()`（设备映射 / 单设备对象 / 读数数组三种格式），不要另写解析
- 适配器应实现 `listDevices()`
- 注意：浏览器无法直连 OPC UA 二进制协议，OPC UA 走 WebSocket 网关（协议见 `OpcUaGatewayAdapter.ts` 文件头）

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

## 工作流约定

- **分支**：日常开发提交到 `dev` 分支并推送 `origin dev`；master 用于发布合并。
- **并行改动（多个会话 / Agent 同时动本仓库）**：三层判据（原生 worktree → 手工 `git worktree add` → 同树按模块切分 + 只 add 自己文件）与 git 之外三处共享状态（`server/data/`、端口、登录会话）的错开方式详见 [docs/PARALLEL_WORK.md](docs/PARALLEL_WORK.md)；单人开发不读。
- **提交粒度**：一个功能/修复一个提交。
- **提交信息**：中文；首行标题 **≤ 30 字符**（含前缀），细节一律写进 `CHANGELOG.md`，提交本身不带长正文。
  - 前缀白名单：`功能:` `修复:` `优化:` `重构:` `清理:` `文档:` `测试:` `构建:` `发版:`；Git 自动生成的 `Merge` / `Revert` / `fixup!` / `squash!` 不受限。
  - 标题只回答「改了什么」——读者是 `git log --oneline` 而不是代码评审，理由、文件清单、实测数据、边界情况全部写进 CHANGELOG。长度按**字符**计（一个汉字算 1，不是显示列也不是字节）：`修复: 亮色主题下画布背景仍是黑色` = 17 字符（UTF-8 字节数是 47），合规。
  - 由 `scripts/hooks/commit-msg` 机械拦截（超长或未知前缀直接拒绝提交），**每个克隆启用一次**：`git config core.hooksPath scripts/hooks`；确需绕过用 `git commit --no-verify`。
- **变更日志**：功能与修复类提交需同步更新 `CHANGELOG.md` 的 `[Unreleased]` 区。详略分工：提交标题给「改了什么」，CHANGELOG 给「为什么这么改、动了哪些文件、实测了什么」，同一件事实不在两处各写一遍。
- **README 同步**：改到下列任一类「结构性事实」，同一个提交里同步 `README.md` 对应小节，不留到「以后统一改文档」：
  - `package.json` 的 scripts 与构建工具版本 → 「快速开始」「环境要求」；
  - 根级目录或 `src/` 一级模块增删、页面路由增减 → 「项目结构」「功能特性」「交互流程」；
  - 新增一整类用户可见能力（数据源适配器、存储与角色权限模型、点表/报警/历史等）→ 「功能特性」与两张架构图；
  - 组件注册链路或图元规范变化 → 「组件开发指南」，并与「新增工业组件」一节对齐（组件表本身的同步步骤见其第 5 步）。
  - 纯内部重构、bugfix、样式调整不在此列，只更 CHANGELOG。分工：README 写「现在是什么样」，CHANGELOG 写「为什么改、动了哪些文件、实测了什么」。
  - **数字与命令必须实测后再写，并顺手写下取法**：README 漂掉的从来不是数字（`getAllComponents()` = 177 种 / 14 分组、`listDevices()` = 22 台，隔了很久还对得上），而是命令、目录树与架构图。写 `177` 时同时注明「`getAllComponents()` 的长度」，下次核对只需重跑那一条，不必重新考古。
  - 提交前扫一眼 `git diff --stat`：出现 `package.json`、`src/views/**`、`src/datasource/adapters/**`、`server/routes/**` 这类路径，就问自己 README 有没有对应句子要改。语义对应判不了正则，所以不做机械拦截，判据清单比检查脚本可靠。
- **版本号**：从 `0.0.1` 起步，末位每次 +1，满 10 进位（0.0.9 → 0.0.10 → 0.1.0）；发版时版本号后附当天日期 YYMMDD（如 `0.0.2-260928`，CHANGELOG 标题与 tag 使用），`package.json` 保留三段数字并同步修改。**只在用户明确说"发版"时**才更新版本号（改 `package.json` + 把 `[Unreleased]` 定稿为新版本号）；平时提交一律不动版本号，新内容只写入 `[Unreleased]`。
- **不提交**：`node_modules/`、`dist/`、诊断用的临时代码（如 index.html 里的错误钩子）。下列几类已在 `.gitignore` 里，但最容易在 `git add -A` 时被顺手带进来，提交前扫一眼暂存区：存储后端运行时数据 `server/data/`、本目录的会话记忆 `.workbuddy/`、设计沙箱的构建产物 `design/probe/*bundle.js`。
- **UI 交互约定**：新功能必须有可见 UI 入口——只有快捷键没有按钮等同没做。次级操作图标默认隐藏、悬停显示或收进「⋯ 更多」类菜单，按钮放显眼位置（如面板标题右侧）；不做视觉冗余的堆砌，普通用户的标准是"看得到、找得到、用得顺"。
- `components.d.ts` / `auto-imports.d.ts` 是 unplugin 自动生成的，已加入 `.gitignore`（冷启动扫描结果不稳定，提交即反复漂移）；dev/build 启动时自动重生，无需手动维护。
