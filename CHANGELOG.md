# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；提交信息规范见 [AGENTS.md](AGENTS.md)。
功能与修复类提交请同步更新本文件 `[Unreleased]` 区。

版本规则：从 `0.0.1` 起步，末位每次 +1，满 10 进位（0.0.9 → 0.0.10 → 0.1.0 …）；
发版时在版本号后附当天日期（YYMMDD，如 0.0.2-260928），`package.json` 保留三段数字。

## [Unreleased]

### 功能

- 保存撞名交给服务端一次原子创建（409），消除同名覆盖竞态
  - 背景：`projectPersistence.saveProject` 原先靠「先 get 判重、再 set 写入」拦新建/导入时用默认名「未命名项目」静默覆盖别人同名工程——这是 read-check-write，两个标签/两台设备同时新建同名会双双判到「未占用」，后写的把先写的盖掉（补记 `d7a8f03e`，该提交当时未落 CHANGELOG）
  - 改法：底层加「仅当不存在时创建」语义，判重交服务端一次原子写。`atomicWrite` 支持 `ifAbsent`（同路径串行槽内、rename 前 `fs.access`，命中抛 `EEXIST`），`kv` 导出 `writeValueIfAbsent`，`/api/storage/set?mode=create` 撞已存在回 409；新增 `StorageConflictError`（独立 `errors.ts`，避开 index↔remote 值循环依赖），`RemoteStorageAdapter`/`LocalStorage`/`Memory` 的 `set` 加可选 `ifAbsent`；`saveProject` 对本会话未认领的名字带 `ifAbsent` 写，撞名回滚工程名并返回 `false` 交上层弹改名框
  - 边界：仅单进程原子——多进程共享同一 `DATA_DIR` 时 `access` 与 `rename` 之间仍有窗口（注释里写明，真要跨进程需 `wx` 落正式名或引锁/DB）；覆盖自己已认领的工程仍走不带 `ifAbsent` 的正常写
  - 动了：`server/lib/{atomicWrite,kv}.mjs`、`server/routes/storage.mjs`、`src/storage/{errors,index,remote}.ts`、`src/stores/projectPersistence.ts`
  - 实测：`kv`/`index`/`remote`/`projectStore` 的 409 相关用例通过（含「两个并发 create 同名只赢一个」「两会话同名新建第二个被拒、不覆盖第一个」）；`node --check` 服务端模块通过
- 组件库卡片悬停显示用途说明
  - 背景：报表 / 表格 / 网格图同为表格长相，光看名字分不清——报表是固定行列、格子里只有值，表格是一行一个点位带搜索与阈值变色，网格图是一格一个点位。名字不动（「点表」在 UI 里已被 TagTableDialog 占用，改名会撞），改用一句话说明区分
  - 改法：`ComponentDefinition` 新增可选 `description`；`ComponentCard.vue` 用 `el-tooltip` 包一层（placement 用 left——面板贴窗口右侧，向右弹会顶出可视区；没写说明的组件 `:disabled` 关掉气泡，仍保留原生 title 显示名称）。气泡内容是「名称 + 说明」两行，随 teleport 走但 scoped 属性跟着元素，样式照常生效
  - 只给数据展示类 8 个组件写说明（进度条 / 报表 / 网格图 / 表格 / 折线图 / 柱状图 / 饼图 / 雷达图），设备图元（泵、风机…）名字自带语义，不写以免满屏气泡
  - 实测：hover 报表 →「固定行列数，表头与列宽可配；绑定变量按行优先填格，格子里只显示值」；hover 表格 →「一行一个绑定变量，固定三列（名称 / 数值 / 单位）…」；hover 泵1（无 description）→ 不弹气泡、保留原生 title；0 页面错误
- 表格支持分页（每页行数）
  - 场景：表格的行数 = 绑定变量数，绑几十个点位后表格长到画面外，只能靠滚动条看，大屏上没法操作
  - 改法：新增属性「每页行数（0=不分页）」（`pageSize`，0 表示保持原样靠滚动）。配了之后底部出现翻页条「‹ 页码 / 总页数（共 N 条）›」，编辑态与运行端都能点（运行端不受 readonly 影响，只有搜索框被禁用）
  - 页码是组件内状态：刷新后回到第一页；绑定变量增删或搜索后旧页码可能越界，统一夹回有效范围；搜索条件变化自动回到第一页。按钮带 `@mousedown.stop`，点翻页不会顺带把元素拖走
  - 实测：12 个绑定 + pageSize=5 → 5 行 +「1 / 3（共 12）」；点下一页首行 pump_1 → pump_6；末页 2 行且「下一页」置灰；搜索 pump_1 → 4 行且翻页条自动隐藏（只剩一页）；连续点击翻页后元素坐标不变；0 页面错误
- 报表支持按列设置列宽
  - 场景：报表是 `table-layout: fixed` + 列宽均分，某列内容长时放不下，此前除了把整个元素拉宽之外没有别的控宽手段
  - 改法：新增属性「列宽（逗号分隔）」（`widths`），按顺序对应各列——数字是像素（160）、带 % 是按表格宽度比例（25%）、留空则该列均分剩余宽度。fixed 布局下列宽只能通过 `<colgroup><col>` 控制（写在 td 上的 width 会被内容长短挤动），像素值要乘 zoom（DOM 容器已按 zoom 放大，CSS px 不跟着缩放）
  - 行为边界：各列都写明且总和小于元素宽度时按比例放大填满（想让表格整体变窄应调小元素宽度，不是调列宽）；总和超出时按 minWidth 出横向滚动条；非法值（非数字 / 负数）当空处理、参与均分
  - 顺带：报表单元格加 `overflow: hidden` + `text-overflow: ellipsis`，超长内容末尾省略而不是越界到邻格，完整内容挂到 title 上（预览端可悬停查看）
  - 实测：widths=260,,90 → 260/289/90；30%,,40% → 192/192/256；abc,,-5 → 均分 213（非法值回落）；900 → 表格宽 1012、容器 640、横向可滚动；70 窄列 + 长内容 → 单元格省略且 title 保留全文；0 页面错误
- 采煤机截割滚筒转起来（素材图元支持挖取可动件）
  - 背景：运转动效此前只覆盖手写图元（掘进机截割头、皮带带面）。素材导入的图元由 `scripts/import-subunit-assets.mjs` 生成、整张光栅化成一张位图，Konva 没法让位图里的滚筒单独转——而采煤机正是综采面上最需要「看得出来在转」的设备
  - 改法：`buildAssetComponents` 加第 4 个参数 `motion`（type → `AssetMotionSpec`），按**锚点**（滚筒分组 opening tag 里那段唯一 transform）从素材图标里整块 `<g>` 挖出来写成 `motion.rotors`，坐标直接照抄主图标用户坐标，渲染侧复用现成的 contain 变换摆回原位。素材侧零改动、`assets.generated.ts` 不手工编辑，重新生成也不会把这份工作冲掉
  - 两个必须补的坑：① 片段外面要包一层**继承组**——素材把 `fill="none" stroke="none"` 挂在根分组上，片段脱离祖先后可动件按 SVG 初值被涂成一坨黑盘（静态检查全绿，只有真画出来才看得见）；② 基图要补一只**不可见定位框**（按图标自带 viewBox 铺 `fill=none stroke=none` 的 rect）——渲染层按内容包围盒收紧图标，滚筒一挖走包围盒就缩到机身，机身放大 1.5 倍且滚筒溢出元素矩形
  - 边界：锚点对不上（素材重新生成后几何变了）就整台退回静止图元，宁可不挖也不在机身上挖个洞；`animate` 开关只在真挖出可动件时才暴露；左右滚筒方向相反（右侧片段自带 `scale(-1,1)` 镜像，声明 `direction: -1`）
  - 判速沿用现成口径，未新增字段：`state=1` 运行 → 110 deg/s（下限），`state=2` 报警 → 140 deg/s，`state=0` 停机不转
  - 动了：`src/industrial/assetComponents.ts`（挖取 + 继承包装 + 定位框）、`src/industrial/coal/index.ts`（两只滚筒的声明）、`src/types/scada.ts`（`MotionRotor` 坐标口径的注释纠正：不是固定 0..100，而是主图标自己的用户坐标）、新增 `src/industrial/assetComponents.test.ts`、`design/probe/motion*`（核对页改用当前 API 并加未挖取原图的半透明叠图对照）
  - 实测：`assetComponents` 14 + `elementMotion` 22 = 36 用例通过；浏览器探针页用真实模块画 0°/25°/50° 与停机色、2D/2.5D 两档，滚筒与机身同心、截齿跟转、叠上未挖取原图无重影；元素 300px 宽时整机相对改造前缩 0.4%（Δ 1.3px，机身与滚筒走同一套变换故互相对齐不受影响）；全量 66 文件 / 615 用例、`pnpm build`、超长文件检查全部通过
- 首页「最近项目」支持按项目名称搜索
  - 场景：项目多了以后只能靠肉眼在一堆卡片里找，编辑器里的「打开项目」入口早已删掉，首页没有任何检索手段
  - 改法：新建 `src/views/dashboard/ProjectSearchBox.vue`（只管展开/收起与输入，不碰项目数据），挂在「最近项目」标题行右侧——位置即作用域，且这一行在本次改造后是常驻不滚的固定头，滚到第几屏都够得着。过滤走 `index.vue` 的 `visibleProjects` computed，对已加载的 `recentProjects` 做大小写不敏感子串匹配，不再打一次存储请求；标题行的 `section-sub` 在筛选时改成「匹配 N / M 个项目」，让人知道列表变短是被筛的而不是丢了
  - 窄窗口（≤720px）退成圆形放大镜按钮，点击展开、失焦且无内容即收回；**有查询时强制展开**，不会出现「筛了却看不见筛选条件」。断点用 `matchMedia` 监听而不是纯 CSS，因为收起/展开是有状态的交互
  - 取舍：没复用编辑器组件库的 `LibrarySearchBox`——它的「失焦即清空」写死了 `.component-panel` 内部判定，而首页要求宽窗口下输入框常驻、点卡片不该把查询清掉，硬套需要给旧组件加参数并改动编辑器的搜索行为。仓库里这是第 2 个搜索盒，**第 3 次出现必须收敛成公共实现**
  - 边界：无命中时保留「新建项目」ghost 卡（它是动作不是结果），下方补一行「没有名称包含「x」的项目 + 清空搜索」；删除掉最后一个命中项后查询保持不动，由提示行解释为什么空了
  - 措辞统一到「项目」：新写的搜索文案（占位符 / aria-label / 无命中提示 / 计数）一律用「项目」，并把首页两处「新建工程」与空态标题「还没有组态工程」一并改成「新建项目 / 还没有组态项目」——同一块空态里按钮写「新建项目」而标题写「组态工程」是自相矛盾，且 `docs/USER_GUIDE.md` 早已写作「新建项目」。首页还剩这些「工程」未动（属既有文案，不在本次范围）：统计卡标签「工程项目」、hero 摘要「N 个工程已发布」、底部提示「发布后的工程」、发布弹窗标题「发布工程」、「示例工程已导入」；编辑器侧（`Toolbar.vue`「把当前工程快照为运行版」等）继续用「工程」
  - 顺带删掉首页的「打开项目」`el-dialog`：`showOpenDialog` 全仓库只有 `= false` 与初始值两处赋值，没有任何入口能打开它（卡片上的打开走 `@open`），属死代码；连带清理 `.open-project-*` 样式
  - 实测：`vue-tsc --noEmit` 零输出、`vitest run --changed` 10 文件 / 113 用例通过、改动文件 eslint 零告警、`pnpm build` 通过、超长文件检查 OK（`index.vue` 399 行、`dashboard.scss` 454 行）。**浏览器肉眼核对未完成**：自动模式拦下代填登录凭据，验证停在未登录跳转页

- 首页「预览」改为新开标签的独立运行端，该标签不再显示「编辑器」入口
  - 场景：首页点预览是在当前标签里跳走，看完想回项目列表还得再返回一次；而这一页内存里没有编辑现场，顶栏那枚「编辑器」点下去是个空工程，属误导
  - 改法：`dashboard/index.vue` 的 `previewProject()` 由 `router.push` 改 `window.open(router.resolve(...).href, '_blank')`，首页标签留在项目列表；预览页把 `uiStore.hasEditSession` 透传成新 prop `showBack`（`PreviewHeader.vue`，`withDefaults` 默认 true，编辑器工具栏入口行为不变）控制按钮显隐。加载失败占位页里的「返回编辑器」同一判据隐藏，「重试 / 返回首页」保留
  - 为什么复用 `hasEditSession` 而不是新加 `?from=home`：这个开关的语义本来就是「本标签页有需要保护的编辑现场」（编辑器 setup 置位、首页挂载复位），预览页早已用它决定要不要快照/还原工程；再加一个来源参数等于给同一件事第二份真相，且手输 URL、观察员被守卫踢进预览（`src/router/index.ts:58`）两种入口都带不上它。观察员进预览同样隐藏该按钮，正好对上他无编辑权限的事实
  - 文档：README「交互流程 → 预览」补两个入口的差别；`docs/USER_GUIDE.md`「预览模式」首段原写「点击"返回编辑器"回到编辑状态」已不成立，改成分入口描述
  - 实测：`vue-tsc --noEmit` 零输出、`vitest run --changed` 通过、改动文件 eslint 0 错误、超长文件检查 OK（`dashboard/index.vue` 压到 400 行，注释占一行以免顶破阈值）。另用临时挂载用例确认 `showBack=false` 时 HUD 里没有「编辑器」而其余按钮仍在，跑完即删。**浏览器肉眼核对未完成**：`window.open` 的新标签需要登录态，自动模式拦下代填凭据，验证停在未登录跳转页

### 优化

- 首页「最近项目」改为服务端分页索引 + 缩略图懒加载，消除每工程 3 次全量 GET
  - 背景：`loadRecentProjects` 原先对每个工程并发发 3 次 `getStorage().get()`（工作副本、发布快照、缩略图各一次），且**每次都拉回整份 JSON**——读一个时间戳和画面数却把全部配置传一遍。N 个工程 = 3N 个网络往返，远程存储下一多项目首页就整屏转圈；`Promise.all` 一次性全并发还会把浏览器同域连接池（HTTP/1.1 约 6 条）排队打满。缩略图是 canvas `toDataURL` 的 base64，单张可达几百 KB，是最贵的一块
  - 改法：新增服务端分页索引接口 `GET /api/storage/projects?limit=&offset=&keyword=`（`server/lib/projectIndex.mjs` + `server/routes/projects.mjs`），读遍全部工作副本放在服务端（磁盘读、本地、几乎零成本），网络上每页只回 `{ name, timestamp, pageCount, publishedAt, hasThumbnail }` 的紧凑摘要 + `{ total, publishedTotal, matchedTotal }` 全量统计，按修改时间倒序；`limit` 夹到 [1,100]（缺省 12），`keyword` 走与旧客户端过滤同口径的名称大小写不敏感子串匹配。前端 `StorageAdapter` 加**可选** `projectIndex(query)` 能力（仅 `RemoteStorageAdapter` 实现），`projectStorage.getProjectPage()` 优先走它、本地/内存模式与索引偶发失败时回落到 `keys()+get()` 逐条读后本地同口径筛选切片。首页把分页/搜索/统计/缩略图逻辑抽进 `useProjectPaging.ts`（也让 `index.vue` 从 478 行压回 400 行内），`ProjectCard` 用 `IntersectionObserver` 滚入视口才 emit `load-thumb` 按需取一张 base64
  - 分页后为什么统计仍准：`total` / `publishedTotal` 由服务端**全量**算、与关键词无关（"我一共有多少工程 / 几个已发布"），`matchedTotal` 是当前关键词下的命中总数（供"匹配 N / M"与 `hasMore` 判断）——前端只持有一页也能报出正确数字
  - 决策更新：首版（`0b1a7995`）当时选了"不做服务端截断、一次返回全部摘要 + 客户端搜索"，理由是"列表也承担全量管理，砍旧项目会从管理界面消失"。本次按需求改为服务端分页 + 触底自动续拉后，那条理由靠"搜索与统计搬到服务端"重新满足：关键词命中的项目即使不在已加载页里也会被服务端查出来，管理/统计不受分页影响
  - 没走 `<img src>` 直供图：缩略图接口在 Bearer 鉴权之后，`<img>` 带不上 Authorization 头，改成图片 URL 会牵动鉴权模型，得不偿失；懒加载已把"一屏只取可见几张"的收益拿到
  - 动了：新增 `server/lib/projectIndex.mjs`、`server/routes/projects.mjs`（本次加分页），`src/views/dashboard/useProjectPaging.ts`；`server/index.mjs` 接口清单、`src/storage/{index,remote}.ts`、`src/stores/{projectStorage,projectStore}.ts`、`src/views/dashboard/{index.vue,ProjectCard.vue,types.ts,dashboard.scss}`
  - 实测：`projectIndex`(11，含分页/越界/limit 夹取) + `remote`(8，含 query 拼接) + `projectStorage`(11，含本地切片/回落) + `index.test`(8) = 38 用例通过；`tsc -p tsconfig.server.json`、`vue-tsc --noEmit`、超长文件检查全绿；备用端口 5179 + 系统临时数据目录灌 15 个工程（2 发布、1 带图）真起后端，`?limit=12`→12 条 proj15..proj4、`offset=12`→3 条 proj3..proj1、`keyword=proj1`→命中 7 条且 `total=15/publishedTotal=2` 不变、`offset` 越界回空页 `matchedTotal=7`、`limit=1000` 夹到 ≤100 仍返回 15 条
- 首页缩略图改为随列表摘要一次带回，拆掉逐卡 GET 的 IntersectionObserver 懒加载
  - 背景：上一条（分页索引）当时按「缩略图 base64 单张几百 KB、是大头」的假设，让 `ProjectCard` 用 `IntersectionObserver` 滚进视口才 emit `load-thumb` 逐单发一次 `getStorage().get(thumbKey)`。实测 `server/data` 现存 12 张缩略图：单张仅 2.4~10.3 KB、合计 54 KB——空白画布 JPEG 压完才 2~4 KB，最满的示例工程也才 10.3 KB，"大头"假设不成立；真实代价反而是一屏 12 个 HTTP 往返（HTTP/1.1 同域 6 路并发还得排两批）去传总共 54 KB
  - 改法：服务端 `queryProjectIndex` slice 出当前页后逐个 `readValue` 读 `scada_thumb_<name>`，把 data URL 直接塞进摘要行 `thumbnail`（读不到为 null）；`buildProjectIndex` 全量统计与排序阶段仍不读缩略图文件（`thumbnail` 一律占位 null），只对一页 ~12 个项目补值。前端 `ProjectSummary`/`ProjectRow` 用 `thumbnail: string|null` 替换布尔 `hasThumbnail`；删 `useProjectPaging.loadThumbnail` 与 `thumbKey` 引入、`ProjectCard` 的 IntersectionObserver/`loadThumb` emit/`cardEl` ref、`index.vue` 的 `@load-thumb` 接线；本地/内存回落路径 `buildLocalIndex` 直接 `storage.get(thumbKey)` 透传（get 是同步内存读，无网络放大）
  - 为什么不再保留懒加载：54 KB/页 远小于一次工程 JSON，一次请求连图带回比攒批合并请求更简单，前端连视口监听都不用；`<img src>` 直供图方案仍不可行（缩略图接口在 Bearer 鉴权之后，`<img>` 带不上 Authorization 头）
  - 动了：`server/lib/projectIndex.mjs`、`src/storage/index.ts`、`src/stores/projectStorage.ts`、`src/views/dashboard/{useProjectPaging.ts,index.vue,ProjectCard.vue,types.ts}`、`server/lib/projectIndex.test.ts`、`src/stores/projectStorage.test.ts`
  - 实测：受影响两文件 24 用例通过（新增「当前页行直接带 data URL、无图为 null」「翻页后第二页各自补值」「buildProjectIndex 不读缩略图文件」）；`vue-tsc --noEmit`、`tsc -p tsconfig.server.json`、`check-long-files.ps1` 全绿
- 预览页「上一画面」改名并挂上说明气泡
  - 背景：这个按钮在没有任何画面跳转记录时是灰的，用户看不出它是干什么的、也看不出为什么点不动，连问两次「用来干啥」。名字本身也有歧义——「上一画面」像是"上一张画面标签"，实际是浏览器后退那种**回退到刚才看的那张**
  - 改法：标签改「返回上一画面」（与属性面板里 `navigateTo=__back__` 那个选项同一口径）；灰掉时气泡说明「还没有画面跳转记录」，可用时说明「回到刚才看的那张画面」。措辞按实际压栈口径写：切画面就压栈，点标签、组件跳转、自动轮播都算
  - 两个坑：① 气泡必须挂在包装 `span.hud-btn-host` 上而不是按钮本身——`disabled` 的 button 不派发鼠标事件，`el-tooltip` 挂上去永远弹不出来，配套让按钮 `pointer-events: none`、由外层接住 hover；② `effect` 要显式写 `light`，EP 默认的 `dark` 档在暗色主题下会被变量反转成白底（`is-dark` 背景取 `--el-text-color-primary`），浮在黑 HUD 上很突兀；`light` 档亮色主题走 EP 默认白底、暗色主题由 `dark-theme.scss` 的 `.el-popper.is-light` 统一刷成品牌深色，跟随 HUD 一起换肤
  - 动了：`src/views/preview/PreviewHeader.vue`、`preview-header.scss`（`.hud-btn-host`）、新增 `PreviewHeader.test.ts`
  - 实测：挂载测试 2 例通过——禁用态 hover 宿主 span 能弹层且文案含「还没有画面跳转记录」，可用态文案为「回到刚才看的那张画面」且浮层带 `is-light`；`vue-tsc --noEmit` 0 错、`pnpm build` 通过
- 掘进机图元按采煤机素材的画法重绘（线条稿，不走面基）
  - 背景：`roadheader` 的图标是早期占位（6 个图元：车架矩形 + 两个轮 + 机身矩形 + 一根悬臂线 + 一个截割头圆），和同一面板里素材导入的采煤机摆在一起明显糙。用户点名的对照基准就是采煤机，要求「按那个精致的画面优化」
  - 与规范的取舍（**这是有意偏离 AGENTS.md「新写设备图元一律按插画级（面基）写」**）：先按面基画了 2:1 二点五等轴测候选，`data-face` 展开后顶面 `stop-opacity 0.9` + 描边 `0.45`，缩到图元尺寸就是一坨青色色块——机器结构完全读不出，也读不出「和采煤机一家」。而采煤机素材本身是**单色描边、内部留空、立体感全靠线条密度**的侧视线稿（`stroke-width="2"`、`fill="none"`、滚筒按正圆 + 密集辐射截齿画）。基准是线稿，就不该把对照物画成色块，故本次按用户点名的基准走，并留此记录以免下次被当成「忘了地面基」
  - 改法（`src/industrial/coal/index.ts` 的 `RoadheaderDefinition.icon`）：整机侧视画法——后支撑、履带装置（外廓 + 驱动轮/张紧轮/三支重轮 + 履带板齿）、主车架、液压油箱（加油口 + 液位计 + 散热筋）、电气控制箱（门缝 + 指示灯 + 急停）、电机（散热筋 + 风扇罩）、司机护棚与操作台、回转台、前倾收窄的截割臂、升降油缸（缸体粗线 + 活塞杆 + 两端耳环）、前铲板、截割头滚筒（外圈 + 叶片环 + 轮毂）。层次全靠线宽分级（主轮廓 1.6、次要件 1.1-1.2、筋板 0.9-1.0 + `stroke-opacity` 0.55-0.7），不写 `fill`、不写 `data-face`，`styleIcon()` 原样透传，2D/2.5D 观感一致
  - 截齿转子同步重写：4 支 → 16 支（对齐采煤机滚筒的齿密度），齿根半径略大于滚筒外圈（8.8 vs 8.5，留 0.3 余量），转动时齿根不会压在线上；截割头圆心从 `(16,33)` 一路挪到 `(13,56)`——先抬高脱离铲板（旧齿圈贴在底边上，读起来像一只掉在地板上的齿轮），再随第二轮重排搬到滚筒真实圆心。`degPerUnit: 120`、驱动变量 `cutting`、状态色与 `animate` 开关一字未动
  - 第二轮（用户反馈「整体看起来很多线条都重叠在一起了」）：不靠肉眼猜，临时写个诊断脚本按注释分组算各部件包围盒与两两交集占比，把「看着挤」变成可排序的数字（脚本不入库）。据此收掉四类：
    - **共边不重描**：履带顶边与车架下沿、deck 上五个箱体的底边与车架顶线，本来就是同一条线，各画一遍就是双线。履带改成开口路径（只画底线与两端圆弧），箱体改成开口朝下，底边交给车架顶线收口；顶边那排履带板齿与臂内三条滑轨一并删掉
    - **删纯重叠**：内喷雾水管整段 77% 落在悬臂框内，删线
    - **让位**：回转台从「骑在车架前沿、被升降油缸穿过」改成收进臂根当铰接凸台，油缸走它下方；操作台与油箱（重叠 50%）、后支撑与驱动轮（30%）、铲板与张紧轮（17%）各自退开。铲板与履带的连接梁走 y=94 这条共线（铲板底边 → 履带前端点）而不是斜穿过去——斜线到 (32,74) 与张紧轮罩圆弧的最近距离只有 0.73 个单位，缩到 90px 就是一条糊线
    - **补回密度**：删干净后车架成了一块 62×16 的大空白板，反倒成了全图最抢眼的东西——补一条腰线与三条分舱竖线（对齐上方各箱体的接缝）。这不是把删掉的重复线加回来，新线全在部件内部
  - 顺带修掉一个真实的画法错误：履带右端圆弧的 `sweep-flag` 写成 1，整条弧翻到履带内部（左端是 0 才朝外鼓）——同向绕行的圆角必须同 sweep。这条是诊断脚本按 SVG 规范 F.6.5 反解圆心、把弧按角度采样才暴露的：只取弧端点会把两端鼓出去的 10 个单位算丢，重叠判据跟着一起失真
  - 补一条定义层自检（`elementMotion.test.ts`）：每支齿的两端都必须在「与该设备旋转中心同心的最大圆」之外。滚筒与齿圈是两处图形，只改一处半径就会出现「齿长在鼓里」，静态检查和肉眼都不一定看得见
  - 尺寸边界：新图标内容包围盒 97.7×74.7（aspect 1.308，含 `stroke-width 3.2` 油缸带来的 2.1 描边余量），比旧的线条稿方正得多，默认 `100×60` 下名称/数值两行会把图形区压到 92×28、实绘只剩 38×28——几十个图元糊成一团。默认尺寸按「图形区 + 两行文字」反推到 `170×120`（实绘 94×72，两行都在；未绑定设备只显名称时 120×92）。已放置的元素只换图形、尺寸不变
  - 实测：`elementMotion` 23 用例 + `assetComponents` 14 用例通过；临时页复用**仓库真实函数**（`styleIcon` / `tightenIconSvg` / `getIconBounds` / `computeElementLayout` / `fitIconRect` / `makeIconFrame` / `placeRotor`）画 8 组：100×60 停机灰与运转青、齿角 0°/45°（齿圈与滚筒保持同心，旋转中心不偏）、200×120 2d、320×190 25d 持续旋转、过载橙、64×38 面板缩略观感，另附未改动的皮带机做对照；第二轮把 520/300/170/140/120/90 六档尺寸 × 静止/转 22° 两态一次截全，并把采煤机素材并排放在同一页比线条密度（5180 备用 dev server，未动 5173/5174，临时页与实例用完即删即停）
  - 全量门槛：`npx vitest run --reporter=verbose` 66 文件 / 618 用例零失败（与 `git ls-files | grep -c '\.test\.ts$'` = 66 对齐，汇总行无 `Errors`）
- 首页项目卡片操作栏改成单行常驻，配置项收进「⋯」
  - 背景：三个问题叠在一起。① 6 个控件用 `flex-wrap` 排在 `minmax(320px,1fr)` 的栅格里，已发布态「取消发布」比「发布」宽 24px，最小列宽下必然换成两行，卡片高度跟着发布状态跳；② 操作栏 `opacity:0` 只在悬停时淡入，未悬停时是一块点不着的空白，触屏与键盘用户永远够不到；③ `html.dark .el-button--primary` 的品牌青覆盖只管暗色，亮色主题下主按钮仍是 Element Plus 默认蓝，同一张卡两套主题两种强调色，加上 success/warning plain 的绿与橙，一行五种视觉重量
  - 改法：`ProjectCard.vue` 操作栏收成「打开编辑 / 预览 / 发布（取消发布）/ ⋯」，数据源·报警·点表三项并进 ⋯，组件内按命令分流回 `config` 与 `more` 两个事件，`dashboard/index.vue` 的契约一字未改。`project-card.scss` 用 `nowrap` + `gap:2px` + 顶部 hairline + `padding-top:10px` 定出恒定 35px 单行，取消悬停才显示的透明度门（层级改由配色承担：整行只有一个实心态）；主按钮不再用 `type="primary"`，直接消费 `--accent-primary`，两套主题同色；次级按钮统一透明底 + 细边框 + 次要文字；⋯ 靠 `margin-left:6px` 补足与左侧的 8px，读起来不像第五个平级按钮
  - 「删除」悬停转红：EP 的 `el-dropdown-item` 不透传 class（实测 `li` 上只有 `el-dropdown-menu__item`），改用内层 `span` 做钩子 + `:has()` 反推整项。特异性算术：`:has(.x)` 只按参数中最高的那一个计一次，基础态不带 `:not(.is-disabled)` 时只有 (0,2,0)，压不过 `html.dark .el-dropdown-menu__item` 的 (0,2,1)，红色实测被盖回 `--text-primary`；补上后 (0,3,0) 胜出
  - 顺带把 `.card-actions` 的选择器全部加上 `.project-card` 前缀：编辑器里的 `ComponentCard` 用了同名 class（绝对定位的红叉、自己的悬停展开逻辑），此前两边在同一份全局样式里互相污染
  - 实测：临时实例（`vite --port 5180` + 后端 5178 + 独立 `DATA_DIR`，未触碰 5173/5174）导入示例工程。320px 列宽下草稿态按钮合计 226px + 3×2 = 232 ≤ 286，已发布态（取消发布 72px）同样单行；行高恒 35px、`scrollWidth == clientWidth` 无溢出；⋯ 与左侧实测 8px；「删除」computed color = `rgb(255,71,87)` 而邻项仍 `rgb(224,224,224)`；主按钮两档主题均 `rgb(0,212,170)`。`vitest run --changed` 3 文件 39 用例、`vue-tsc --noEmit`、超长文件检查通过
  - 未做完：亮色主题的肉眼核对、以及「删除」悬停底色的截图——验证时应用内浏览器标签页被切走（`visibilityState=hidden`），指针事件打不进、隐藏页的 computed 读数不可信
- 收紧单测验证节奏：改完代码的默认动作是「跑受影响的测试」，不是全量
  - 背景：全量 `npx vitest run` wall 53s，其中用例本体只占 8s，其余全耗在 65 个文件的加载与 jsdom 环境上；且本机跑全量会因沙箱 EPERM **静默少跑文件**（`Test Files` 在 62~65 之间跳，汇总行带 `Errors` 时那次运行等同没跑过）——又慢又不可信，付一分钟换回一个残缺的绿灯
  - 改法（`AGENTS.md`「验证节奏」节）：写死硬约束 + 三档日常命令（`npx vitest run <路径片段>` / `--changed` / `-t <关键词>`，均支持路径子串模糊匹配）；全量只允许出现在「准备提交」，且必须确认汇总行无 `Errors` 才算数，必要时 `--no-file-parallelism`；新增「给测试文件选环境」小节，规定新增测试时如何选 jsdom / node
- 纯逻辑单测改用 node 环境跑（40 个文件）
  - 背景：单测默认跑 jsdom，但只有真碰 DOM 的用例需要它。jsdom 环境开销远大于纯逻辑用例本体，白跑很贵
  - 改法：给无 DOM 依赖的用例补 `// @vitest-environment node` 头（`server/**` 早已这么做，本次补齐 `src/` 一侧）。插入时按文件自身换行符写、其余字节原样保留——仓库工作区 36 CRLF / 29 LF-only 混存，任何「读全文再写回」的规范化都会制造几十个文件的假 diff，实测每个文件 `+1 -0`
  - 为什么只改 40 个而不是全部：判据看「用例自身是否摸 DOM」，但被测源码可能间接依赖。实测 8 个文件炸掉——`alarmStore.ts` 的 `window.setTimeout`（自己用例全过、副作用抛 unhandled rejection，是最隐蔽的一类）、5 个 datasource 适配器（fetch / WebSocket）、`DataSourceManager`、`historian`、`deviceStore`，已全部回滚保持原状
  - 实测：全量 53.1s → 39.9s（−25%，同口径 plain run 对比）；`--no-file-parallelism` 串行 65 文件 / 601 用例 / 0 FAIL / 0 Errors；40 个文件合计 `+40 -0`，无一行被整体改写
- 趋势图更名折线图
  - 组件名与元素默认名（`src/industrial/chart/index.ts` 的 `name` 与 `nameProperty`）改为「折线图」，与柱状图/饼图/雷达图同为「图型」口径；实测跨 Tab 搜索「折线图」命中、「趋势图」0 命中
  - 不涉及历史趋势弹窗（`TrendChartDialog`）与属性面板的「查看趋势图」入口——那两处指的是**历史曲线**功能，表述保留；README 图表清单同步。组件库使用频次按 type 统计，改名不影响既有工程与高频排序
- 报表默认样式：列更宽、行不再塌成 9px
  - 现象：拖入后每列窄、每行高度几乎为零。探针实测元素 512×352 里表格只占 62px 高，4 个数据行的单元格各 9px（空内容时行高只剩上下 padding），表格挤在顶部、下面 290px 空着
  - 改法：默认尺寸 320×220 → 400×240（`fitDropSize` 对所有组件统一放大 1.6 倍，实际落 640×384）；表格 `table-layout: fixed` 让列宽均分；行高改为按「元素高度 ÷（数据行 + 表头）」均分并夹在 32~80px
  - 为什么不用 `table { height: 100% }` 让浏览器自己分：实测 Chrome 把多余空间全分给 tbody——默认 5 行、容器 240px 时表头被压到 20px、数据行 55px，头重脚轻；tr 上写百分比高度同样无效（实测仍是 32/88）。自己算反而可预期。夹上下限是防两端走形：元素拉很高时行不跟着无限长，缩很小时由外层 overflow 出滚动条
  - 报表字号默认 12 → 14，并给报表补上 `defaultConfig`（9 个 HTML 挂件此前一个都没写）：渲染层的最终口径是 `prop('fontSize', 12)`，不物化进 properties 的话属性面板会从 12 起算，一改动就把 14 冲掉
  - 报表走独立的 `reportTableStyle` / `reportCellStyle`，不与「表格」挂件共用——那个的行数随绑定变量变化，均分会让单变量时的一行占满全高
  - 实测：拖入后列宽 213（原 174）、行高 77 且表头与数据行等高、表格撑满容器 100%（原 84% 高度 + 表格 62px）；元素高度缩到 150 时行高被 32 下限兜住并出滚动条；0 页面错误
- 消除画布每个元素刷一条的 Vue 警告 `Extraneous non-emits event listeners (click, contextmenu, mouseenter, …)`
  - 根因：vue-konva 的容器节点（Group/Layer/Label/FastLayer）返回的是插槽片段，根节点不是元素，模板上的 `@click` 等监听无法被「自动继承」；vue-konva 会在 setup 里把 vnode.props 的 on* 键合进 applyNodeProps，所以功能不受影响，但 dev 下每个元素一条警告
  - 改法：CanvasElements.vue 的分组配置（含 8 个事件）整体搬进脚本 `groupConfig()` 并通过 `:config="item.group"` 传入（`onClick`/`onDragstart`…，applyNodeProps 对 on* 键做同样的 `node.on()` 注册，功能一致）；PreviewStage.vue 的 `@click` 同改进 config。ConnectionLine.vue 本就是 config 写法，未动
  - 实测：playwright + 系统 Chrome 进编辑器拖入设备与雷达图，控制台 0 条 Extraneous 警告；点选元素后属性面板正常显示坐标（onClick 生效）；全量 `npx vitest run` 65 文件 / 596 用例零失败，`vue-tsc --noEmit` 零输出
- 首页只滚动「最近项目」区，顶栏 / 欢迎语 / 统计卡 / 标题行钉住不动
  - 背景：原来整页一起滚，项目一多往下拖，「最近项目」标题和它的计数、搜索框就滚出画面，四张统计卡也在第一屏之后变成纯占位
  - 改法：`dashboard.scss` 把 `.dashboard-container` 由 `min-height:100vh` 改成 `height:100vh` + flex 列 + `overflow:hidden`，`.dashboard-content` 转为 flex 列（`flex:1; min-height:0`），新增 `.project-scroll` 承载网格 + 空态 + 底部提示（`flex:1; min-height:0; overflow-y:auto`）。底部留白从 `.dashboard-content` 的 padding 挪进滚动区，否则末尾卡片会被 padding 吃掉一截
  - 一个容易忽略的裁剪问题：`overflow-y:auto` 会让浏览器把同一元素的 `overflow-x` 由 `visible` 按 `auto` 处理，卡片悬停的 `translateY(-4px)` 与阴影会在上、左边缘被切掉。解法是四边各留 8px padding 缓冲 + 等量负 margin 抵掉位移，保持网格与标题行左边线对齐
  - 短屏兜底：`@media (max-height: 620px)` 退回整页滚动。固定区自己就超过一屏时继续锁死会把网格挤到看不见；固定区那几个块靠默认 `min-height:auto` 不会被 flex 压扁，高度不足全部由滚动区吸收
  - 实测：静态门槛同「首页搜索」一条（typecheck / `--changed` 单测 / eslint / build / 超长文件检查全过）。**滚动手感与两档主题下的搜索框配色待肉眼核对**（同上，未登录）

### 修复

- 多用户/多标签同时新建同名工程仍可互相覆盖（前端判重非原子）
  - 根因：上一条「静默覆盖」修复把查重放在前端 `saveProject` 的 `isProjectTaken(target)` → 再 `set`，是**读—判—写**三步。用户之间靠服务端按 token 分的命名空间（`u/<userId>/`）本来就不会互相看到，但**同一账号的两个标签 / 两台设备**同时新建同名工程时，两边都判到「未占用」→ 都写 → 后写的静默覆盖先写的（lost update）。判重留在客户端，绕开 SPA 直接打 `PUT /api/storage/set` 也能跳过它
  - 改法：把「新建（本会话未认领）」的保存改成一次**原子的「仅当不存在则创建」**写。① 存储接口 `set` 加可选 `options.ifAbsent`，冲突统一抛新类型 `StorageConflictError`（`src/storage/errors.ts` 单独成文件，避开 index↔remote 值循环）；② 远程适配器 `ifAbsent` → `PUT .../set?key=&mode=create`，服务端 409 映射成 `StorageConflictError`，其它非 2xx 仍是普通 Error；③ 本地/内存适配器在同一 tick 内判存在后抛冲突（JS 单线程即无竞态）；④ 服务端 `atomicWrite.writeFileAtomic` 加 `{ ifAbsent }`——存在性检查放进**同路径串行槽内、rename 之前**，`fs.access` 命中即抛 `EEXIST`；`kv.mjs` 出 `writeValueIfAbsent`；`routes/storage.mjs` 的 set 认 `?mode=create`、`EEXIST`→`409 {error:'exists'}`（角色门禁与 `keyError` 不变）。`saveProject` 据此把「非 own」的保存带 `ifAbsent`，捕获冲突即返回 false，编辑器状态与认领标志都不动
  - 边界与代价：只保证**单进程** Node 下原子（当前部署形态）；多进程共享同一 `DATA_DIR` 时 access 与 rename 之间仍有极小窗口，要再防得把 `wx` 落到正式文件名或引锁/DB，已在函数注释里写明。**已拥有工程的「更新覆盖」这次不做**（需 ETag/版本号的乐观并发，改动更大，留作后续）；`publishProject` 的判重语义与写入键不同（查工作副本、写发布快照），且真实流程里保存已先行原子判重，故保持原样不改，避免语义漂移。离线回落 localStorage 时按单浏览器隔离，本就无跨设备竞态
  - 动了：`server/lib/atomicWrite.mjs`、`server/lib/kv.mjs`、`server/routes/storage.mjs`、`server/index.mjs`（接口注释）、`src/storage/{index,errors,remote}.ts`、`src/stores/projectPersistence.ts`、测试 `server/lib/kv.test.ts`、`src/storage/index.test.ts`、新增 `src/storage/remote.test.ts`、`src/stores/projectStore.test.ts`
  - 实测：新增 10 条用例——`kv` 3（create-on-absent 成功 / create-on-exists 抛 `EEXIST` 且旧值不动 / 两路并发 `Promise.allSettled` 只有一个 fulfilled）、`index` 2（Memory 与 LocalStorage 的 `ifAbsent` 冲突与不带 flag 时可覆盖）、`remote` 4（ifAbsent→URL 带 `mode=create`、409→`StorageConflictError`、非 409 故障仍抛普通 Error、不带 flag 不加 mode）、`projectStore` 1（两个独立 store 同名新建，第二个返回 false、名字回滚、第一个数据原样）。定向 `npx vitest run` 5 文件 / 67 用例全绿（无 `Errors`）；`pnpm typecheck:server`、`vue-tsc --noEmit`、`check-long-files.ps1`（OK，无超限）均通过。**后端端到端**（临时 5178 + 独立 temp `DATA_DIR` + `AUTH_TOKEN`，不碰 5173/5174）：`mode=create` 首写 200 → 同键再 create 得 `409 {error:exists}` 且原值保持 `FIRST` → 不带 mode 的写 200 覆盖成 `THIRD`，确认「冲突不覆盖 / 默认写不受影响」。前端 409→`StorageConflictError`→`saveProject` 返回 false 的映射由 `remote` 用例覆盖；未做双标签浏览器实机（该竞态在 server/adapter/store 三层已逐项验证）

- 预览页 HUD 右侧图标按钮的悬停提示不随主题变色
  - 根因：报警 / 写值锁定 / 轮播 / 全屏 / 写值审计 / 主题切换 6 个按钮用的是原生 `title`，气泡由浏览器绘制，CSS 选不中，暗色主题下仍是白底，和左侧 `el-tooltip` 的深蓝气泡对不上
  - 改法：一律换成 `<el-tooltip effect="light" placement="bottom">`，随状态变的文案改绑 `:content`（`activeAlarmCount` / `writeLocked` / `autoRotate` / ThemeToggle 的 `tip`）；light 档在亮色主题走 EP 默认白底，暗色主题由 `dark-theme.scss` 的 `html.dark .el-popper.is-light` 上色，与「返回上一画面」同一条通道
  - 动了：`src/views/preview/PreviewHeader.vue`、`src/views/preview/PreviewHeader.test.ts`（新增右侧按钮用例）
  - 实测：挂载断言 6 个按钮无 `title`、hover 报警按钮出的气泡带 `is-light`；页面内探针读计算样式，`.el-popper.is-light` 暗色为 #16213e 底 / #e0e0e0 字、亮色为 #fff 底 / #303133 字。全量 67 文件 / 628 用例通过（汇总行无 `Errors`），`pnpm build`、eslint（改动文件）、超长文件检查通过

- 新建项目保存会静默覆盖同名工程（撞名无校验）
  - 根因：查重只长在「重命名」上（`renameProject` / `renameSavedProject` 走 `isProjectTaken`），「新建项目 → 首次保存」这条路径没有任何检查：首页「新建项目」只 `resetProject()`（默认名「未命名项目」），`saveProject()` 直接写 `scada_project_<当前名>`。第二个未命名项目一保存就悄悄吃掉第一个；导入工程固定名「导入的项目」同样撞。用户看到的不是报错，是自己的旧工程凭空消失
  - 改法（`projectPersistence.ts`）：`saveProject` / `publishProject` 写入前查重——目标工程名已被占用、且非本会话认领时返回 false，不写存储。认领标志 `ownedProjectName` 由 `loadProject` 打开成功、保存/发布成功置位，`resetProject` / 导入时清除，`renameProject` / `renameSavedProject` 随键迁移同步，编辑器会话快照（预览页往返）也带上它——少任何一处都会把「覆盖自己的旧版本」误判成撞名
  - 交互（`useProjectActions.ts`）：保存 / 保存并返回 / 预览 / 发布前保存四个入口共用 `saveWithNameGuard()`，撞名时弹框请用户改名、改名后重试（新名字仍撞则循环再问），取消则中止并提示，不再有静默覆盖
  - 为什么不在后端做：`server/index.mjs` 是领域无关的 KV 存储，既不知道「工程名」的语义，也拿不到「是不是本会话打开的」这个判断依据；且后端不在线时回落 localStorage，规则只放后端会离线失效
  - 动了：`src/stores/projectPersistence.ts`、`src/stores/projectStore.ts`、`src/components/layout/toolbar/useProjectActions.ts`、`src/stores/projectStore.test.ts`
  - 实测：新增 7 条 store 用例——新建默认名 / 指定名 / 导入后撞名均拒绝且旧数据与脏标记不动，打开过或保存过的工程再存放行，重命名后认领随键迁移（漏同步则改名后再存被误拒），`publishProject` 撞名不覆盖别人发布版。全量 `npx vitest run --reporter=verbose` 67 文件 / 628 用例通过（66 个入库 + 1 个未入库的 `PreviewHeader.test.ts`，汇总行无 `Errors`）；`vue-tsc --noEmit`、`vite build`、超长文件检查均通过
  - 浏览器实测（dist 静态伺服 + 系统 Chrome，`/api` 全阻断隔离、`/auth/me` 伪造 200，不碰用户后端与 5173/5174）：建第一个项目（默认名）直接存成功 → 再新建一个同默认名项目点保存 → 弹出「项目名已被占用」并带覆盖警告与预填旧名 → 改「第二个项目」确认后存成功 → 首页两卡并存且旧项目修改时间原样（08:24:36 未被顶掉）；取消路径再弹一次、点取消出现错误提示并留在编辑器。10/10 通过

- 编辑器点「预览」再返回，新增的画面 2 / 画面 3 没了
  - 根因：预览与编辑器是同一份 Pinia store。工具栏「预览」先 `saveProject()` 再 `router.push('/preview?project=…')`，而预览页默认读**发布快照**，`applyProjectData → pageStore.setPages()` 是整表替换，把内存里那张旧发布版（只有主页）灌进编辑会话；返回 `/editor` 不重新读盘，于是画面 2/3「消失」。若此时再点一次保存，回退结果就被写回工作副本（本机实测：`scada_published_未命名项目` 与 `scada_project_未命名项目` 都只剩 1 张画面，时间戳相差 10 分钟，正对应这条链）
  - 改法一（`useProjectActions.handlePreview`）：编辑器的「预览」带 `?source=draft`——按钮语义是「看我刚存的东西」，运行版入口（首页卡片预览）仍默认读发布快照。同步修正工具栏那枚 tooltip（原文案写死「默认显示发布版」，现在不成立了）
  - 改法二（兜住「读发布版」这类入口）：`projectStore` 新增 `snapshotEditorSession()` / `restoreEditorSession()`，预览页挂载前抓现场、卸载时还原并 `clearHistory()`（否则回编辑器一按 Ctrl+Z 会把预览那份内容撤销进来）。还原要显式开关：`uiStore.hasEditSession` 由编辑器 setup 置位、首页挂载复位——从首页直接进预览时内存里是空工程，还原反而会把刚加载好的工程抹掉
  - 动了：`src/components/layout/toolbar/useProjectActions.ts`、`src/components/layout/Toolbar.vue`（文案）、`src/stores/projectStore.ts`、`src/stores/uiStore.ts`、`src/views/preview/index.vue`、`src/views/editor/index.vue`、`src/views/dashboard/index.vue`、`src/stores/projectStore.test.ts`
  - 实测：新增 2 条 store 用例——① 1 画面发布 → 内存加到 3 画面 → `loadPublishedProject()` 确认被顶回 1 张 → 还原后画面名依次为主页/画面 2/画面 3、activePageId 回到画面 3、`hasUnsavedChanges` 一起回来；② 快照与后续编辑隔离（改工作区元素名后还原仍是旧名，验证深拷贝，同 `useHistory` 的引用穿透教训）。全量 `npx vitest run --reporter=verbose` 66 文件 / 618 用例通过（与磁盘 `git ls-files | grep -c '\.test\.ts$'` = 66 对齐，汇总行无 `Errors`）；`vue-tsc --noEmit`、`pnpm build`、超长文件检查均通过
  - 浏览器实机：在临时端口对（5180 前端 + 5178 独立 `DATA_DIR`，避开正在跑的 5173/5174）走通「编辑器加 3 张画面 → 点预览」，确认 URL 带 `source=draft` 且预览 HUD 的画面胶囊是 3 张（改前读发布版是 1 张）。**改法二的还原没能实机点到**：内嵌浏览器标签处于 hidden 状态，`<RouterView>` 的 `mode="out-in"` 过渡依赖 rAF，隐藏标签里不推进，路由停在 `page-fade-leave-active`；`hasEditSession` 开关与 onUnmounted 还原仅由上述 store 用例覆盖，建议手动点一次（进预览 → 点「编辑器」）
- 报表拖到画布上默认就带一条竖向滚动条
  - 根因：行高按「元素高度 / 行数」均分（默认 400×240、4 数据行 + 表头 = 5 行 → 48px），五行加起来正好等于容器高度、零余量；而表格是 `border-collapse: collapse`，上下外框各外凸半像素，表格实际 241px 装进 240px 的 `.wg-table-wrap`（`overflow: auto`）必然判溢出。行高与容器同步乘 zoom，所以任何缩放比例下都复发；滚动条还会吃掉 10px 宽度（表格实测宽从 400 变 390）
  - 改法：均分前先扣 2px 边框余量再向下取整（`Math.floor((height - 2) / rowCount)`），保证「行高 × 行数 + 外框」恒不大于容器；取整是关键，不取整时分数行高的像素对齐可能把余量再吃掉
  - 边界：32px 下限与 80px 上限不变——元素缩得太小、或行数配得太多导致下限生效时，仍按设计出滚动条
  - 实测：在跑着的 dev server 页面里注入与组件同一套内联样式的探针（全局 `box-sizing` 与滚动条样式都取自真实页面），新公式下 240/5、250/5、170/5、300/8、600/5、241/5 六种尺寸 `scrollHeight == clientHeight`、滚动条消失；120/5 与 240/20 两种下限生效的场景仍 `scrollHeight` 163/649 > 容器、横向均未溢出。默认 5 行报表在 zoom 0.25~3 七档逐一测过，全部无滚动条。`vue-tsc --noEmit` 通过、`vitest run industrial/widget` 20 例通过
- 组件卡片说明气泡的三处观感问题（偏亮 / 拖影带红叉 / 红叉上还弹气泡）
  - **气泡在暗色主题下发亮**：EP 的 `el-tooltip` 默认 `effect="dark"`，那是写死的 `#303133` 深灰，不吃 element-plus 的暗色变量，在本项目更深的画布底色上反而显得亮。改成 `effect="light"` 后走 `--el-bg-color-overlay` / `--el-text-color-regular`，跟着 `html.dark` 一起变。实测：暗色 `rgb(22,33,62)`、浅色 `rgb(255,255,255)`
  - **拖拽影像里带着删除红叉**：浏览器的拖拽影像在 **mousedown 之后、dragstart 之前**快照，而开始拖拽必然先 hover（红叉此刻正显示），所以在 dragstart 里改样式已经来不及。改为卡片上记 `dragging` 状态（mousedown 置真，mouseup / dragend / mouseleave 复位），`&.dragging .card-actions { opacity: 0 }` 写在 `:hover` 规则之后、靠同特异性后来者胜出
  - **鼠标移到红叉上仍弹气泡**：给 `.card-actions` 加 mouseenter / mouseleave 置 `suppressed`，tooltip 的 `:disabled` 多挂这一条——先关气泡再谈删除，不让气泡压住操作按钮
  - 实测：暗色气泡背景 rgb(22,33,62)、浅色纯白；鼠标停在红叉上可见气泡数 0；按下卡片后红叉 opacity 0；0 页面错误
- 快速拖动组件库卡片时，拖拽影像里仍带着删除红叉
  - 现象：上一轮已修掉「按下卡片即收起红叉」（mousedown 置 `dragging` + `opacity: 0`），慢速拖动确认不再带叉；但按下后立刻快速拖到画布，红叉还是会出现在鼠标后面的拖影里
  - 根因：`opacity` 是可过渡属性，而 `.card-actions` 基准态挂着 `transition: opacity 0.15s`——`dragging` 类加上时 opacity 才从 1 开始往 0 走，浏览器在 mousedown 之后、dragstart 之前抓取拖影，快速拖动正好抓在过渡开始处，红叉处于半透明中途，照样被画进拖影；慢速拖动时过渡早已结束，所以看着像已经修好
  - 改法（两层）：`&.dragging .card-actions` 改用 `display: none`——display 不可过渡，mousedown 当帧就把红叉从渲染树里摘掉；并把 `transition` 从基准态挪进「显示态」规则（`:hover` / `:focus-within`）——CSS 过渡取的是变化后样式中的定义，于是淡入照旧从显示态触发，而一切收起（移开鼠标、按下卡片）都是当帧完成。后者堵掉另一个理论窗口：单次大跳步让 mouseleave 先于 dragstart 触发时，基准态若还挂着过渡，红叉会在淡回 0 的半路上被抓拍
  - 实测（playwright + 系统 Chrome，搜索「报表」取首张卡片）：悬停 80ms opacity 0.93、380ms 到 1（淡入保留）；按下当帧 display=none / transition=0s；一次移动 260px 跨过拖拽阈值并离开卡片后立刻 opacity=0 且 transition=0s（无过渡中途帧），200ms 后仍为 0；松手后重新悬停淡入照旧；0 页面错误
- 缩放组件后选中框回弹到原尺寸，与图形对不上
  - 现象：拖变换器锚点缩放设备，松手后组件按新尺寸渲染，四周的选中框却回到原来的位置和大小，要取消选中再点一次才跳回来
  - 根因：Transformer 量框用的是被绑节点的**子节点**包围盒（`Container.getClientRect` 只并集子节点，Group 自身的 width/height 不参与），而它只监听被绑节点自身的 `widthChange/heightChange/scaleXChange/…`（`TRANSFORM_CHANGE_STR`）+ `absoluteTransformChange`，Group 的 `_attrsAffectingSize` 为空——子节点尺寸变化不派发任何事件。`onTransformEnd`（`src/core/canvas/useElementDrag.ts:141`）写 store 后立即 `node.scaleX(1)`，这次 `scaleXChange` 触发的 `update()` 量到的仍是旧子节点（新宽高要等 Vue flush 才落到节点上）；flush 后子节点真正长成新尺寸时没有任何事件通知它 → 框永久停在旧尺寸
  - 同一条链路解释了另一类既有毛病：属性面板改宽高、撤销/重做、对齐这些**程序化**改几何，框同样不跟着走——此前只在 `selectedIds` 变化时才重绑
  - 修复：`ScadaCanvas.vue` 把绑定动作抽成 `rebindTransformer()`，监听对象由 `selectedIds` 换成「选中元素的 x/y/width/height/rotation 签名」（`selectedGeometry` computed）。选择变化与几何变化于是走同一条路：`nextTick` 之后重跑 `nodes()`，它会 detach+attach 清尺寸缓存、按真实子节点包围盒重算，并同步单节点旋转；多选时同一次 mouseup 的多次写回被 Vue 合并成一次回调
  - 没动 `onTransformEnd` 的回写时序：那个「store 异步 + 同步清 scale」的空窗经确认画不到屏幕上（Konva `batchDraw` 排 requestAnimationFrame，Vue flush 在微任务里先跑完），所以没有额外给节点补一次同步写宽高——补了也量不到框，真正的缺口是刷新时机
  - 验证：`vue-tsc --noEmit` 零输出；浏览器实测由使用者在已开着的编辑器里跑（内嵌浏览器标签 0×0 无布局，Konva 量不到尺寸，且 5173 归主实例，未起竞争实例）
- 表格（带搜索）的搜索框点不进去
  - 根因：overlay 的 `.html-slot` 是 `pointer-events: none`，而 **pointer-events 会继承**——子元素不显式写 `auto` 就一起失效。`.wg-filter-input` 一直没写，于是搜索框在编辑态与运行端都是摆设（编辑态 readonly 为 false，本该可用）
  - 修复：给 `.wg-filter-input` 补 `pointer-events: auto`。分页条同理，所以翻页按钮所在的 `.wg-pager` 也显式声明（否则点了没反应）
- 保存/预览时报 `remove failed: HTTP 500`（自动草稿删不掉）
  - 现象：点「保存」或「预览」，控制台 `DELETE /api/storage/remove?key=scada_draft_未命名项目 500` + Vue 未处理异常；点「预览」时页面不跳转，看起来像保存失败
  - 根因：`removeValue` 直接 `fs.rm(..., { force: true })`，而 force 只吞 ENOENT。Windows 上刚写完的文件句柄还没释放（杀软/索引服务），紧接着删就拿到 EPERM——自动草稿每 30 秒重写一次，正式保存后立刻删正好撞这个窗口。同目录的 rename 早已为此做了退避重试（`lib/atomicWrite.mjs`），删除这条路漏了
  - 修复：把 rename 的退避重试抽成 `withTransientRetry(action, delays)`（EPERM/EBUSY 才重试，[10,40,120,300] 毫秒），rename 与 `removeValue` 共用；前端 `saveProject()` 里 `clearDraft()` 改为 catch + `console.warn`——项目数据此时已落盘，草稿清理失败不该让整个保存算失败（残留草稿最多多问一次恢复）
  - 实测：隔离端口 + 临时数据目录起后端跑真实请求，PUT→GET→DELETE 全 200、删不存在的键仍 200；`kv.test.ts` 打桩 `fs.promises.rm` 首次抛 EPERM，断言 `removeValue` 重试后成功（13 用例）；`atomicWrite.test.ts` 补重试语义 3 用例（瞬时错误重试到成功、EACCES 一次不重试、耗尽后抛原始错误）；`projectStore.test.ts` 补「remove 抛错时 saveProject 仍返回 true 且项目已落盘」
  - ⚠️ 生效需重启 `pnpm server`（常驻 node 进程不热加载）
- 趋势图/柱状图/雷达图未绑定数据时在画布上近乎不可见
  - 现象：拖入后画布上「没有啥东西」。playwright 墨迹探针实测（canvas 非透明像素占比）：趋势图 0.28%、柱状图 0.28%、雷达图 0.51%，肉眼等于空白；对照饼图有占位环所以 17.69% 清晰可见。根因与已修的网格图同型——图表「一条绑定一个系列」，没绑变量时 trend/bar 的 series 为空（只剩几乎看不见的坐标轴）、radar 的占位多边形透明度仅 0.25；而 Konva 侧对 overlay 类型不画图标、名称条也被关掉；绑了变量但数据源未连接时（柱高 0、折线无点）同样空白
  - 修复：`ChartElement.vue` 统一加 DOM 空态（虚线框 + 「未绑定数据/暂无数据」文案 + 按图型区分的引导），字号/边框随 zoom 缩放，与网格图空态同一套风格；`unbound`（无绑定）与 `nodata`（绑了但从没收到值，trend 看历史缓冲、bar/radar/pie 看变量是否推送过）两档判定，「收到过 0」不算空态（柱子 0 高但类目名可见属正常）；空态期间不初始化 ECharts（容器 v-show 隐藏时 init 会拿到 0 尺寸），脱离空态后 nextTick 惰性 init；`HtmlOverlay.vue` 给 ChartElement 传 zoom
  - 实测：playwright 三态切换——拖入即见「未绑定数据」空态、注入绑定后切「暂无数据」、注入实时值后 canvas 出现（墨迹 6.32%）正常渲染，全程 0 页面错误；全量 `npx vitest run` 65 文件 / 596 用例零失败，`vue-tsc --noEmit` 零输出
- 网格图未绑定数据时在画布上完全不可见
  - 现象：拖入后什么都看不到（playwright 探针实测 overlay 容器 512×352 在、格子 0、可见文字为空）。根因是网格图「一个绑定一格」，没绑变量就没有格子；而 Konva 侧对 overlay 类型不画内建图标、`DATA_DRIVEN_CAPS` 又关掉了名称条，三路全空后画布上只剩一个不可见的命中区
  - 修复：`WidgetElement.vue` 给 grid-chart 补空态——跨满整行（`grid-column: 1/-1`）的虚线框 + 「未绑定数据」主文案与「在数据绑定里添加变量」引导，字号/间距随 zoom 缩放，与其他挂件同一套换算；有绑定后走的仍是原渲染路径，行为不变
  - 实测：playwright 拖入网格图，空态文案在画布可见；全量 `npx vitest run` 65 文件 / 596 用例零失败，`vue-tsc --noEmit` 零输出
- 雷达图无数据绑定时挂载即崩（控制台 `Cannot read properties of undefined (reading 'push')`）
  - 根因：ECharts 6 的 radarLayout 按「指标轴」逐项建 points 数组，`radar.indicator` 为空（刚拖入、还没绑变量）时一个轴都没有，但数据项仍然存在，`points[idx].push(...)` 直接 TypeError，ChartElement 的 mounted 整体报错；崩溃点定位自浏览器报错行号与 node SSR 复现（同一报错文案）
  - 修复：`buildRadarOption`（src/industrial/chart/options.ts）在无绑定时补一条「暂无数据」占位指标轴，占位值复用既有的全 0 占位分支，并保证数据项长度与轴数一致
  - 顺带删掉四个 builder 里的 `tooltip: { show: false }`：TooltipComponent 未按需注册，写了反而触发 ECharts 的 "Component tooltip is used but not imported" 警告；option 里没有 tooltip 键时该组件根本不会创建（已用 SSR 探针实测「未创建」），行为一致且省体积
  - 回归护栏：options.test.ts 新增「图表 option 与 ECharts 的契约」一组，用 ECharts SSR（SVG 渲染器）把四个 builder 的空数据/有数据 option 真渲染一遍，文件头 `@vitest-environment node` 避开 jsdom 无 canvas 的 measureText 报错噪音

### 安全

### 测试

### 构建

- 验证门槛改为「提交轻量 / 推送全量」两级，新增 pre-push 钩子
  - 背景：仓库没有 CI，此前「准备提交」一行要求每次提交跑全量四件套（约 3.5 分钟）。逻辑单元越小，这笔固定开销占比越高——时间大量耗在跑测试上，而小改动最可能踩的坑（跨文件类型错）其实 `vue-tsc` 一个就能抓
  - 改法：提交时只跑轻量集（改动路径相关测试 + `vue-tsc` + 行数检查）；推送时由 `scripts/hooks/pre-push`（壳）→ `scripts/pre-push-check.mjs`（主体）强制跑全量四件套（`vitest run` / `vue-tsc --noEmit` / `vite build --emptyOutDir=false` / `check-long-files.ps1`），任一步失败即中止推送；只推 tag 时跳过（tag 指向的提交已随分支过过门槛）。AGENTS.md「验证节奏」表同步拆成两级，全量的权威时机改为推送
  - 每步失败自动重试一次：本机实测沙箱 EPERM 会间歇打翻 vitest 的 vite SSR 缓存（Temp 下 ssr 写入被拦），症状是「用例全过但汇总行带 Errors、退出码非 0」——与代码无关，但会把用户训练成 `--no-verify`。AGENTS.md 既有口径（汇总行有 Errors 就重跑）由此机器化；重试再不过才判真失败
  - 取舍：提交之间的 HEAD 允许个别坏提交（如改了签名漏改调用方、相关测试没覆盖），但不出机器；远端 dev 永远是全量验证过的状态。没有 CI 的仓库，推送前的全量就是唯一的 CI

### 重构与清理

### 文档

- AGENTS.md 按加载预算重排，本机环境细节外移到 `docs/ENV_NOTES.md`
  - 背景：AGENTS.md 是跨工具的开放标准文件（Codex / Cursor / Jules / Amp 等都自动加载），Codex 侧 `project_doc_max_bytes` 默认 32 KiB、从仓库根到当前目录**合并计算**、超出部分**从尾部静默截断**。实测本仓库的 AGENTS.md 为 34,645 字节，截断点落在「给测试文件选环境」小节中间、还把汉字从字节中间劈成乱码；被吃掉的内容是「凡是用户要看的输出先看真东西」整段、临时进程与端口错开的两条实操，以及整节 `## 测试`（含浏览器合成事件实测套路）——恰好是最不会有人补写第二遍的经验。Qoder 侧全文注入所以这个截断在本机不可见。
  - 第二个问题：原文用 〔本机〕 标记一批条目并写明「不要照搬」，等于给换机器/换 agent 的读者一个跳过**整条**的合法出口，而那批条目里混着两类东西——只在本机成立的值（代理端口 7897、代码页 936、`~/.gitconfig` 的凭据助手修法），与任何环境都必须遵循的动作（Git Bash 别写 `> nul`、全量汇总行有 `Errors` 就不算跑过、逐文件列表要和磁盘比对）。按后者留正文、前者外移拆开。
  - 改法：正文只保留任何机器/任何 agent 都成立的规则，并按「丢了会让代理做错多少工作」重排章节顺序（字节预算 → 概述 → 任务清单 → 常用命令 → 存储后端 → 验证节奏 → 测试 → 环境与已知坑 → 代码风格 → 架构与扩展点 → 工作流约定）；新增「字节预算」一节，写明 32 KiB 硬线、≤30 KiB 软阈值、字节核对取法，以及**不要用嵌套 AGENTS.md 分层**（预算合并计算，只会更早撞顶）；环境细节按「症状词留正文、诊断过程进 ENV_NOTES」拆，移出去的有 `::1` 被 Clash TUN 拦、误建 `nul` 保留名文件后删不掉的复盘、控制台代码页与 PowerShell 两行修法、代理端口推送与失败不重试、凭据助手弹窗（这条本机已应用完毕，只作复发备查，不再要求别人照做）；「本仓库没有 CI、钩子只管提交标题」写进验证节奏，说明那张底线表全靠正文约束；过期计数（48 个测试文件、367~408 用例）改为留取法 `git ls-files | grep -c '\.test\.ts$'`（2026-10-19 实测 = 65），同文档内「48 / 65」两个数字并存的老化痕迹一并清掉；2.5D 一节从 6 条压到 3 条（细节本就在 `docs/2.5D_ILLUSTRATION_GUIDE.md`），并行改动与 README 同步两节去掉事故叙事、只留判据。
  - 顺带修：README 的文档块与目录树补 `docs/ENV_NOTES.md`；目录树里 `agents.md` 改回 git 实际跟踪的 `AGENTS.md`（本机 `core.ignorecase=true` 掩盖了大小写不一致，Linux 克隆按小写名取文件会失败），正文里的字节核对命令同步用大写名。
  - 复查（旧正文 223 行逐行比对 + 全库关键词检索）：120 行一字未变、11 行原样进 ENV_NOTES，其余为改写或并句。查出压缩时连带丢了两个例证并已补回——`depthLayers.ts` 已删除的原因句（正文只说「不要在元素背后铺背景色块」而不说理由，下一个人容易把它当遗漏加回来）与提交标题的字符算例（钩子按**字符**判长，「汉字算 1 不是 3」唯一算死它的就是这句）。同时确认「图元分两档 / 插画级成本与设备数是乘法 / `viewMode` 由编辑器工具栏切换且运行端只读跟随」不是丢失，`docs/2.5D_ILLUSTRATION_GUIDE.md` 原本就写着。判定为被更强的同句覆盖、不补的两处：worktree「这条拒得对……」的理由从句、「别每改一行就起一遍」（已由「只在最后一轮做一次」覆盖）。
  - 实测：AGENTS.md 34,645 → 28,906 字节（距 32,768 硬线余 3,862，全量存活无截断），`docs/ENV_NOTES.md` 7,112 字节；两文件均无 U+FFFD、AGENTS.md 内 6 条文档链接全部命中磁盘文件；45 个关键术语比对，正文缺失的 9 项全部落在 ENV_NOTES 内（`127.0.0.1` / `936` / `OutputEncoding` / `7897` / `helper-selector` / `GetFileAttributes` / `ERROR_ACCESS` / `NtCreateFile` / `CredentialHelper`），补回后按 60 项复查，正文唯一不含的是 `mihomo`（引擎名，属 ENV_NOTES）——即通用规则零丢失、只有本机值被外移。本次只动文档，未跑单测与构建（`src/**`、`server/**` 零改动）。

## [0.0.6-261018] - 261018

### 功能

- 新增手写「状态灯」组件，归入通用设备分组
  - 动因：用户要求补一个状态灯。源资产（coalmine-ui 旧 `1通用/状态灯.svg`）已随旧组态编辑器的编号资产体系于 2022-05-06 被整库删除（提交 `c7e558e2f`），本次按 git 初次提交里的原文件复刻几何；没有修那份导出件本身——它带 `<style>` 类规则写死灰色，会压过 `currentColor` 继承，让状态变色对灯体永久失效
  - 几何与原资产一致：144 画布、外圈 r64.1 描边 6（固定 `#999999` 灯体，不随状态变）、灯芯 r47.9（`currentColor`，随状态变色）；iconImage.ts 的变色是 `currentColor` 字符串替换、固定色原样保留，故两色调可共存，停机态观感与原版「浅灰灯圈 + 深灰灯芯」同构
  - 状态契约复用 `assetComponents` 的 `STATE_RULES`（state 0/1/2：报警 `#ff4d4f` / 运行 `#00d4aa` / 停机 `#8c8c8c`，severity 显式声明），与 132 个导入图元同一套口径——该常量随之导出为共用；接入任意数据源只需把开关量或状态字绑到 `state`
  - 面板位置：通用设备组末尾（13 项素材导入之后），组件总数 176 → 177；同步 README 组件表（通用设备 13→14、总数 176→177）与 USER_GUIDE（简介/布局表总数、状态规则示例）
  - 已知边界（与 132 个导入图元同一口径）：画布颜色跟随「绑定设备的数据」，无数据时 StatusEngine 的 `?? 0` 兜底为停机色；属性面板的「状态」选择器写的是 `properties`，不直接驱动画布变色，改绑在数据绑定面板操作
  - 实测：全量 `npx vitest run` 65 文件 / 592 用例零失败；`vue-tsc --noEmit` 与 ESLint（3 个改动 .ts）零输出；playwright + 系统 Chrome——通用组件 Tab 卡片 50→51、通用设备组含「状态灯」卡，拖入画布后属性面板显示 状态灯 / status-lamp / 状态选择器；画布像素取色：灯芯 `#8c8c8c`、灯圈 `#999999`（停机态与原资产「浅灰圈 + 深灰芯」两色调一致）；三态取色页（与 iconImage.ts 同一条 currentColor 替换链路）实测 停机 `#8c8c8c` / 运行 `#00d4aa` / 报警 `#ff4d4f`，灯圈四态恒为 `#999999`

- 组件库的组件可以移除了：卡片右上角红色 ×，二次确认，可一键恢复
  - 动因：用户要求「组件库的组件也可以删除」。内置组件数百个，单个项目通常只用其中一小部分，列表越长翻找成本越高；此前只有自定义组件与设备模板能删（常驻的垃圾桶图标）
  - **内置组件的「删除」实现为隐藏而非注销**：定义写死在 `src/industrial/**`，若走 `unregisterComponent` 则刷新页面就复活，且画布上同类型实例会退化成默认样式——两处都不是用户想要的。现在注册表保留定义（画布照常渲染取数），只有组件库面板按隐藏清单过滤掉它；自定义组件与设备模板仍是真删除（确认后从存储移除）
  - 新增 `src/industrial/hiddenLibrary.ts`（纯存储层，键 `scada_hidden_components`，全局一份与工程数据解耦；非字符串项丢弃、去重、坏 JSON 按空处理）+ `src/composables/useHiddenComponents.ts`（模块级单例状态，与 `useHistory` 同构：`hide/show/showAll` + `hiddenComponents`/`hiddenCount`；计数只算仍在注册表里的 type，历史遗留条目不会把入口角标撑大）
  - `useComponentSearch` 的 `isHit` 改名 `isShown` 并叠加「未被隐藏」判定：面板的分组列表、Tab 圆点、最常使用共用这一条口径，不会出现「Tab 计数还在、卡片却没了」。顺带修掉 `mostUsedHits` 只在搜索态过滤的问题（原来非搜索态直接返回原数组，任何过滤条件都会漏过去）
  - 抽出 `src/components/layout/ComponentCard.vue`：四处卡片循环（最常使用 / 分组 / 自定义 / 模板）原本各写一遍卡片骨架，加操作区就是第四份重复；图标走 `icon` prop，设备模板没有 SVG 用默认插槽。拖拽载荷仍由面板决定（卡片不知道 `dataTransfer` 格式）
  - 交互：操作区默认不出现，悬停或键盘聚焦卡片才滑出——满屏红叉既吵又容易误点；`opacity:0` 时同时置 `pointer-events:none`，看不见的叉子不该点得动。× 的底色静息即暗红 `color-mix(--accent-danger 72%, #000)`（前置一个 `#b8333f` 固定值作不支持 color-mix 时的保底），悬停升到纯正 `--accent-danger`（相对亮度 0.129 → 0.265，约 2 倍），白色符号两级对比度 5.86 / 3.34；编辑按钮保持灰底、悬停用主题主色，与删除区分。所有删除都要二次确认，文案按语义分两种（内置 =「移除」，自定义/模板 = 「删除」并说明画布实例的退化后果）
  - 贴角位置来回调了六档（纯观感迭代，每一档都实测过几何）：内嵌 `3px` 用户嫌没贴角 → `-2px` 外溢，用户报「有一部分看不到」并怀疑 overflow hidden，实测否掉——`.component-item` 是 `visible`，滚动容器 `.component-panel`(auto) 离圆钮还有 97~170px，没有祖先裁它；真因是外溢的 1~2px 落在卡片外、没有底色衬托，半透明灰在那儿几乎无对比度 → `0` 偏移（圆边与卡片 8px 圆角重合，仍觉不够）→ `-9px` 按「圆心压在卡片外角点」（半径 8 + 边框 1），实测圆心 = 角点 (79,156) 但右侧外溢 2px 压到邻卡、用户嫌太外 → `-1px` 按「圆心落在圆角弧的圆心上」，弧心 = 外角点向内 8px，而 `top/right` 参照不含 1px 边框的 padding box（所以是 -1 不是 0），两圆半径同为 8 且同心，实测圆心 (71,164) = 弧心、偏差 0.00、一像素不外溢 → 用户仍觉偏内，**最终取两档中点 `-5px`**：圆心距外角点 5.66px（实测 (75,160) vs 角点 (79,156)），向卡片外悬出 4px，横竖都落在 6px 的网格间距里、离邻卡留 2px。注释已把这两个偏移标成可调参数（`-1` 同心 ↔ `-9` 压角），后续微调 ±1 即可，不必重新推导
  - 配套一处层叠：`.component-item:hover { z-index: 2 }`——卡片是 `position: relative`，邻卡按 DOM 顺序绘制在后者之下，圆钮 hover `scale(1.2)` 外溢的 1.6px 会被右边那张卡盖住；2 高于邻卡（auto）又低于吸顶的 `.panel-top: 3`，滚到顶部的圆钮不会糊在面板头上
  - 恢复入口：组件库标题右侧的「划线眼睛」圆形按钮，仅在有隐藏项时出现且排在最右（不顶开搜索与新建按钮），点开新的 `HiddenComponentsDialog.vue` 列出图标 + 名称 + type，支持逐个恢复与全部恢复
  - 拆分随功能发生：`component-panel.scss` 原本 487 行，卡片样式再长就会越过 500 行阈值，把 `.component-group` 整块移到新的 `src/styles/component-card.scss`（主文件降到 377 行）；`ComponentPanel.vue` 拆完卡片后仍涨到 414 行超 400 阈值，于是把搜索盒（展开/收起 + placeholder 跑马灯测量）拆成 `LibrarySearchBox.vue`，面板降到 318 行，查询文本与过滤结果仍归面板的 `useComponentSearch`
  - 实测：新增 `hiddenLibrary.test.ts` 6 用例 + `useHiddenComponents.test.ts` 7 用例（隐藏/幂等/恢复/全部恢复/跨刷新保留/失效 type 不计数/单例共享）；全量 57 文件 / 511 用例零失败，JSON 报告逐文件与磁盘清单比对一致；`vue-tsc --noEmit` 通过。**浏览器实测抓到一处只有跑起来才暴露的问题**：`<Close />` 未注册导致 × 位置一片空白——图标是白名单注册（`main.ts` 的 `usedIcons`，全量注册会把 294 个图标都打进包），已补 `Close`。红底与贴角这两步最终由用户在真浏览器里目视定稿；**隐藏标签页不是可靠的判据**：那里的 `getComputedStyle` 会返回旧值（我给它注入一条全新的 `rgb(1,2,3)` 规则，读出来仍是灰底），要核对样式的落地只能看真窗口，或退一步用 `fetch('/src/styles/xxx.scss?direct')` 看服务端下发的编译 CSS（这条能证实规则已在位、选择器已命中，只是证明不了渲染）

- 装饰组件新增「导航」标题栏（992×62）
  - 动因：源产品组件库里唯一值得补的一项——蓝色科技风横幅（渐变底 + 中央装饰框 + 虚线，无文字，做大屏标题栏时用户自行叠文字组件）。此前未导入的原因记录在 manifest 的 deco _note：源文件是 PNG，而导入管线只认 SVG
  - 导入脚本新增 PNG 通道：`.png` 素材读为 base64、包成 viewBox 取固有像素的 SVG `<image>`，与矢量图元共用同一条图标管线——styleIcon 对无 `data-face` 标注的内容原样放行（2D/2.5D 外观一致），getIconImage 只做 currentColor 字符串替换、data-URI 原样穿透；manifest 追加 `deco_nav`（src `desc/real/_desc00.png`，源图 1984×124 为 @2x，元素默认尺寸按源产品取 992×62）
  - 代价如实记录：118KB PNG → 约 158KB base64 进包（dist 3.1M 的约 5%，gzip 后基本不缩）。只值得给这类无文字装饰横幅用；带文字的贴图仍应另行托管，勿走此通道
  - 已知边界：导航与其他装饰组件一样带 state 三态契约，但 raster 颜色固有、不随状态变色——配状态规则不会有视觉变化
  - 横管 / 竖管维持不导入：源配置里两项 src 都错指到 `_desc09.svg`（与四通同源），且本项目已有原生「管道」组件

- 组件库新增跨 Tab 搜索与「最常使用」Tab；移除「自定义组件」Tab
  - 动因：组件已达数百个，找一个组件要在几个 Tab 里逐个翻；高频组件（矩形、文本、时间）每次组态也要重复找一遍
  - 搜索（按用户两次要求调整过位置与形态）：最终形态是**头部内嵌的展开式搜索**——位于「组件库」标题右侧、新建按钮左侧，默认只显示放大镜图标，点击展开为输入框（自动聚焦），Esc 或再点图标收起；**收起即清除**，避免输入框看不见了过滤却还在生效。匹配「组件名 / type / 分组显示名」（大小写不敏感；设备模板按名称匹配），覆盖最常使用 / 基础 / 行业三个 Tab 与自定义组件。有命中的 Tab 自动激活（当前 Tab 无命中时跳到第一个有命中的 Tab）并带右上角小圆点，命中组件高亮（主题色边框 + 浅底 + 名称变色），非命中项在搜索态下隐藏
  - 「最常使用」Tab 置于最前并作为默认 Tab：按组件类型统计拖入画布次数，取前 12 个（4 行 × 3 列），同次数按名称排序保证稳定；计数经 `scada_component_usage` 键持久化（storage 适配器，远程/本地模式都可用，与工程数据解耦），落件后经 `scada-usage-changed` 事件刷新面板；模板落件计入其底层组件类型；无记录时显示引导空态
  - 移除「自定义组件」Tab（用户要求）：设备模板与自定义图形不再常驻面板，改为**只经搜索触达**——搜索命中时以「自定义组件」小节附在结果末尾，卡片保留编辑 / 删除 / 拖拽；新建自定义组件后自动按名字展开搜索，组件立刻可见（否则新建完在面板里没有任何落脚点）
  - 结构（.vue 400 行门槛，当次拆完再提交）：注册块、分组清单与分组显示名从 `ComponentPanel.vue` 拆至 `src/industrial/panelRegistry.ts`；搜索逻辑在 `src/composables/useComponentSearch.ts`；最常使用数据在 `src/composables/useMostUsedComponents.ts`；计数持久化在 `src/industrial/usageLibrary.ts`。面板文件 341 → 349 行
  - 实测：新增 `usageLibrary.test.ts` 6 用例（累加 / 空 type / 坏数据过滤 / 数组与损坏 JSON 兜底）；全量 **55 文件 / 498 用例**零失败（json 报告与磁盘清单逐文件比对一致，无 Errors）；`pnpm build`（含 vue-tsc）通过
  - 文档同步：README 组件库段落改为三 Tab + 头部搜索口径；USER_GUIDE 简介与编辑器表格「组件库」行重写，5.6 设备模板改「搜索框输入模板名」，7.8 自定义组件改为「搜索触达」口径，新增 5.9「组件库：搜索与最常使用」

### 优化

- 组件库「煤矿组件」分组更名「综采系统」
  - 动因：该分组的 16 个组件里 9 个来自 coalmine-ui 素材库的综采系统图元（`subunit-manifest.json` 系统键 `zongcai`），组名与素材来源对齐，且与「主运输系统 / 主通风系统 / 洗选系统」等同级分组命名口径一致
  - 只改显示名（`panelRegistry.ts` 的 `groupNames.coal`），分组 key `coal` 与全部组件 type 不变，已保存工程不受影响；搜索按分组显示名匹配，改后搜「综采」命中该组、搜「煤矿」无命中
  - 同步 README（组件分组清单、行业 Tab 括号列表）与 docs/USER_GUIDE.md（功能简介、编辑器布局表、模拟设备分组表）
  - 实测：全量 `npx vitest run` 65 文件 / 592 用例零失败；playwright + 系统 Chrome 进编辑器确认行业 Tab 首组标题为「综采系统」、搜索「综采」命中 16 卡片、搜索「煤矿」出现空态

- 移除手写「采煤机」（`ShearerDefinition`），组内保留同名素材图元
  - 动因：手写线条稿（110×60）与综采素材图元 `coal_shearer_wide`（610×232）同名同设备，手写版是早期测试占位，素材版才是正式组件；组内两个「采煤机」并排且搜索无法区分
  - 删除 `src/industrial/coal/index.ts` 的定义与数组项；`elementMotion.test.ts` 同步收窄——动效定义断言改为 `roadheader`/`conveyor` 两个，坐标换算用例的几何常量改注「写死在此、与组件定义解耦」（数值本就是硬编码，不依赖该定义）
  - 不动 Mock 的 `shearer_1`（沿用 valve/pump 先例：删组件不删 Mock 设备，绑定它的旧工程数据不断）；`design/` 下历史探针引用的 `ValveDefinition`/`PumpDefinition` 早已失效，同属不参与构建的死代码，一并不动
  - 组件总数 177 → 176（`getAllComponents()` 实测），README/USER_GUIDE 同步；带动效组件由 3 个减为 2 个
  - 实测：playwright + 系统 Chrome 确认综采系统组 15 卡片、首张为「掘进机」、搜「采煤机」仅命中素材图元一条；全量 `npx vitest run` 见下一条提交记录

- 组件库分组重排：电气组件（24）、管道组件（1）由「基础组件」Tab 移入「行业组件」Tab
  - 动因：用户要求两者归入行业 Tab。电气 24 种里 22 种是电力系统素材导入的现场设备，管道也是工艺流程现场件，与「基础图形 / 信息挂件 / 通用设备」不是一类；移走后基础 Tab 只剩基础组件 / 通用设备 / 装饰组件 / 图表组件 4 组，行业 Tab 变 10 组
  - 只改 `src/industrial/panelRegistry.ts` 的 `BASIC_GROUPS` / `INDUSTRY_GROUPS` 两个数组（管道 / 电气追加在行业 Tab 末尾）。分组只存在于组件定义层、不进元素实例（`ComponentInstance` 无 `group` 字段），**对既有工程数据零影响**；跨 Tab 搜索的 `hitTabs` 与「自动激活第一个命中 Tab」直接复用这两组常量，无需另改
  - 实测：playwright + 系统 Chrome——基础 Tab 分组为基础组件 / 通用设备 / 装饰组件 / 图表组件（18+13+11+8 = 50 种），行业 Tab 为综采 / 主运输 / 主通风 / 洗选 / 热力 / 电厂 / 化工 / 水处理 / 电气 / 管道（126 种）
  - 文档同步：README 组件表把两条搬到行业分组块末尾、Tab 描述与架构图面板列同步；USER_GUIDE 简介与编辑器布局表的 Tab 组数改为基础 4 组 / 行业 10 组

- 组件库「基础组件」Tab 更名「通用组件」，图表组件上移到第二位
  - 动因：用户要求。原 Tab 名与组内第一个分组「基础组件」同名，切换后分不清哪个是 Tab 哪个是分组；图表（4 个数据挂件 + 4 个 ECharts）是高频件，原先沉在「装饰组件」下面，难找
  - 改法：`BASIC_GROUPS` 由 `['basic', 'general', 'deco', 'chart']` 调整为 `['basic', 'chart', 'general', 'deco']`（面板内分组顺序直接读这个数组）；`ComponentPanel.vue` 的 Tab label「基础组件」→「通用组件」。分组显示名 `groupNames.basic` 仍是「基础组件」，Tab 与分组不再同名；分组 key 与组件 type 不变，既有工程数据零影响
  - 文档同步：README 组件表把「图表组件」条目移到「基础组件」之后、Tab 描述与架构图面板列；USER_GUIDE 编辑器布局表 Tab 组序改为基础 / 图表 / 通用设备 / 装饰；另修 5.9 节搜索行为描述（× 与失焦逻辑前两轮已改，文档没跟上）
  - 实测：playwright + 系统 Chrome——Tab 标签为 最常使用 / 通用组件 / 行业组件；通用组件 Tab 分组为 基础组件(18) / 图表组件(8) / 通用设备(13) / 装饰组件(11) 共 50 种，行业 Tab 仍为 10 组 126 种；搜「图表」自动激活通用组件 Tab、命中 8 卡

- 预览页 HUD 与登录页的 emoji 换成线性图标
  - 动因（用户反馈）：预览页顶部工具栏一排 🔔 / 🔒🔓 / 📋 / 🌙☀️ 是系统彩色 emoji，「AI 味太浓」，且与编辑器工具栏那套单色线性图标不成一体；登录页的 👤 / 🔒 / 🌙 同一批一起处理
  - 改动：`PreviewHeader.vue` 八个按钮统一走 `ToolIcon`（编辑器工具栏同一图标系统，24 viewBox / stroke 1.7 / 只吃 `currentColor`，因此自动跟随 HUD 文字色与 `danger`/`locked`/`on` 的换色）；`login/index.vue` 用户名与口令输入框前缀、右上角主题圆钮同样改走 `ToolIcon`（复用既有 `user` / `lock` 字形）；两处主题按钮从 ThemeToggle 的 `emoji` 插槽属性换回 `icon`，`useThemeToggle` 的 emoji 通道至此无调用方，留待后续清理
  - `ToolIcon.vue` 补 `back` / `prev-page` / `bell` / `lock` / `unlock` / `rotate` / `fullscreen` / `audit` 八个字形；顺带把 `←` `⤺` `▶▶` `⛶` 四个 unicode 字符一起换掉（`⤺` 在部分字体下落为豆腐块；轮播按钮原先恒显 `▶▶`、只靠 `.on` 边框区分状态，换成环形箭头后图标本身可读）。返回箭头按用户选定的口径做成**单尖角 ‹**（不带箭杆），与右侧 `⏮ 上一画面` 区分层级
  - 尺寸：HUD 用 `:deep(.tool-icon)` 收档——ToolIcon 自身固定 18px 对 32px 高的 HUD 按钮偏大，文字按钮取 15px、纯图标按钮取 17px；登录页输入框前缀 16px（`.input-icon` 改 inline-flex），主题圆钮沿用默认 18px
  - 实测：系统 Chrome 无头把 15 个字形按实机档与放大两档渲染成图片逐一目视核对（形状、闭合、居中、与 12px 中文并排的视觉重量）；预览页真机（`/preview?project=示例工程-水泵房`）DOM 量得 8 个按钮全部出图、描边 `rgb(215,228,232)` 随 HUD 文字色、`.hud-bar` 文本内已无 emoji 码点；vitest 全量 **57 文件 / 511 用例**零失败（本轮无 `Errors`，逐文件与磁盘清单一致）；`vue-tsc --noEmit`、`pnpm build`、check-long-files 通过；eslint 改动文件 0 错误（PreviewHeader 仅 1 条既有 `<img/>` 自关闭警告，非本次引入）

- 工具栏标题区视觉基线对齐 + 搜索 placeholder 跑马灯
  - 动因（用户反馈）：① 铅笔编辑图标与「未保存」标签肉眼上看比项目名称「更向上、更高」；② 搜索框 placeholder「搜索组件名称或分组」被截断只能看到一部分，希望滚动展示全文
  - 对齐问题的定位过程值得一记：盒子中心与**墨迹中心**实测都居中（三种 DPR 下像素级分析 Δ ≤ 0.7px，DPR 1 / 1.25 / 1.5 各测一轮），但**基线**差是真的——16px 标题基线 y=32，12px 标签文字基线 30.5、16px 图标墨迹底 31，都浮在标题基线上方 1~1.5px。人眼判读并排文字按基线而非几何中心，小字基线偏高读作「被抬高了」。修复：铅笔 `translateY(1px)`、标签 `translateY(1.5px)`，把墨迹底/基线压回与标题齐平
  - placeholder 跑马灯：原生 placeholder 无法滚动，改为覆盖层方案——输入框 `placeholder` 移除（a11y 由 `aria-label` 承担），空态时叠加 `.search-ph`（与文本区同位、`overflow: hidden`、`pointer-events: none`），其内轨道文字用 keyframes 在 0 与 `--ph-shift` 间缓滚（6s ease-in-out alternate，两端各停 1.8s）；`--ph-shift` 由组件量出（轨道宽 − 可视宽，140px 盒下为 19px），放得下时为 0 不动；`prefers-reduced-motion` 下停用。量测时机：展开过渡 `@after-enter` 与 × 清空后（`watch` + `nextTick`）
  - 实测（系统 Chrome，DPR 3）：`--ph-shift` 量出 19px（轨道 111 − 可视 92）、动画名生效、computed transform 随时间推进（0 → −14.2px）；强制内联 `translateX(-19px)` 后截图确认覆盖层真实绘制、尾部「分组」露出。⚠️ 无头截图对合成器动画会冻结（两次相隔 2.6s 的截图字节相同但 computed transform 在走），判别时以 computed 值 + 强制内联对照为准，勿据截图断言「没动」
  - 实测：`pnpm build`（含 vue-tsc）通过；eslint 0 错误且两文件警告画像与改前逐规则一致（ComponentPanel.vue 101 = 101）；vitest 全量 **55 文件 / 498 用例**零失败；check-long-files 通过；三文件行尾 CRLF 无混杂

- 组件库面板标题防折行 + 组件名悬停显示全称
  - 动因（用户反馈）：① 搜索框展开时「组件库」的「库」字掉到下一行；② 部分组件名过长显示省略号，希望悬停能看完整名称
  - 折行根因（浏览器实测定位，非猜测）：`.panel-header` 的标题无防折行保护（flex 项默认 `flex-shrink: 1`），且 `.header-actions` 的 `min-width: auto`（flex 项自动最小尺寸 = 内容宽 170px）卡死整条收缩链——搜索盒展开后头部溢出，压力全砸在标题上把文字挤折行。修复三件套：标题加 `.panel-title`（`flex-shrink: 0` + `white-space: nowrap`）、`.header-actions` 加 `min-width: 0` 解除自动最小宽、图标按钮槽 `flex-shrink: 0`——空间不足时由搜索盒收缩吸收
  - 实测（强制压窄模拟极端）：248px 正常态展开后标题单行、搜索盒 140px；压到 230 / 214px 标题仍单行，搜索盒缩到 131 / 115px 吸收挤压（修复前 214px 时搜索盒不缩、头部直接溢出）
  - 悬停全称：四类组件卡片（最常使用 / 基础 / 行业 / 自定义图形与设备模板）加原生 `title` 属性，名称被省略号截断时悬停可见全名
  - 实测：`pnpm build`（含 vue-tsc）通过；eslint 0 错误（ComponentPanel.vue 警告 97 → 101，+4 为新增 `:title` 行沿用所在块既有 html-indent 缩进风格，非新增问题类别）；vitest 全量 **55 文件 / 498 用例**零失败（本轮逐文件与磁盘清单一致、无遗漏）；check-long-files 通过；两文件行尾 CRLF 无混杂

- 组件库搜索交互收敛：失焦自动收起 + 去掉命中项高亮
  - 动因（用户反馈）：① 搜索完结后组件不应保持高亮——「搜索到的组件，选中了也不要高亮」；② 鼠标移出搜索框（失焦）时应自动缩回成搜索图标
  - 去掉 `.component-item.hit` 命中高亮（teal 边框 + 浅底 + 名称变色）：搜索态下非命中项本就被隐藏、命中项即唯一可见内容，整屏 teal 没有区分度；命中定位交给 Tab 级指示——自动激活 + 右上角圆点 `.has-hit`（保留）。此项撤掉了初版「当前搜出的组件也高亮」的视觉部分，过滤与 Tab 逻辑不动
  - 输入框 `@blur` 即收起（沿用「收起即清除」）；框内放大镜与 × 按钮加 `@mousedown.prevent` 阻止焦点移出触发 blur——否则点 × 会连框一起收起（而非只清文本）、点放大镜则会收起两次
  - 文档同步：USER_GUIDE 5.9 的高亮与收起描述改写
  - 实测：`pnpm build`（含 vue-tsc）通过；eslint 0 错误且 ComponentPanel.vue 警告数 99 → 97（html-indent 91→89，零新增）；vitest 全量 **55 文件 / 498 用例**零失败（首轮沙箱拦掉 elementMotion / expression / StatusEngine 三文件，补跑 60 用例全过，逐文件与磁盘清单一致）；check-long-files 通过；三文件行尾 CRLF 无混杂

- 组件库搜索改为「圆形图标按钮 + 展开搜索盒」形态：图标按钮与「+」同款（el-button small circle + Search 图标），点击后搜索盒以宽度过渡展开，放大镜收入输入框内（原为独立图标按钮悬在输入框外，视觉脱节）；placeholder 恢复为初版口径「搜索组件名称或分组」
  - 动因：用户反馈两点——① 放大镜图标跑到了搜索框外面；② 搜索按钮样式应与右侧「+」一致且有点击展开效果
  - 匹配范围未动（组件名 / type / 分组显示名，大小写不敏感，设备模板按名称）——初版即是此口径，用户要求的「组件名、分组名、类型」已全覆盖，无逻辑改动
  - 结构：`main.ts` 注册 Search 图标（与 Plus 同一处 usedIcons）；ComponentPanel.vue 头部搜索块重写——`<transition mode="out-in">` 做「圆形按钮 ↔ 搜索盒」交换（两者不同时在场，无布局重叠），展开动画为搜索盒 width 0→140px，`@after-enter` 聚焦输入框；框内放大镜为收起按钮（点击或 Esc 收起，收起即清除）；component-panel.scss 的 `.header-search` 块随之重写
  - 文档同步：USER_GUIDE 5.9 收起交互描述改为「Esc 或点击框内放大镜」
  - 实测：`pnpm build`（含 vue-tsc）通过；eslint 0 错误且 ComponentPanel.vue 警告画像与改前逐规则一致（99=99：html-self-closing 5 / html-indent 91 / no-v-html 3，零新增）；vitest 全量 **55 文件 / 498 用例**零失败（首轮沙箱拦掉 expression / alarmStore 两文件，补跑 40 用例全过，逐文件与磁盘清单一致）；check-long-files 通过；四文件行尾 CRLF 无混杂

- Element Plus 改为按需引入：移除 main.ts 的全量 `app.use(ElementPlus)`、全量 CSS 与全量图标注册，交还 unplugin 的 ElementPlusResolver 接管——此前「按需配置」被全量引入抵消，组件样式与 294 个图标全部无条件进包
  - 动因：`vite.config.ts` 配了 `unplugin-auto-import` + `unplugin-vue-components` 的按需 resolver，而 `main.ts` 同时全量 `app.use` + `import 'element-plus/dist/index.css'` + 遍历注册全部图标，按需配置形同虚设
  - 图标从全量 294 个收敛到实际用到的 22 个（模板标签 + 右键菜单 `:is` 字符串引用，逐个扫描核对）；官方暗色变量 `dark/css-vars.css` 保留（teleport 弹层/表格行转暗依赖它）。~~`ElMessage` / `ElMessageBox` 样式由 auto-import resolver 按需注入~~——此判断有误，见下方「修复」：resolver 不处理显式 import，编程式组件样式须在 main.ts 手动补引
  - 实测：`pnpm build`（含 vue-tsc）通过；产物对比——`vendor-element` JS 1072 KB → 930 KB（-13%）、CSS 363 KB → 165 KB（-55%），合计约 -340 KB

- 项目列表加载骨架屏与配置弹窗按需加载：首页项目网格从远程存储取数期间渲染 3 张脉冲占位卡片（此前先闪空态再出现卡片）；首页 6 个配置弹窗与工具栏 2 个弹窗改 `defineAsyncComponent` + `v-if` 打开才挂载，不再打进首屏 chunk

- 滚轮缩放与拖拽对齐参考线写入按帧合帧：触控板滚轮每帧可触发多次 wheel，原先每次事件都写 store 触发整树更新，现合并到每帧一次（一帧内多个事件只生效最后一个，缩放不再按事件数爆发）；拖拽中 `alignGuides` 的响应式写回同样 rAF 合并，吸附调整（node 位置）保持同步，拖拽手感不变；组件卸载时取消挂起的 rAF

### 修复

- 组件库头部搜索盒在基础/行业组件 Tab 下展开时顶到「组件库」标题
  - 动因：滚动发生在 `.component-panel` 整层面板（`overflow-y: auto`），基础/行业 Tab 内容长、出竖向滚动条时头部可用宽被吃掉 15~17px；而头部余量只有 9.1px（标题 39.9 + 搜索盒 140 + 新建按钮 24 + 间隙 6×2 + 内边距 28，合计约 238 / 面板 247），正好被滚动条吃光——经典滚动条环境下搜索盒与标题间隙归 0「顶到字」。最常使用 Tab 内容短不出滚动条，所以只有那两档复发
  - 修法：滚动收敛到 `.panel-body`（`overflow-y: auto` 从 `.component-panel` 下移），头部移出滚动容器，宽度恒定不再随滚动条出现/消失而变；顺带删掉 `.panel-top` 的 sticky 吸顶 hack（头部本就固定，属死代码）
  - 实测：playwright + 系统 Chrome 逐 Tab 验证——三档 Tab 头部间隙恒为 9.1px、面板级滚动量 0、body 滚动量 1881/2737px 且滚到底头部 top 不变；`pnpm build` 39.2s 通过

- 搜索态下切换 Tab 不再收起搜索（原「失焦即收起」把另一 Tab 的命中项一起清掉）
  - 动因：搜「煤」时命中同时落在最常使用与行业组件，点行业组件那一下让输入框失焦 → `collapseSearch` 连带清空查询 → 该 Tab 下命中项全变不可见（实测切过去后 102 张卡全量铺开，等于白搜一次）
  - 修法：失焦收起的判据由「失去焦点」收紧为「点击发生在组件库面板之外」——在 document 捕获阶段用 `mousedown` 记下目标是否在 `.component-panel` 内（卡片不可聚焦，`blur` 的 `relatedTarget` 恒为 null，判不出来）；切 Tab / 点卡片都属于还在用搜索，保留查询与过滤，点画布 / 属性面板照旧收起清除；键盘 Tab 移出无 `mousedown`，标志位是复位过的，照旧收起
  - 配套：搜索态下点 Tab 把焦点还给输入框（`LibrarySearchBox` 新增 `defineExpose({ focus })`，面板 `onTabClick` 里 `nextTick` 调）——焦点不回来的话 `@keydown.esc` 收起与继续输入都失效，只剩点框内放大镜这一条路；`event.detail === 0`（键盘触发的 click）不抢焦点，焦点留在 Tab 按钮上
  - 实测：playwright + 系统 Chrome——搜「煤」后切行业组件，框与查询均保留、焦点回到输入框、命中卡 10 张分属 4 个分组；Esc → 收起清除回 102 张；搜「泵」后点画布 → 照旧收起清除；键盘触发切 Tab → 焦点仍在 Tab 按钮且过滤保留。`pnpm build` 22.8s 通过
  - 遗留：搜索态下点卡片开始拖拽，过滤会一直保留到用户主动收起（同属面板内点击，符合预期）

- 搜索框内的 × 改为「清除并收起」：点完直接回到圆形图标态
  - 动因：点 × 的意图是「搜完了，收起来」，原实现只清文本、搜索盒仍占着头部 140px，还得再点一次框内放大镜才收起
  - 修法：删掉 `clearSearch()`（清文本 + 保持展开 + 回焦），× 直接绑 `collapseSearch`，与框内放大镜同归；`title` / `aria-label` 由「清除搜索」改为「清除并收起搜索」，免语义与实际不符
  - 实测：playwright + 系统 Chrome——搜「煤」后点 ×，搜索盒收起、圆形图标按钮回来、查询清空、卡片由 4 张命中回到 12 张全量；再点图标是干净的空框。`pnpm build` 23.0s 通过

- 首页顶栏主题切换按钮仍带矩形外框：`:deep()` 写在全局 scss 里导致整条圆形按钮规则被丢弃
  - 动因（用户反馈）：主页的主题切换按钮外面有一个矩形框，希望去掉
  - 根因：`dashboard.scss` 由 `views/dashboard/index.vue` 以 `import './dashboard.scss'` 引入，是**全局样式**；而 `:deep()` 只有 SFC `<style scoped>` 才会被 `@vue/compiler-sfc` 展开，全局文件里它原样输出成 `.nav-actions :deep(.theme-toggle)`，浏览器按无效伪类**丢弃整条规则**——按钮因此退回 Element Plus 默认外观（6px 圆角矩形 + 1px 边框）。原注释「父级 scoped 取不到、需 :deep 穿透」把引入方式记错了，`<style src scoped>` 那套只适用于 `toolbar.scss`
  - 同一逗号组里的 `html[data-theme='light'] .sys-chip` 也被连带丢弃，亮色主题下「系统设置」胶囊的实底规则一直没生效
  - 修法：两处选择器改为普通后代 `.nav-actions .theme-toggle`；顺带补 `flex: none`——按钮作为 flex 项默认 `flex-shrink: 1`，顶栏空间不足时会被压扁（实测 150px 容器内缩成 14×40，正是一个矩形），圆形象征不该参与收缩
  - 副作用如实：`.sys-chip` 的亮色实底规则随本条修复一并恢复，亮色下「系统设置」胶囊底色变为 `--bg-tertiary`（此前只剩近乎看不见的白色叠加层，与顶栏同色）
  - 实测：dev server 的编译产物里选择器已输出为 `.nav-actions .theme-toggle`（`hasDeep: false`）；把该样式表注入页面并按顶栏结构建探针量得 `border-style: none` / `border-radius: 999px` / 40×40 正圆、18×18 图标四边留 11px 居中无溢出，加 `flex: none` 后 150px 窄容器仍为 40×40。⚠️ 内置浏览器窗口未展开导致截图不可用（`visibilityState=hidden`），本轮以计算值 + 几何量测代替目视；探针 DOM 与注入样式已清理
  - 同类排查：`toolbar.scss` 经 `<style src="./toolbar.scss" scoped>` 引入，其 `:deep()` 有效、不动；`src/components/dialogs/data-source.scss` 全仓无引用（孤儿文件），其中的 `:deep()` 不影响运行，未处理

- 恢复草稿等 `ElMessageBox` / `ElMessage` 弹层样式破损：按需引入改造后这些编程式组件（显式 `import { ElMessage } from 'element-plus'` 后函数调用，非模板 `<el-xxx>` 标签）的样式无人注入——auto-import resolver 只对「未显式 import、靠它补进来的符号」注样式，显式 import 的 16 个文件全部漏掉，弹出的是无样式裸 DOM（恢复草稿弹窗文字发暗、按钮裸奔）。`main.ts` 全局补引 `message` / `message-box` 两个样式入口（其 css 链自带 base/input/button/overlay 依赖），覆盖全部调用点
  - 实测：`pnpm build`（含 vue-tsc）通过；暗色主题下恢复草稿弹窗样式正常

- 缩略图与标尺跟随主题切换：MiniMap / CanvasRuler 是 Canvas 2D 绘制、原先调色板硬编码暗色（`#10141f`、`#151a28` 等），亮色主题下视觉破损。新增 `src/composables/useThemeCssVars.ts`（`readThemeVar` 读变量 + `useThemeTick` 经 MutationObserver 监听 `data-theme`），配色抽进 variables.scss 双主题变量（`--minimap-*` / `--ruler-*`），主题切换即重绘；顺带修复 MiniMap 的 ResizeObserver 未在卸载时断开
  - 实测：新增 `useThemeCssVars.test.ts` 3 用例（变量读取 / 缺失回退 / tick 递增与观察器断开）

- 预览页加载失败不再死路：原先 `loadPublishedProject` 失败仅弹一条 ElMessage 后 return，页面停在空白 HUD 无任何出路。现分 `loading / ready / failed` 三态——加载中显示转圈等待（远程存储有明确等待态），失败渲染错误占位页（工程名 + 原因提示 + 重试 / 返回首页 / 返回编辑器），重试复用同一加载函数

- 历史数据的保留期一直形同虚设，过期分片从没被删过一个
  - 动因：给 `server/lib/history.mjs` 补单测时，`cleanupExpiredShards` 的两条用例返回 0，顺着查出来的——不是测试写错，是这条清理链路从上线起就没起过作用
  - 根因：目录层级写死成一层。分片实际落在 `HISTORY_DIR/u/<userId>/`（命名空间 `scopeOf()` 带 `u/` 前缀），而旧实现 `readdir(historyRoot)` 只取到 `u` 这一个**目录名**，再列一层拿到的是用户目录名，`.(\d{8})\.jsonl$` 一个都匹配不上 → 每次返回 0。启动时那次与 24 小时的定时器都安静地空跑，既不报错也不打日志，历史文件只会无限增长
  - 修法：改成递归生成器 `iterShardFiles()` 遍历到任意深度，凡文件名尾部带 8 位日期段的 `.jsonl` 都算分片，日期用定长字符串比较（`YYYYMMDD` 字典序即时序），等于保留期边界当天的分片不删。符号链接的 `Dirent.isDirectory()` 为 false，递归不会成环
  - 实测：`history.test.ts` 3 条清理用例（跨用户目录、边界当天保留、保留期非正数不动）；真跑一次端到端——写入 9 天前与今天两个分片后用 `HISTORY_RETENTION_DAYS=1` 重启，只有旧分片被删除、今天的完好
  - 影响面：修好后第一次运行会把积压的过期分片删掉（默认保留 30 天）。数据目录里若存在人为命名成 `xxx.20200101.jsonl` 的文件会被一并清理

- 用户名带前后空格能建出重名账号，新账号从此登录不了
  - 动因：`auth.test.ts` 里按「`"  admin  "` 应判重名」写的用例如实失败，暴露出 `createUser` 的两步不一致：查重用**未 trim** 的原值比较，落库却存 `String(username).trim()`
  - 后果：`"  admin  "` 通过查重、存成 `admin`，账号表里出现两个同名用户；`login()` 按 `u.username === username` 取第一个匹配，后建的那个（角色可以完全不同）永远登不进去，管理员只会看到「建了个账号但登录进去是另一个角色」。`username: '   '` 同理能建出**空用户名**账号
  - 修法：入口处先 `trim` 成 `name`，校验非空、查重、落库、`displayName` 回落全部用这一个值
  - 实测：`auth.test.ts` 两条用例；真跑 `POST /api/auth/users` 传 `"  admin  "` 返回 `400 {"error":"username exists"}`

- 原子写在同一目标上并发时**静默丢写**：临时文件撞名 + Windows rename 顶撞，而调用方把失败 catch 掉了
  - 动因：不是看出来的，是被一条不稳定的新用例逼出来的——会话摘要化之后 `auth.test.ts` 在全文件顺序下随机失败（单跑通过、纯 node 复现通过）。把 `persistSessions` 的 catch 临时改成打印 `stderr`，才拿到现场：`EPERM: operation not permitted, rename '..._sessions.json.<pid>.<ms>.tmp' -> '..._sessions.json'`。写没落地，而调用方认为「落盘失败不阻断登录」，于是丢的是一次无人知晓的写入
  - 三个独立成因，逐个补：
    - 临时文件名只按「pid + 毫秒」拼。`Date.now()` 是毫秒分辨率，两次并发登录落会话几乎必然同毫秒 → 同一个 `.tmp` 路径，先 rename 走的那次让另一次报 `ENOENT`。改法是加进程内自增序号
    - 同一目标并发 rename 在 Windows 上会顶撞：目标正被另一个句柄替换时返回 `EPERM`。实测本机 **2 路并发 × 25 轮命中约 16%**（30 路则 18/30 失败），POSIX 上不存在这个问题，所以只在 Windows 部署时随机掉数据。改法是同一目标路径的写**排队串行**（按绝对路径挂 Promise 链，排空即释放条目，不同目标仍并发）
    - 排队也躲不开「目标被别的句柄短暂占用」——杀软与索引服务在写完/读完的一瞬间抓着文件。这一类只能等，所以 rename 对 `EPERM`/`EBUSY` 做 `[10, 40, 120, 300]ms` 的**有界退避重试**，其余错误照抛
  - 波及面：`_users.json`、`_sessions.json`、`_notify.json`、KV 存储的每个 key 文件都走这个函数。账号表写失败会返回 500（可见），会话与审计写失败是 catch 掉的（不可见）——后者才是这条的主因
  - 实测：新增 `server/lib/atomicWrite.test.ts` 4 用例（20 路并发同目标全部成功且落盘是某一份完整内容、连续覆盖最后生效、一次写失败不卡死队列也不留临时文件、不同目标并发互不干扰）；改前脚本复现 2/4/8/16 路并发分别失败 8/21/58/114 次，改后同为 30 路并发失败 0；`auth.test.ts` 由「5 轮里 2 轮随机失败」变成连跑 5 轮全绿
  - 未处理：跨进程的写竞争（两个 `node server/index.mjs` 指同一 `DATA_DIR`）不在本条范围内，那属于部署错误，加固清单里已有「5174 只对本机或内网开放」

- 标题一 / 标题二拖入画布一片空白（连带按钮、背景一、背景2、磁选机）：导入脚本把 `<defs>` 里的 id 删光了，图元的可见部分全靠这些 id
  - 动因（用户反馈）：装饰分组的标题一、标题二拖到画布上「啥也没有」，连选中框里也是空的
  - 根因：`scripts/import-subunit-assets.mjs` 的净化第 1 步是 `replace(/\s+id="[^"]*"/g, '')`，而 Sketch 导出的 `<linearGradient id="linearGradient-1">` 和纯装饰的图层名 `<g id="图标">` 用的是同一个属性——两者被一起删了。`fill="url(#linearGradient-1)"` 于是指向不存在的 paint server，浏览器解析不出即当作 **none**，图元整张透明，控制台一声不响
  - 为什么只有 decor（装饰）组暴露：标题一 / 标题二的可见部分**全是渐变**，没有任何实色描边兜底；按钮与背景一 / 背景2 还剩一圈实色描边，看着是「很淡的线框」而不是「丢了东西」，一直没被当成 bug 报上来
  - 顺着同一条线又查出两个同源故障，都是「id 处理」这一处的漏网写法：
    - **磁选机**（`wash_magnetic_separator`）的 mask 靠 `<use href="#path-1">` 拼出通版，`url(#x)` 之外的第二种引用写法当年不在考虑范围内，id 照删 → `<use>` 落空 → mask 变空 → 整台设备被完全裁掉，同样是「画布上啥也没有」
    - 那个 `path-1` 本身还是个只带 opacity、没有实色 fill 的 rect，正好命中第 2 步「隐形底衬矩形」的剥离条件，一同被删——所以**保留 id 之前必须先算清谁在被引用**，否则加了白名单也救不回来
    - `xlink:href` 依赖命名空间声明，而第 1 步刚把 `xmlns:xlink` 删了：文档没有这个前缀的绑定，浏览器不认这个属性。统一转成不需要命名空间的 SVG2 `href`
  - 修法（`scripts/subunit-svg.mjs`）：新增 `referencedIds()` 收集 `url(#x)` / `href="#x"` / `xlink:href="#x"` 三种引用；`normalizeIds()` 只删无人引用的 id，被引用的统一加 `<type>-` 前缀（组件面板用 `v-html` 把多张图标注入同一文档，同名 id 只有第一个生效）；`stripInvisiblePlates(svg, keepIds)` 跳过被 `<use>` 拼进 mask 的元素；`validateSvg()` 补**悬空引用自检**——这次的三处故障全都能被这一条拦住
  - 顺带拆分：本次把纯函数层抽到 `scripts/subunit-svg.mjs`（157 行），主脚本从 413 行落回 316 行——跨过 400 行门槛就必须当次处理，与当年拆 `subunit-preview.mjs` 同一手法
  - 重新生成 `src/industrial/deco/`（11 图元，5 行变化）与 `src/industrial/wash/`（17 图元，1 行变化 + 过期的文件头注释）。其余 5 个分组的源文件不涉及 paint server，`--scan` 全量 264 个 SVG 零悬空、不可见底衬剥离数仍是 123（说明 keepIds 没有松开口子）
  - 实测（headless Chrome，把每个图元按管线渲染到 canvas 数非透明像素）：标题一 0 → 0.90、标题二 0 → 0.60、按钮 0.124 → 0.916、背景一 0.031 → 0.992、磁选机 0 → 0.28（它是纯线条稿，正常只剩描边）；几何不变——把渐变临时替换为实色对照，覆盖率与修复后一致，证明是 paint 失效而非内容缺失

### 安全

- 种子口令的文档与部署示例仍写死 `admin123`，照做的全新部署必然登录失败
  - 动因：`server/auth.mjs` 的种子口令早已改为随机生成（0.0.5 的对应条目），但三处说明没跟上——DEPLOY §5.4 的账号表按「每账号一个口令」列了 `admin123`/`engineer123`/`operator123`/`viewer123`（实际四账号**共用**一个随机口令）、§3.1 的 curl 示例直接写死 `admin123`、USER_GUIDE 账号表同样带口令列。本机之所以还能登，是因为 `server/data/_users.json` 是改造前种的，属存量巧合，不代表文档正确
  - 改法：§5.4 改为「共用随机口令 + 只在首启日志打印一次 + `SEED_PASSWORD` 可预先固定 + 日志丢失时删 `_users.json` 重新播种」；§3.1 curl 用 `<初始口令>` 占位并注明取值来源；§6 加固清单补上「共用口令必须逐个改」的理由（任一账号泄露即四账号全泄露）；USER_GUIDE 账号表去掉口令列，并说明登录必须连后端（`authStore.login` 只打 `/api/auth/login`，没有离线登录路径）
  - 「删表重新播种不丢工程」这条已核对成立：种子 id 固定为 `usr_seed_0..3`，数据按 `u/<userId>/` 命名空间存放，重新播种后 id 不变
  - 顺带补齐 §5.2 后端环境变量表缺失的 5 项：`HOST`、`SEED_PASSWORD`、`NOTIFY_ALLOW_PRIVATE`、`NOTIFY_TIMEOUT_MS`、`SMTP_REJECT_UNAUTHORIZED`。默认值逐个读码核对（`server/index.mjs:56`、`server/auth.mjs:147`、`server/notify/common.mjs:58-61`、`server/notify/email.mjs:11`），未照抄 `.env.example` 注释
  - 未动的代码：`src/auth/seedUsers.ts` 与登录页「演示账号（点击填入）」仍展示 `admin123` 等口令，其头注释还声称「与 server/auth.mjs 首次启动写入的账号一致」——这是 UI 行为改动（要定「只填用户名」还是「整块撤掉」），留待确认口径

- 会话令牌不再明文落盘：`_sessions.json` 只存 SHA-256 摘要，内存 Map 也改以摘要为键
  - 动因：`_sessions.json` 里存的是**活跃登录态的原始令牌**，TTL 12 小时内一直可用。谁读到数据目录就等于拿到全部在线账号的登录凭证——备份、容器日志、误传的 `data/`、一次误加的 `git add` 都算「读到」，而不需要任何口令。同目录的 `_users.json` 早就做到只存 `salt:hash`，会话这一侧是明显的不对称
  - 改法：签发时仍返回随机令牌（`login` 响应是它唯一一次以明文出现），服务端各处只持有 `sessionKey(token) = SHA-256(token)`；每次请求对带来的令牌现算一次摘要再查表。口令用 scrypt 是为了抗爆破，令牌是 192 位随机值、搜索空间已经够大，摘要只需**抗原像**，慢哈希反而白付一次登录延迟
  - 旧文件的处置是**不迁移、不沿用**：识别到旧格式（有 `token`、无 `tokenHash`）时那些会话一律作废——它们已经以明文在磁盘上待过，无法证明没被读过，继续认等于把「加固」让位给「少一次登录」。同时 `init()` 当场把文件改写成摘要格式，不等下一次登录/注销，否则升级完明文还要一直躺到有人登录为止
  - 影响面（需告知在线用户）：**升级到本版本后所有既有会话失效，所有人重新登录一次**；已写入 [docs/DEPLOY.md](docs/DEPLOY.md) §5.5。备份数据目录不再等于备份出一批可用凭证，这条也写进了同节
  - 连带修出一处：`resolveToken()` 判过期后原来是 `sessions.delete(token)`，键换成摘要之后这行**等于没删**——过期会话留在内存并随下次登录写回磁盘。改为删摘要键，判据做成用例：过期后先 `resolveToken` 再 `logout(token)`，若删除生效应报 `false`
  - 顺手拆分（本次改动把 `server/auth.mjs` 从 387 行推到 411 行，越过 400 阈值，按 AGENTS.md 当次拆完）：密码学原语 → `server/lib/credentials.mjs`，登录失败限流 → `server/lib/loginGuard.mjs`（`createLoginGuard({ maxFails, lockMs })`，`isLocked/noteFail/clear` 三个动作，行为逐字保持），`auth.mjs` 落回 345 行。`ROLE_RANK` / `roleAtLeast` / `createAuthStore` 的导出面不变，五个路由的 import 无需改动
  - 实测：`auth.test.ts` 新增 3 用例（磁盘只见 `tokenHash` 且等于手算摘要、无 `token` 字段、注销后文件回到 `[]`；旧明文条目不迁移且启动即改写；过期即删）；新拆两模块各配同目录测试 `credentials.test.ts` 6 用例（`salt:hash` 格式、同口令不同盐、畸形存储一律 false、摘要稳定且不含原文）、`loginGuard.test.ts` 4 用例（第 5 次才锁、两维任一命中即锁、锁定过期后计数从头攒——即 `until=0` 那个易改错的分支、`clear` 只清指定维度）；`pnpm typecheck:server` 通过（拆分后 `tsc` 是唯一覆盖服务端 `.mjs` 的把关）
  - 真跑（`PORT=5199` + 临时 `DATA_DIR`，与本机 5173/5174 的实例错开）：预置一份旧明文会话文件后启动 → 文件立刻变成 `[]`；登录 → 磁盘只有 `tokenHash` 且与手工 `SHA-256` 逐字节相等、不含明文；重启进程 → 同一令牌 `GET /api/storage/get` 仍 200、缺令牌 401（会话恢复可用）；`logout` → 文件回到 `[]`、同令牌转 401。临时进程与数据目录已停、已清

### 测试

- 存储后端第一次有单测：5 个文件 64 用例，覆盖路径隔离、账号与会话、HTTP 门禁、时序分片与 JSONL
  - 动因：`server/**` 是 2135 行、承担登录与全部工程数据读写的服务，仓库里却一个测试文件都没有——唯一把关是 `pnpm typecheck:server`，而类型自洽挡不住路径拼接、限流窗口、保留期这类行为错误。上面两条修复就是补测过程中直接撞出来的，不是先修再补测
  - 覆盖清单：
    - `server/lib/kv.test.ts` 12 用例——`scopeOf` 的三个命名空间、用户 id 里的 `/` 被编码后逃不出自己的目录；`keyError` 挡 NUL 与「**编码后**长度」上限（一个汉字膨胀 9 倍，只看原始长度挡不住 `ENAMETOOLONG` 变 500）；`../` 注入落不回 dataDir 之外、`..` 因固定 `.json` 后缀只会得到同目录怪文件名；跨用户同名 key 互不可见；原子写不留过程文件
    - `server/auth.test.ts` 20 用例——角色等级序、种子四账号、`_users.json` 只有 `salt:hash` 且不含明文口令、同口令不同盐、令牌签发/注销/12 小时到期、重启恢复未过期会话并丢弃过期项、会话文件损坏按空处理、**按用户名与按来源两维限流**（锁定期内口令正确也拒绝、过期后放行且不影响已签发会话）、最后一名管理员不可降级或删除、改口令后旧口令立即失效、账号表落盘重启仍在
    - `server/lib/http.test.ts` 12 用例——`CORS_ORIGIN=*` 与白名单两种回显（未命中来源拿不到自己的域名）、`Bearer` 前缀大小写敏感、分块请求体先拼接再解码（跨块的中文不解成乱码）、超限抛 413 且边界是「超过」不是「达到」、主密钥/会话/无令牌三条鉴权支路、`requireRole` 对未登录与降级判死
    - `server/lib/history.test.ts` 13 用例——`dayString` 补零、跨天各写一个分片、非法点跳过、闭区间与按日期挑文件、乱序读出仍升序且损坏行不牵连其余、`maxPoints` 抽稀保首尾、`min/avg/max` 窗口按 epoch 对齐、三种非法聚合参数（未知 agg / 窗口 <1s / 窗口 >24h）回落成普通查询、保留期清理三条
    - `server/lib/jsonl.test.ts` 7 用例——新→旧排序、limit 截尾、单行损坏跳过、末行无换行符也算一条、`cap` 截断不留半截行、中文与嵌套对象原样往返
  - 接线：`vitest.config.ts` 的 `include` 补 `server/**/*.{test,spec}.{js,ts}`。测试沿用 `shared/` 的既有写法——被测是 `.mjs`、测试写 `.test.ts`：这样 `tsconfig.server.json`（`include` 只收 `.mjs`）不会被测试文件牵进来，前端那套 `strict` 也不会去判服务端
  - 两处环境要点：① 全局 `environment` 是 jsdom，这 5 个文件各自声明 `// @vitest-environment node`，`fs` / `crypto` 走真实实现；② 假时钟一律 `vi.useFakeTimers({ toFake: ['Date'] })` **只冻时间**——把 timer 一起接管会让 `fs` 的 Promise 也跟着假时钟走，测到的是沙箱不是代码。scrypt 让 `auth.test.ts` 单文件耗时 5 秒多，属预期成本
  - 实测：全量 62 测试文件 / 575 用例零失败（`--reporter=verbose` 的逐文件清单与 `find src examples shared scripts server -name "*.test.ts"` 得到的 62 个一致，汇总无 `Errors`）；`tsc -p tsconfig.server.json`、改动文件 `eslint`、`pnpm build`、`check-long-files.ps1` 全过。另以 `PORT=5199` + 临时 `DATA_DIR` 真跑一遍后端（health / 登录 / 存储读写 / 历史写入与两种查询 / 无令牌 401 / 重名账号 400 / 重启触发保留期清理），临时进程与数据目录已停、已清

- `src/notify/notify.test.ts` 补 `afterEach` 删除临时目录：`beforeEach` 每个用例 `mkdtemp` 一次却从不回收，本机系统临时目录里已堆了 72 个 `scada-notify-*`。清理后单文件 6 用例仍全过、跑完不留目录

- 会话摘要化与原子写这一轮再加 4 个文件 / 17 用例：`server/lib/atomicWrite.test.ts` 4、`server/lib/credentials.test.ts` 6、`server/lib/loginGuard.test.ts` 4、`server/auth.test.ts` 3
  - `atomicWrite.test.ts` 是本轮最值钱的四个：20 路并发写同一目标全部成功、落盘内容是某一份**完整** payload（拼接残片会让 `_users.json` 解析失败）、一次写失败不卡死后续队列也不留临时文件。上面那条修复的三种失败模式里，前两种只有在这个文件里才测得到
  - `credentials` / `loginGuard` 两个文件是拆分带出来的：限流那条「锁定过期后计数从头攒」直接对着 `until=0` 这个易改错的分支写，将来谁把注释里的判断简化掉就会红
  - `auth.test.ts` 由 20 用例增至 26（会话摘要 2 + 过期即删 1，另把「重启恢复」用例里手造的会话文件改成摘要格式）。上一轮那条「5 个文件 64 用例」的记录保持原样，改动只在本节追加
  - 环境要点补一条：`loginGuard` 用 `createLoginGuard({ maxFails, lockMs })` 注入短窗口，就不必为了测锁定过期而 `vi.advanceTimers`——`toFake: ['Date']` 只冻时钟的老约束继续适用，`atomicWrite` 的退避重试也因此走的是真实等待（单文件 0.5 秒级）
  - 实测：全量 **65 测试文件 / 592 用例**零失败，汇总无 `Errors`；`--reporter=verbose` 的逐文件清单与 `find src examples shared scripts server -name "*.test.ts"` 的 65 个逐一比对一致（本轮一次跑全，未补跑）；`pnpm typecheck:server`、改动文件 `eslint`、`pnpm build`、`check-long-files.ps1`（`OK: 所有文件均在阈值以内`，例外跳过 46 个 `src/industrial/*`）全过

### 重构与清理

- 基础组件删除阀门与泵，常用图形与信息类组件前置到面板最前
  - 动因：① 阀门/泵与行业分组重复——水处理分组已有 `water_pump` / `water_valve` 等泵阀素材图元，基础库里再放一份稀释了「基础」的定位；② 基础 Tab 原先把设备类（储罐/设定值/数值显示/图片）压在图形与日期时间前面，而组态场景里最高频的恰是矩形/圆/线与日期/时间/视频/网页/文字/超文本
  - 删除 `basic/index.ts` 的 `ValveDefinition` / `PumpDefinition`（`valve` / `pump` 不再注册）。画布上已放置实例按未注册类型退化为默认样式，不报错；`overlayTypes.ts` 等按 type 分发的链路与这两个类型无关，无波及
  - 面板顺序改为在 `ComponentPanel.vue` 显式编排（注册顺序即面板顺序）：7 个基础图形 → 日期/时间/视频/网页 → 文字 → 超文本 → 设备类（储罐/设定值/操作按钮/数值显示/图片）。`basicComponents` 收敛为设备类，图形改由面板从 `basic/shapes` 引入编排；widget 的 5 个 basic 分组挂件随编排前置，`widgetComponents` 整体仍在原位注册（同 key 重复注册只覆盖值、不改位置）
  - 文档同步：README 组件表更新基础组件清单；USER_GUIDE 状态规则示例去掉阀门；示例工程 `demo-project.json` 的 `el_demo_pump` / `el_demo_valve` 换用 `water_pump` / `water_valve`（同为水泵房场景），避免删除定义后示例图元退化
  - 实测：全量 54 测试文件 / 492 用例零失败（`--reporter=verbose` 逐文件与磁盘清单一致；沙箱前两轮分别拦掉 StatusEngine / alarmStore，两个文件在另一轮均跑过）；`pnpm build`（含 vue-tsc）通过

### 文档

- README 对齐仓库现状（命令、目录树、架构图、组件开发指南），并纠 AGENTS.md 一处过期步骤
  - 动因：README 的硬数字其实一直是对的（实测 `getAllComponents()` = 177 种 / 14 个分组，Mock `listDevices()` = 22 台），坏的是命令与结构——新用户照 README 起不了存储后端、会把 `pnpm test` 当单次运行、按目录树找不到 `server/`；已实现的多画面、点表、报警外发、账号权限在 README 里一个字没有，全在 USER_GUIDE 里
  - 快速开始补 `pnpm server`（不起则自动回落 localStorage，改代理或 server 路由需重启 dev）与 `pnpm lint` / `pnpm typecheck:server`；测试段改成 `npx vitest run` 打头并注明 `pnpm test` = `vitest` 是 watch 会挂终端——原段把 `pnpm test` 注成「运行测试」，还与 `pnpm test:watch`（`vitest --watch`）重复列了两条 watch
  - 项目结构整段重写：根级补 `server/`（lib / routes / notify / data）、`shared/`、`examples/`、`scripts/`、`design/`、Docker 三件套与 `eslint.config.js`；`src/` 补 `alarm/ auth/ composables/ export/ history/ notify/ storage/` 与 `views/login/`；`core/` 删掉早已不存在的 `layer/ drag/`（逻辑在 `core/canvas/` 的 composable 与 `stores/layerStore.ts`）；`industrial/` 由 3 个子目录改为 14 个分组目录 + `registry.ts` / `panelRegistry.ts`
  - 两张架构图纠偏：数据源层补第 5 个框 MQTT（功能列表早已列 ✅，图里漏）；数据层「存储适配器 = JSON文件 / LocalStorage / **数据库**」改为 Remote(后端) / LocalStorage / 内存降级——数据库从未实现；同格组件注册表由 `basic/* pipeline/* electrical/*` 改为 `industrial/* panelRegistry custom/*`
  - 功能特性补六节：多画面与工程管理、点表与历史与写值、报警与通知、账号与权限（四级角色 `viewer / operator / engineer / admin` + 审计）、自定义组件与设备模板；顶部文档地图补 `2.5D_ILLUSTRATION_GUIDE.md`，并把 AGENTS.md 从纯文本改成可点链接
  - 组件开发指南按真实接法重写为四步（定义 → `panelRegistry` 汇总注册 → Mock 设备 → 同步文档），补自定义组件/设备模板这条「不写代码」路径（`customLibrary.ts` 键 `scada_custom_components`、`templateLibrary.ts` 键 `scada_device_templates`，与工程数据解耦）——原示例只给一个 `registerComponent()` 单文件调用，照它做不进面板
  - 同因纠 `agents.md`「新增工业组件」第 3 步：注册数据层早已从 `ComponentPanel.vue` 拆到 `src/industrial/panelRegistry.ts`（该文件头注释写明缘由），旧文会把人支去改 UI 文件
  - 实测：分组数与组件数用临时 vitest 脚本跑出（跑完已回收，工作区无残留）；全量 `npx vitest run` 65 文件 / 592 用例零失败且汇总无 `Errors`（磁盘清单 57 + `server/` 8 逐文件比对一致）；`pnpm build` 28.4s 通过（chunk 体积告警为既有）；`check-long-files.ps1` 报 OK，跳过 `src/industrial/*` 46 个豁免文件

- README 二轮收口：交互流程图压成事件链、环境要求补下限依据
  - 动因：上轮按商定范围留下了两处——4 张 ASCII 交互时序图（占全篇约 1/4，信息密度低且「保存到 localStorage」已被「登录后写远程」取代），以及 `pnpm >= 8` 与仓库实际不符
  - `## 交互流程图` 整节（4 图约 144 行）替换为 `## 交互流程` 四条事件链（8 行）：拖入组件 / 配置状态规则 / 连线 / 预览，图形化的界面细节统一指向 USER_GUIDE §5 不重复；预览一条改为「后端在线写远程，否则回落 localStorage」
  - 运行时数据流首框「模拟数据 / WebSocket」改为「任一数据源推送」并在图下补一行枚举五源，与上轮改过的数据源层图（已含 MQTT）对齐
  - 环境要求 `pnpm >= 8` → `>= 9，推荐 10/11`：`pnpm-lock.yaml` 是 `lockfileVersion: 9.0`，pnpm 8 读不了会当没有锁文件、把锁重写成旧格式；镜像固定 `corepack prepare pnpm@11`。**Node 下限保留 18**——实测 `vite@5.4.21` / `vitest@1.6.1` 的 engines 为 `^18.0.0 || >=20.0.0`，Docker 用 node:20 是镜像选择不是下限，不要顺手也跟着改
  - 删整节的落法：新片段先用 write 工具落成临时 `.md`，再用 node 按行切片重写 README——中文不经 shell 命令行，避开 MSYS 转码；临时文件走回收站回收
  - 实测：README 628 → 494 行；围栏配对无未闭合、旧节标题与子标题零残留（按码点校验，不看控制台渲染）；`check-long-files.ps1` 仍报 OK（README 属文档，不在行数约束内）；本轮只动 `.md`，`vitest` / `pnpm build` 沿用上轮全绿结果未重跑

- README 三轮补漏：渲染风格、分组注册步骤、短信渠道与两处口径
  - 动因：上两轮把命令、目录树、架构图、组件表对齐之后，仍有一整类用户可见能力在 README 与 USER_GUIDE 里都是零字——2D / 2.5D 渲染风格；另有两处描述照着做会卡住或与实际不符
  - 功能特性「可视化编辑」补渲染风格一条：`2d` 平面线条稿 / `25d` 开启面基光照，工具栏切换、属工程级设置随工程保存、预览页只读跟随；**改风格后须发布才在运行端生效**——`src/views/preview/index.vue` 默认走 `loadPublishedProject()`，只用 `?source=draft` 才读工作副本，这是「预览默认读发布版」引出的第一个用户可见坑，此前文档未提
  - 运行时数据流图「Konva 画布渲染」框补一行着色来源；ASCII 图按**显示宽度**对齐插入（中文计 2 宽），新行与锚点行同为 78 宽
  - 组件开发指南第 2 步改准：新增分组由「补 `BASIC_GROUPS` / `INDUSTRY_GROUPS` 与 `groupNames`」改为动三处——`src/types/scada.ts` 的 `ComponentGroup` union（类型源头，漏了 `group` 字面量直接过不了 `vue-tsc`，旧文完全没提）、`panelRegistry.ts` 的两组 Tab 常量、同文件的 `groupNames`（**私有 const，只经 `getGroupName()` 暴露**，旧文写得像能直接补导出）
  - 报警外发渠道补短信（`server/notify/sms.mjs` 早已存在，原列邮件 / Webhook / 企业 IM 三项）；MQTT 写值主题由 `<设备>/set` 改为 `<前缀>/<设备>/set`（与 `MqttAdapter.ts` 的 `${prefix}${deviceId}/set` 一致，USER_GUIDE 原本就是对的）；项目结构 `composables/` 注释补「最常使用」（`usageLibrary.ts`）
  - 未改且复核仍准确：组件表 14 行与「177 种 / 14 分组」、Mock「22 台」、命令段——实测 `getAllComponents()` = 177 / 14 分组（basic18 general13 pipeline1 electrical24 coal16 power5 chemical2 water29 transport5 ventilation6 wash17 thermal22 deco11 chart8），`listDevices()` = 22
  - 遗留（本次范围只到 README）：`docs/USER_GUIDE.md` 同样没有渲染风格与「预览默认读发布版」的说明，需单独补
  - 实测：README 494 → 495 行；`git diff --numstat` 仅 README 6 增 4 删；行尾 CRLF 495 条、LF-only 0（脚本按原行尾 join 回去，未做 LF 归一）；组件数用临时 vitest 脚本跑出后回收，工作区无残留

- USER_GUIDE 补「发布 / 预览读发布版」与渲染风格（上一条登记的遗留）
  - 动因：补 README 时发现同一口径在使用说明书里缺得更彻底——整篇搜不到「发布」二字（`grep 发布` 只命中 7.5 节 MQTT 写值主题），而**预览默认读发布版**恰恰是使用者最容易踩的坑：保存之后预览画面纹丝不动
  - 「3. 界面总览 → 预览模式」改写为四条：默认显示发布版且**保存不更新预览**、未发布过时自动回落工作副本、`/preview?project=工程名&source=draft` 读工作副本、渲染风格只读跟随（另指向 5.10）
  - 新增「5.10 渲染风格（2D / 2.5D）」：两档含义（平面线条稿 / 面基光照）、工程级设置随工程保存且所有画面共用、预览与运行端只读跟随、改完须发布；**只对按面基规范绘制的图元有明显变化**，纯线条稿两档外观一致——这是分批迁移的过渡状态，不是开关失灵
  - 「8. 项目管理」补「发布」条目，并把保存一条改为「保存工作副本（接入后端时写远程，否则 localStorage）」以拉开保存与发布的差别；编辑器工具栏表格补 2D/2.5D 与发布；「4. 五分钟上手」第 5 步点明预览默认发布版
  - FAQ 补两问：Q6「预览里看不到我刚改的东西」（发布过一次后只保存不发布就不再变）、Q7「切到 2.5D 画面没什么变化」（只差着色、几何完全相同，仅面基图元有差异）
  - 实测：USER_GUIDE 340 → 359 行；章节编号连续（5.1~5.10，无跳号）；`git diff --numstat` 仅该文件 22 增 3 删；行尾 CRLF 359 条、LF-only 0；本轮只动 .md，未重跑 vitest / build（沿用上轮全绿结果）
  - **同因纠 README「交互流程 → 预览」一条**：原文写「编辑器保存 → 跳 `/preview?project=` → 预览页加载工程」，与「预览默认读发布版」冲突——上轮补功能特性时漏改这条。现改为「保存 → 发布快照 → 预览（默认发布版 / 无发布版回落工作副本 / `?source=draft` 读工作副本）→ 建连 → 只读渲染（渲染风格随工程只读跟随）」

- 四份文档顶部互相索引与口径对齐
  - 动因：README 顶部列了四份文档，但各自顶部的索引形态与内容并不对齐——AGENTS.md 那条把链接塞进加粗里（`🤖 **[AGENTS.md](AGENTS.md)**`），与前三行「**名称**：链接」不是一个结构；2.5D 规范的相关文档是纯代码串、点不开且不指回 README；AGENTS.md 的数据源清单漏 MQTT（README 与 USER_GUIDE 都列五源）
  - README 顶部四行统一为「emoji + **名称**：链接 —— 一句话定位」，AGENTS.md 一条改为「**代理工作指南**：[AGENTS.md](AGENTS.md)」，并在其后补一句中枢声明：四份文档互相索引、跨文档口径以 README 为准
  - AGENTS.md 数据源清单补 MQTT；文档地图补 `UI_DESIGN_GUIDE.md`（历史 UI 设计稿，2.5D 规范引用了它，此前地图里查不到）
  - 2.5D 规范顶部相关文档改可点链接，并把 README 放在第一项作为中枢
  - 未动 USER_GUIDE / DEPLOY 的顶部索引：两者已回指 README，且按受众裁剪——使用者手册不指图元规范、部署指南不指 AGENTS，硬凑成同一份全量清单反而误导
  - 实测：四处改动全是 .md；相对路径逐个核对（`docs/` 下用 `../README.md` `../AGENTS.md` `../UI_DESIGN_GUIDE.md` `./USER_GUIDE.md`）；四份文档顶部现在都回指 README，中枢声明成立

- README 顶部文档块四轮收口：修渲染折叠 + 把「互相索引」改口
  - 动因：上一条的判据只核了「四份都回指 README」，没核渲染结果与反向引用，用户对着渲染截图一问就露出两处：① 顶部四行各自独占一个 `>` 行，但 Markdown 软换行会被折叠，实际渲染成一整段连续文字（GitHub 与本地预览器同样如此）；② 中枢声明写「四份文档互相索引」，实测引用矩阵并不成立
  - 换行修法：条目之间插空 `>` 行（各成一段），**不用**行尾补两个空格——行尾空格会被编辑器与格式化工具静默剥掉，是同一 bug 的复发源
  - 引用矩阵实测（`grep -c` 逐份统计）：USER_GUIDE 缺 AGENTS、DEPLOY 缺 2.5D 与 AGENTS、2.5D 缺 DEPLOY、UI_DESIGN_GUIDE 谁都不回指；只有 AGENTS.md 是全量地图（五条）。而 README 目录树与 AGENTS 文档地图都把 `UI_DESIGN_GUIDE.md` 算作一份，「四份」这个数目本身也在两处对不上
  - 声明改口为「四份文档顶部**均回指本文件**，跨文档口径以 README 为准；各文档按受众裁剪、不做强行互指，完整文档地图见 AGENTS.md 开头」——只宣称实测成立的那一条，并把全量地图的归属显式交给 AGENTS.md
  - 未动 USER_GUIDE / DEPLOY 的顶部索引：上一条「按受众裁剪」的决定保留，本轮改的是 README 别再说谎，而不是把五份硬凑成对称
  - 实测：README 497 → 500 行；行尾 500 条全 CRLF、bare-LF 0（Edit 未引入混合行尾）；本轮只动 .md，未重跑 vitest / build（沿用上上轮全绿结果）

- README 组件表改项目符号列表：修「分组」列被压成逐字竖排
  - 动因：用户截图实测——三列表的 `分组` 列渲染成一字宽、每字一行。根因不是表格语法而是列宽分配：`组件` 列最长单元格有 22 个名字（期望宽度约 50 字），而中文可逐字断行，`分组` 列的**最小内容宽度只有 1 个字**，自动布局把剩余空间几乎全给第二列。GitHub 上表现为横向滚动，窄容器与本地预览器直接压扁。`&nbsp;` 撑宽、`<th width>` 一类补救不可靠（GitHub 会剥掉 style/width 属性），且没解决「一列塞 20+ 名字」这个前提本身
  - 三列表（16 行）改为 14 条项目符号列表 `- **分组名（数量）** 组件枚举 —— 说明`：列表在任意宽度下正常折行；组件名与说明文字逐字保留，不砍清单换「详见 USER_GUIDE」
  - 数量写进正文并补取法：上一句「14 个分组、177 种」与每条括号数字同源于 `getAllComponents()` 按 `group` 分组统计，**括号数字相加 = 177** 成为自校验，下次核对不必重新考古
  - `电气组件` 一条补「变电1~13 是 13 个独立组件，故列出 12 项对应 24 种」——原表格用 12 个 token 代表 24 种，没有任何解释，读者只会以为数字对不上
  - 实测：分组计数走临时 vitest 脚本（`src/industrial/zz-tmp-group-count.test.ts`，结果写 JSON 文件再读，避开控制台中文乱码），得 177 种 / 14 组，分布 basic18 general13 pipeline1 electrical24 coal16 power5 chemical2 water29 transport5 ventilation6 wash17 thermal22 deco11 chart8，与三轮前记录逐组一致、无漂移；再用临时脚本把 README 列表逐组与注册表 `name` 比对，14 组全部「缺 0 多 0」且标称数量 = 注册数量；渲染走 `npx marked@12`，组件库小节 `<table>` 0 个、`<li>` 14 个，围栏 28 行配对、围栏外无残留 `|` 行（README 现在没有真表格，100 条 `|` 行全在 ASCII 架构图围栏内）
  - 遗留（同一 bug 的其他现场，本轮范围外）：`docs/USER_GUIDE.md` L82「编辑器 区域 | 位置 | 作用」表按同一判据（首列最宽 ≤ 6 字 且 整行 > 120 字）命中风险，其 `组件库` 行 255 字，窄容器下同样会压扁首列；DEPLOY / 2.5D 规范 / AGENTS 的表经扫描无风险
  - 实测：README 500 → 498 行；行尾 498 条全 CRLF、bare-LF 0；临时脚本与产物跑完全部回收，工作区无残留

## [0.0.5-261013] - 261013

### 功能

- 新增「操作按钮」组件：下发值配置期写死，运行期点击直接下发
  - 动因：库里原本就有个叫「按钮」的（`deco_button`），但它是外部素材导入的贴图，走 `state` 三态变色、点击不产生任何动作——名不副实。真正能下发指令的只有「设定值」，而它每次点击都要在弹窗里手输数值，拿来当启停 / 复位 / 模式切换很别扭
  - 新增 `command-button`（基础组件）：属性为按钮文字 / 字号 / 强调色 / 下发值 / 是否二次确认。下发值按点表 `dataType` 转换（`coerceTagValue`），布尔量放宽写法——`1/true/on/yes/开/启动` 都算真，不必为一个开关量去查「这里该填 1 还是 true」
  - 写值链路拆成两段共用：`prepareWrite()`（绑定 → 角色 → 写值锁 → 点表只读 / 未登记策略）与 `commitWrite()`（量程 → 二次确认 → 下发 → 审计）。`promptWriteValue`（设定值）与 `writePresetValue`（按钮）各走一遍——**按钮只是省掉「按类型输入」这一环，不是绕过关卡的捷径**
  - 渲染走 Konva 原生（`CommandButtonNode.vue`，编辑器与预览共用）：圆角矩形 + 居中指令文字，按下态换更实的填充。按钮是「纯图形」形态的例外——没有可点击的实体形状就等于一个隐形热点；填充用中性半透明灰避免与状态色抢语义，颜色语义仍交给描边与文字（未配强调色时跟随状态色）
  - 能力裁剪：`navigate` / `nameLabel` / `valueLabel` 关——点击语义已被写值占用（再允许跳转只能靠优先级硬判，配了导航的按钮就成了哑的），按钮面上已写着指令名，再补名称条或实时值是重复信息
  - 实测：新增 `commandButtonConfig` 7 用例与 `coerceTagValue` 5 用例（三类转换、无法识别返回 null 而非猜 false、转换结果能通过 `checkWriteAllowed`）；`vue-tsc --noEmit` 与 `pnpm build` 通过；全量 53 文件 / 485 用例零失败（json 报告与磁盘清单逐文件比对一致）

- 属性面板加占位提示与输入限制；预设补星期类组合（14 项）
  - 动因：用户指出三点——缺「2026-10-13 星期二」这类不带时刻的年月日+星期格式，以及「10月13日 周二 丙午年 九月初四」这种月日+周+农历快捷方式；自定义模板没有任何提示，别人不知道占位符怎么写；模板无输入限制，想输什么输什么
  - 预设新增 `ymd-week`（2026-10-13 星期二）与 `md-cn-week-lunar`（10月13日 周二 丙午年 九月初四），预设 id 只增不改、新项追加末尾
  - `PropertyDefinition` 新增可选 `placeholder` / `maxLength` / `hint`，`ElementGeometry.vue` 的 string 输入框透传（maxlength + 字数统计），hint 渲染为控件下方辅助小字——**所有组件的 string 属性都受益**，不只是模板
  - `customFormat` 配齐三项：placeholder 给示例（`如：YYYY年MM月DD日 HH:mm:ss EEEE`）、maxLength=64（面板限长 + 字数统计）、hint 列全部占位符与「留空用预设」口径
  - 运行时兜底：`normalizeTemplate()` 对模板去换行/制表、trim、截断到 64——防手改工程 JSON 或旧数据绕过面板限制（单行显示不允许折行）
  - 实测：format 20 用例 + lunar 9 用例全过（含换行剔除、超长截断、ymd-week、md-cn-week-lunar）；全量 51 文件 / 461 用例补跑凑齐零失败（沙箱再次掐断 alarmStore，json 报告比对出漏跑）；`vue-tsc` 与 `pnpm build` 通过

- 补齐日期时间挂件的星期与自由组合：新增「自定义模板」属性 + 2 项带星期预设（12 项）
  - 动因：上一条预设枚举盖不住真实诉求——「2026年10月13日 07:15:10 星期二 丙午年九月初四」这类多元素组合预设列不全，硬列就是组合爆炸；预设管快捷选择，模板管自由组合
  - 预设新增 `ymd-hms-week`（2026-10-13 07:15:10 星期二）与 `ymd-cn-hms`（2026年10月13日 07:15:10）
  - `customFormat`（date / clock 共用，非空优先于预设）：占位符 `YYYY MM DD HH hh mm ss A EEEE EEE L LL`，其余字符原样输出，如 `YYYY年MM月DD日 HH:mm:ss EEEE 农历LL`；`LL` 输出干支年+农历月日（丙午年九月初四），农历越界回退公历对应字段。**token 只增不改**（同预设 id 一样进工程数据）
  - `lunar.ts` 新增 `lunarYearGanZhi()`（(year-4) 对 10/12 取模，1984→甲子、2026→丙午 锚点已测）
  - 走针节奏：自定义模板按模板内最小占位符判断（含 `ss` 秒级 / 含 `HH|hh|mm` 分级 / 其余日级），`format` 与 `customFormat` 变化都会立即重排
  - 实测：format.test.ts 扩到 19 用例（全字段组合、12h 配 A、干支、越界回退、空模板、未知占位符字面输出、模板节奏），连同 lunar.test.ts 9 用例共 28 个全过；全量 51 文件 / 460 用例（本轮沙箱两次掐断 alarmStore，verbose 报告比对漏跑后补跑凑齐）零失败，`vue-tsc` 与 `pnpm build` 通过

- 日期 / 时间挂件支持显示格式预设：日期时间组合、24/12 小时制、月日 + 农历（10 项预设）
  - 动因：`date` 写死 `YYYY-MM-DD`、`clock` 写死 `HH:mm:ss`，单行「日期 + 时间」只能放两个组件并排手调对齐；12 小时制（英文界面）与「月日 + 农历」（班次/节庆大屏）无解。**刻意做成一个 `format` 预设下拉而非 8 个显示字段开关**——开关组合出 256 种状态、大量无意义，工业组态软件（组态王/MCGS/WinCC）的通行做法是格式预设
  - 新增 `src/industrial/widget/format.ts`：预设枚举（id 写进工程数据，只增不改）+ `formatDateTime()`（12 小时制强制带上午/下午标识，否则 07:15 与 19:15 无法区分）+ `nextTickDelay()`（走针频率按最小显示单位对齐：秒级 1s、分级对齐分钟跳变、日级最多 30s 补刷一次——原先 `date` 组件每秒重算纯属浪费）+ 非法 id 回退缺省（旧工程无 `format` 字段自动回落原行为，兼容零迁移）
  - 农历用**自实现数据表**而非 `Intl`：ICU 农历输出文案随版本漂移，small-icu 环境会静默回退成公历不报错。`src/utils/lunarTable.ts`（1900–2100，201 项，由一次性脚本从 Node 内置 ICU 离线导出后固化，运行时零依赖；脚本用完已删）+ `src/utils/lunar.ts` 换算（闰月/大小月/冬月腊月写法），越界返回空由调用方回退公历
  - `WidgetElement.vue`：`clockText` 接入格式化函数；固定 `setInterval(1000)` 改为按 `nextTickDelay` 的 `setTimeout` 链，`format` 切换立即重排；长格式加 `white-space: nowrap` 防换行撑乱布局
  - 实测：新增 `lunar.test.ts` 9 用例（含 1900–2100 约 1200 个抽样日与 ICU 中文日历逐日比对、闰月年/边界/越界）与 `format.test.ts` 10 用例全通过；`vue-tsc --noEmit` 与 `pnpm build` 通过

### 优化

- 名称条也按组件能力裁剪：挂件不再显示「时间」这类自明标签
  - 动因：新建元素默认 `showName: false`（`useCanvasDrop.ts`），名称条要手动打开才出现；一旦打开，时间组件下方就多一行「时间」，而正上方已经是 `07:15:08`——不增加任何信息。名称内容是 `element.name`，缺省即组件类型名，9 个挂件无一例外
  - **口径修正**：上一条把 capabilities 定为「只在 UI 层裁剪」，本条发现那样会留下死角——面板上的开关没了，旧数据里 `showName: true` 的挂件却仍在画标签，用户再也关不掉。故改为**UI 与运行时共同遵守**：`useElementVisuals` 新增 `wantsNameLabel()`，除 `isNameShown()` 外再校验 `capabilities.nameLabel`；`elementChrome` 保持纯函数不动
  - `valueLabel` 不需要同样处理：无绑定时 `getElementValueText()` 恒返回空串，`computeElementLayout` 本就不给它高度，屏蔽是自动发生的——这也是它只裁 UI 就够的原因
  - 变更：`ElementCapabilities` 增 `nameLabel`；`DATA_DRIVEN_CAPS` / `LOCAL_ONLY_CAPS` 都关掉它；`PropertyPanel` 的「显示」区在两个开关都不支持时整区不渲染（否则会剩一个只剩标题的空区）
  - 新增 `src/industrial/registry.test.ts`（6 用例）：缺省全开、未注册类型按全部支持（不把面板裁空）、显式关闭项逐字段核对，外加 9 个挂件的标注回归护栏——两条依据都不容易从代码表面看出来，以后新增挂件很容易漏标
  - 实测：`vue-tsc --noEmit` 与 `vite build` 通过；全量 **52 文件 / 467 用例**通过（本轮沙箱掐掉 expression / tag 两个文件，用 json 报告与磁盘清单比对后补跑凑齐）

- 属性面板按组件能力裁剪：挂件不再显示自己消费不了的数据绑定 / 状态规则 / 实时数值
  - 动因：`ComponentInstance` 是扁平单一接口，导航、绑定、状态规则对所有元素一视同仁（换来一套统一的渲染/交互/序列化管线），但属性面板此前没有按 type 裁剪，于是给「时间」这种组件也配齐了四项通用能力，其中三项它根本消费不了
  - 改前逐项追链路核实：① 画面导航对所有元素生效（`preview/index.vue` 的 `handleElementClick` 先判 `navigateTo`），保留；② 数据绑定在 date / clock 上属于**误导**——时间文本是 `new Date()` 本地时钟驱动（`WidgetElement.vue`），绑了也只会在元素顶部多一行别处的值，并不会驱动这个显示；③ 状态规则在全部 9 个挂件上**空转**——overlay 类型 Konva 不再画线，而 `getElementColor` 的使用面只有管道 / 文本 / 数值图元三类，挂件没有状态色的输出通道；④ 「显示实时数值」依赖绑定值，无绑定时布局本就不给它高度
  - 新增 `ElementCapabilities` 与 `ComponentDefinition.capabilities?`，**只在 UI 层裁剪：不动实例数据、不改运行时行为**，旧工程照常渲染。全字段缺省 true，既有上百个设备定义不必逐个标注；`registry.ts` 导出 `getElementCapabilities(type)` 负责缺省补全，并让未注册类型（自定义图元尚未加载）按全部支持处理，避免在报错边缘把面板裁空
  - 9 个挂件分两类标注：数据驱动型（进度条 / 报表 / 网格图 / 表格）保留数据绑定、关状态规则；本地驱动型（日期 / 时间 / 视频 / 网页 / 超文本）关数据绑定 + 实时数值 + 状态规则
  - 顺带删掉挂件定义里冗余的 `properties.name`：它与顶层 `element.name` 并存，但全仓无任何读取方，面板会据此渲染出第二个「名称」输入框，改它不产生任何效果
  - 未处理：Konva 侧画的名称条 / 实时值仍会被 overlay 的 DOM 层叠在下面（overlay 占满元素矩形、z-index 5），是否可见取决于挂件自身铺没铺背景——不是「必然无效」，故本轮不动。4 个 ECharts 图表类型（`CHART_TYPES`）与挂件同为 overlay，结论同样适用，本轮未纳入
  - 实测：`vue-tsc --noEmit` 与 `vite build` 通过；全量 **51 文件 / 461 用例**通过（verbose 那次沙箱 EPERM 掐掉 2 个文件，`testResults` 逐文件比对磁盘清单后才凑齐，数字以完整运行为准）

- 移除画布设备下方的接触阴影（阀门 / 泵 / 储罐 / 沉淀池 / 电机，共 5 处）
  - 那条阴影不是 2.5D 渲染层的产物，而是图标源码里作者画的 `<ellipse ... data-shadow="1"/>`，由 `faceLighting.expandResources()` 统一展开为 `SHADOW`（`fill="#000000" fill-opacity="0.42"`）；位置与尺寸按图元各自写死，所以各设备下方的椭圆并不相同。`bakeLighting()` 与 `flattenFaces()` 都走同一处理，2D 下同一条阴影也在（规范原话「投影是落地而非受光」）
  - **必须连椭圆一起删，不能只把 `SHADOW` 调透明**：`iconBounds.measure()` 用 `getBBox()` 测内容包围盒，椭圆即使画不出来也仍被计入，`tightenIconSvg()` 收紧后的 viewBox 继续包含阴影带，元素内图形仍按「含阴影」的矩形 contain（表现是设备本体偏上、底部空一截），布局偏差会原样保留
  - 删除后包围盒底部回收约 6~7 用户单位（阀门由 y≈85 收到 y≈78），viewBox 随之重新收紧，设备在元素内略微放大并落到图形区底部
  - 标注机制保留（`faceLighting.ts` 的 `SHADOW` 常量与展开规则不改），规范 §4.1 表格对应条目已标注「当前无图元使用」——与 `data-ground` 现状一致（定义在、无图元使用）；将来某台设备需要落地感，加回一行椭圆即可
  - 实测：改动为 3 文件 5 行删除（行尾保持纯 CRLF），`npx vitest run` 47 文件 / 405 用例全通过，`pnpm build`（vue-tsc + vite build）通过

### 修复

- 枚举属性存了非法值时面板会提示，不再「面板显原值、画面画默认」
  - 现象：工程 JSON 被手改、或由首页「导入 JSON」引入他方文件后，`format` 这类 select 属性可能存着不在 options 里的值（例如被写成 `2026-10-13` 这样的中文串）
  - 现状安全但不一致：渲染层两道防线（`formatDateTime` 与 `nextTickDelay` 都先 `isClockFormatId` 校验、非法退回默认）保证不崩、时钟也不停摆，但面板显示原值、画面按默认渲染，用户无从察觉那份配置压根没生效
  - 把上一条的 `withPropertyDefaults()` 扩为 `normalizeProperties(element, definition)`，返回 `{ values, notices }`：缺失补 default（属正常情况，不提示）；非法补 default 并记一条 notice。面板回显兜底值，控件下方显示警示色小字「原值「xxx」不在可选项中，已按默认显示」
  - **不做静默回显**：手改配置的人需要知道自己写错了什么，只换值不提示等于骗他说那个格式已经生效
  - 范围只覆盖 select（有取值域的类型）。数字的 min/max 故意不校验——`el-input-number` 交互时自带 clamp，而「字号 200」与「字号 24」的差别远小于提示噪音的代价；string 没有取值域，任何内容都不算非法
  - 缺失与非法两条都只改面板的本地副本，实例数据不动；用户改动任一项时才整份落盘
  - 用例扩到 10 条：原 6 条 + 非法回退并留提示 / 正常值不提示 / 数字越界不拦 / 字符串不算非法
  - 实测：`vue-tsc --noEmit` 与 `vite build` 通过；全量 **53 文件 / 489 用例**通过（沙箱掐掉 StatusEngine 一个文件，json 报告与磁盘清单比对后补跑凑齐）

- 属性面板不回显组件默认值：时间组件的「字号」「显示格式」此前是空的
  - 现象：拖入时间组件后面板「字号」输入框为空，而画面按 24 渲染；「显示格式」下拉也空着，实际按 `DEFAULT_CLOCK_FORMAT` 渲染。**面板显示的值与实际生效的值对不上**，容易被读成「还没设置」
  - 根因：`PropertyDefinition.default` **全仓没有任何消费方**（搜 `\.default\b` 唯一命中是无关的 `slots?.default?.()`）；新建元素的 `properties` 取自组件 `defaultConfig`，而 `widgetDef` 的 `defaultConfig` 是 `{}`——9 个挂件都没传初始配置，实例里根本没有 `fontSize` / `format` 键；`ElementGeometry` 直接 `v-model="properties[key]"`，`undefined` 就渲染成空白。渲染层另走 `prop(key, 默认值)` 兜底，两边口径就此分叉
  - 设备类组件看不出这个问题，是因为它们各自在 `defaultConfig` 里写了初始值；挂件这批没写
  - 修复：新增 `core/canvas/elementDefaults.ts` 的 `withPropertyDefaults(element, definition)`，`ElementGeometry` 打开元素时用它把缺失项补到**本地副本**——用户不动就不写回工程数据；改动任一项时 `handlePropertyChange` 才把整份落盘，届时默认值一并写入，无害
  - 边界：只把 `undefined` / `null` 当缺失；**空串保留**（用户在输入框里主动清空是明确意图，不该被立刻填回），`false` / `0` 同样视为有效值
  - 新增 `elementDefaults.test.ts` 6 用例：补默认值、不覆盖已有值、null 与空串的区分、false/0 不误判、不修改实例（返回副本）、未注册类型时原样兜底
  - 未处理：实例里存着**非法值**时（如手改工程 JSON 把 `format` 写成不存在的 id），面板显示非法值而渲染层按 `formatDateTime` 的回退分支显示默认——两者仍不一致，属既有分歧，本轮只补「缺失」这一类
  - 实测：`vue-tsc --noEmit` 与 `vite build` 通过；全量 **53 文件 / 473 用例**通过（沙箱掐掉 tag 一个文件，json 报告比对磁盘清单后补跑凑齐）

### 安全

- 修复存储键无长度校验：`kv` 的 key 直接拼进文件名，超长键会让 fs 抛 `ENAMETOOLONG`，在客户端看就是一条没头没尾的 500
  - 新增 `lib/kv.mjs` 的 `keyError()`（上限按 `encodeURIComponent` **之后**的长度算，200），由 `routes/storage.mjs` 的三处与 `routes/history.mjs` 的两处统一调用，非法键提前返 400
  - ⚠️ 为什么必须按编码后长度算：中文编码后膨胀到 9 倍（`泵` → `%E6%B3%B5`），只看原始长度挡不住——实测「泵」×30 原始 30 字符看着正常，编码后 270 字符照样能把文件名撑爆。这一条单独写了用例
  - 实测：9 条用例（正常键读写、超长键读/写/删、中文超长键、空键、历史查询与写入的超长键）全通过

- 〔评估，未改代码〕`v-html` 的 XSS 面：全库 4 处 `v-html` 里只有 **`WidgetElement.vue:94` 的 super-text 值得处置**
  - 其余三处（组件库图标 ×2、自定义组件预览 ×1）渲染的都是用户自己填进本工程的 SVG，属于自我 XSS，危害可忽略
  - super-text 的 `properties.html` 随工程保存，而首页有「导入 JSON」入口（`dashboard/index.vue` → `projectStore.importProject`）——**导入他人工程即可让其 HTML 在受害者浏览器里执行**，是真实的跨用户路径
  - 危害评级**中等，非高危**：会话 token 只存在模块变量里（`auth/session.ts`），不落 localStorage，XSS 拿不到 Bearer，也就无法冒用身份调 API；能做的是页面篡改、读本地工程数据、对外外传
  - 放大项：若部署时设置了 `VITE_API_TOKEN`，它是 `import.meta.env` 构建期注入、**打包进 JS 的**，XSS 一旦执行就能拿到服务主密钥，此时升级为高危
  - 建议方案：引入 DOMPurify 对 `richHtml` 消毒（顺带覆盖自定义组件 SVG），成本一个依赖 + 两三处调用；更彻底的是用 sandbox iframe 渲染，但缩放与样式要重做。**本轮只评估未实施**，等你定

- 修复服务端一处 SSRF：`sendHttp()` 直接 `fetch` 用户在配置页填的通道 URL，无 scheme 限制、无目标限制、无超时——填 `http://169.254.169.254/latest/meta-data/` 就能借服务器身份读云元数据，填内网地址则能打到原本不可达的服务
  - 现在发请求前先过 `checkUrlAllowed()`：只放行 `http/https`；字面量 IP 按段比对拦掉私有 / 回环 / 链路本地 / 组播 / 保留段（`169.254`、`10/8`、`172.16/12`、`192.168/16`、`127/8` 等）；域名先 `dns.lookup` 再逐个判解析结果，否则 `localhost` 之类能绕过字面量检查；`AbortSignal.timeout()` 限时（默认 10s）；`redirect: 'manual'` ——**校验的是初始 URL，跟随 302 等于给白名单开后门**
  - 内网 webhook 是工业现场的正当用法，故留显式开关 `NOTIFY_ALLOW_PRIVATE=1`，默认 0
  - ⚠️ 实测时抓到一个自己写的漏洞：`URL` 会把 `::ffff:127.0.0.1` **规范化成 `::ffff:7f00:1`**，只认点分形式的正则整条失配，IPv4 映射地址可以长驱直入。已把两种写法都接上（`server/notify/common.mjs` 的 `isBlockedV6`），并补了 `::ffff:a00:1`（10.0.0.1）等用例
  - 实测：14 条用例（云元数据 / 回环 / 三个私有段 / IPv6 回环与唯一本地 / 三种 IPv4 映射 / 非 http 协议 / 非法 URL / 公网 IP）全部符合预期。唯一一条「公网域名」在本机解析到 `198.18.1.253`（保留段）被拦——是沙箱 DNS 劫持，逻辑本身正确
- 修复数据文件非原子写：`kv.mjs` / `jsonl.mjs` / `auth.mjs` / `notify/common.mjs` 都是 `writeFile` 直写或「读全文→截断重写」，进程被杀或并发写会留下半截内容。**`_users.json` 损坏等于全站无法登录**，而故障现场看起来只是「JSON 解析失败」
  - 新增 `server/lib/atomicWrite.mjs`（写同目录临时文件后 `rename`；临时名以点号开头，不会被只认 `.json` 的 `listKeys()` 枚举出来），四处写入点改走它。临时文件写入失败会清残留
- 修复种子账号写死弱口令：首次运行会建 `admin/admin123`、`engineer/engineer123` 等，仅打印一句「请尽快改口令」——对外部署就是默认凭据
  - 改为**随机生成**（`randomBytes(9).toString('base64url')`）并打印在启动日志里，四个账号共用；需要固定口令时用 `SEED_PASSWORD` 显式指定。已有用户表的部署不受影响（种子只在表为空时写入）
- 修复登录无限流：`/api/auth/login` 连续失败无计数，配合上一条的弱口令可暴力枚举
  - `auth.login()` 增加第三参 `clientKey`（路由层传 `req.socket.remoteAddress`），按**用户名**与**来源**两个维度各记一份——前者挡针对单账号的定向爆破，后者挡同一来源撞不同账号，任一超限即拒绝。5 次失败锁 5 分钟，锁过期后重新计数
  - ⚠️ 第一版实现有个让限流完全失效的错：`rec.until <= now` 对「从未锁定」的记录（`until = 0`）恒为真，于是每次失败都把计数重置回 1，永远攒不到阈值。已改为只在 `until > 0 && until <= now`（曾锁定且已过期）时清零。**实测确认**：连错 5 次后再用正确口令返回 401
- 修复 `/api/notify/send` 缺角色门禁：相邻路由都有 `requireRole`，唯独这条只过了 `authenticateRequest`，任意 `viewer` 可向全部已启用通道外发任意 `title` / `message`。对齐 `/api/notify/test` 补 `engineer` 级校验
- 修复监听默认绑全网卡：`server.listen(PORT)` 未指定地址，叠加 `CORS_ORIGIN` 默认 `*`，局域网可直接明文读写账号表与工程数据
  - 新增 `HOST` 环境变量，**默认 `127.0.0.1`**；容器必须对外暴露，故 `Dockerfile.server` 与 `docker-compose.yml` 显式设 `HOST=0.0.0.0`。CORS 默认仍是 `*`（本地前后端分端口要用），但监听非回环时启动横幅后补一行警告
- 修复错误信息回显内部绝对路径：路由 `catch` 直接把 `e.message` 返回客户端，fs 错误形如 `ENOENT ... open 'D:\...\server\data\u\usr_x\k.json'`。改为 5xx 只回 `internal error`、详情进服务端日志；4xx 保留 `message`
- 修复两处 SMTP 关掉了证书校验：`notify/email.mjs` 的 STARTTLS 与隐式 TLS 都是 `rejectUnauthorized: false`，而 AUTH LOGIN 送的是 base64 明文账号口令，中间人接管即可截获。改为默认校验，自签证书场景用 `SMTP_REJECT_UNAUTHORIZED=0` 显式放行
- 补两个进程崩溃点：`server.listen` 未挂 `error` 监听（端口占用直接未捕获异常退出）；顶层 `await auth.init()` 及路由内异步操作无 `unhandledRejection` 兜底。两者都补上并给出可读报错
- 新增环境变量：`HOST`、`SEED_PASSWORD`、`NOTIFY_ALLOW_PRIVATE`、`NOTIFY_TIMEOUT_MS`、`SMTP_REJECT_UNAUTHORIZED`，`.env.example` 同步
- `package.json` 的 `lint` 由 `eslint src` 改为 `eslint src server shared scripts`：配置里本就覆盖 `**/*.mjs`，但脚本只跑 `src`，等于服务端与脚本长期既不 lint 也不被类型检查（tsconfig 的 include 同样不含它们）。实测这三个目录当前 0 error 0 warning

### 重构

### 构建

- 服务端终于有类型检查了：新增 `tsconfig.server.json`（`allowJs` + `checkJs`，覆盖 `server/**` 与 `shared/**`）
  - 此前 `tsconfig.json` 的 include 只含 `src/`，服务端既不在类型检查范围内、lint 也在本次之前没覆盖到（lint 上一轮才补上）。为此安装了 `@types/node@^24`（与本机 Node 24 对齐，不用默认的 26）
  - 刻意**不开 strict**：服务端是渐进补上的检查，一上来开 strict 会报出上百条既有问题、把真正的错误淹掉。strict 留作后续单独一轮
  - 首次启用报出 7 条真实问题，已全部修掉：`BLOCKED_V4` 缺元素类型标注（`32 - bits` 把 string 当数字）、`checkUrlAllowed` 的 `@returns` 写成非 Promise、机器人返回体按 `unknown` 访问字段、`readBody` 给 Error 挂 `status` 无类型、`writeFileAtomic` 的 encoding 应为 `BufferEncoding`
  - 新增 `pnpm typecheck:server`；`tsconfig.node.json` 顺带补上漏掉的 `vitest.config.ts`。AGENTS.md 的「验证节奏」表加了一行：改 `server/**` 或 `shared/**` 必须加跑这条

### 优化

- 画布元素渲染：同一项在模板里重复求值（`getElementLayout` 一处出现 7 次、`getElementColor` 4 次、`getIconImageConfig` / `getElementMotion` 各 2 次），而 Konva 每帧重绘都会重跑整个渲染函数
  - 改为 `renderItems` computed 按元素预计算一次，模板直接读字段。**条件分支刻意保留**：管道配置只对 pipe 算、端口只在连线工具下算、取色只在文本/数值/管道分支算——否则「省掉重复调用」会变成「给所有元素多算一堆用不上的东西」，反而更慢
  - 新增 `CanvasElements.test.ts`（10 个用例）：① 每个元素每项只求值一次（spy 计数）；② 多元素时按元素各算一次；③ 按需计算——普通设备不碰只有管道/文本才用到的项；④ 端口只在连线工具下算；⑤ 结构断言——普通设备两段文本、文本图元三段、管道挂 `PipeFlowLine`、有动效的设备挂 `ElementMotion`。**这些断言能抓住回归**：spy 统计的是 visuals 函数本身被调用的次数，谁调用都一样计数
  - ⚠️ 浏览器真机验证没跑通：`agent-browser` 首次 `open` 卡住 11 分钟无输出（按 skill 约定 fail-fast 不再重试），`playwright` 本机也没装。已改用组件级结构断言兜底，**建议手动打开编辑器扫一眼画布**
- `useHistory.saveState()` 少一轮全量序列化：原来每次保存要跑两次 `JSON.stringify`（栈顶一次、新状态一次）。改为栈里存下 `json` 串，比较用字符串，一次保存只序列化一轮
- `canvasStore` 的 `selectedElement` / `selectedElements` 用 `Set` 查选中：原来是「每个元素 × 每个选中 id」的 `includes` 线性查找（O(n·m)），这两个 computed 都在渲染热路径上
- 拖拽对齐不再每帧重建参考数组：`useElementDrag` 的 `onDragMove` 每帧都 `filter+map` 一遍全量元素。拖拽期间元素集合不会变，改为开拖时构建一次快照（`alignOthers`），结束时清空；拿不到快照时当帧现算，行为不变
- 评估后**不改**的两项：`alarmStore` 循环内的 `activeMap` 整体浅拷贝确有多余，但报警条数通常只有几十，O(k·n) 里 k 极小，收益微乎其微，不值得为此重构三处循环；`ComponentPanel` 的 67 条存量缩进 warning 属格式类，与本次无关

- `src/stores/projectStore.ts` 拆出持久化动作（原 415 行 → 292 行）
  - 它是全库最后一个越过 400 门槛的文件（此前两轮都因「既有欠账、非本次引入」被记下未拆）
  - 拆走的是「工程数据 ↔ 存储」的往返：正式保存 / 发布 / 取消发布 / 加载 / 发布版加载 / 导入导出 / 自动草稿，共 12 个动作进新文件 `src/stores/projectPersistence.ts`（198 行）。`projectStore` 只留工程状态、数据组装与应用、重命名、setter、重置
  - 依赖靠注入而非反向 import：新文件导出 `createProjectPersistence({ state, buildProjectData, applyProjectData, applyLoadedProject })`，`state` 里的 4 个 ref 是传引用共享，不是拷贝；不 import store，故无循环依赖
  - 对外 API 一字未改：store 的 return 仍是原来那一组名字，只是来源改成解构 `persistence`

- `server/index.mjs` 拆为按域分组的路由模块（原 446 行 → 195 行）
  - 上一轮的安全修复让它从 409 涨到 446，已明显越过 400 门槛且是本次改动的核心文件，故一并拆掉
  - 拆到 `server/routes/`：`public.mjs`（health / 品牌读取 / 登录，**必须在鉴权前分发**）、`auth.mjs`、`notify.mjs`、`audit.mjs`、`storage.mjs`、`history.mjs`，每个导出 `handle(ctx) → boolean`（已响应返回 true）。`index.mjs` 只留配置装载、上下文组装、分发表与启动逻辑
  - `SITE_BRANDING_KEY` 从 `index.mjs` 移到 `lib/kv.mjs`，与 `GLOBAL_SCOPE` 同处，避免路由模块互相 import
  - 分发顺序与原单体实现保持一致（账号 → 通知 → 审计 → 存储 → 历史）；`scope` / `historyDir` 提前到分发前计算，两者都是纯函数无副作用
  - 实测：26 条接口冒烟（含 viewer 角色应 403 的四条门禁、未鉴权 401、404、非法 JSON 400、键值读写往返、历史写入后查回）全通过

- 修复 `TagEditDialog.vue` 直接改 prop（唯一的 9 条 ESLint error）：表单 `v-model` 绑到父组件传进来的 `form` 对象属性上，等于就地改父级状态（`vue/no-mutating-props`），父组件也无法判断用户改了什么
  - 改为对话框内持有草稿副本：`props.form` 引用变化时复制一份，编辑只动本地，确定时 `emit('confirm', draft)` 把整份草稿交回父级；父级 `commitEdit(draft)` 不再回读自己持有的 `editing`
  - 依赖「父级每次打开对话框都新建对象」这一点（新增走字面量、编辑走 `JSON.parse(JSON.stringify(row))`），故引用变化可靠，不会把上一次的编辑残留带进下一次
  - 实测：`npm run lint` 由 **9 errors / 468 warnings** 变为 **0 errors / 468 warnings**（warnings 全是存量格式类，与本次无关）；`vue-tsc` 与 422 个用例全通过

- 修复撤销/重做会被就地改写污染：`restoreState()` 把历史快照里的对象**按引用**塞回 store（`canvasStore.addElement` 只是 `elements.push`），而 store 侧存在就地改写（`connectionStore` 直接赋 `conn.points`、`pageStore` 直接 `delete el.navigateTo`）。一旦撤销恢复出的元素被后续编辑改写，栈里已存的快照会跟着变，第二次撤销拿到的就不是原始内容了。修法是 restore 时先克隆——`serializeState()` 本来就深拷贝，出栈这一侧漏了
  - 新增 `useHistory.test.ts` 回归用例：撤销后就地改 `x`，再 redo / undo 一轮，断言回到的是原始值。撤掉克隆后该用例如期失败（`expected 777 to be +0`）
- 修复质量时钟永不停止：`deviceStore` 的 `clockTimer` 只在 `ensureClock()` 里 `setInterval`，`disconnect()` / `reset()` 都没 `clearInterval`。一旦收过数据就每秒 `dataTick++` 直到关页，而 `qualityOf` / `commLost` 都读 `dataTick`，断连或重置后整幅画布仍在每秒空转重算。新增 `stopClock()`，在两个出口各自调用（下次收到数据由 `ensureClock` 重启）
- 修复 `/api/notify/send` 缺角色门禁：相邻路由都有 `requireRole`，唯独这条只过了 `authenticateRequest`，任意 `viewer` 可向全部已启用通道外发任意 `title` / `message`。对齐 `/api/notify/test` 补 `engineer` 级校验
- 修复 `Dockerfile.server` 构建出的镜像必然启动失败：只 `COPY server/`，而 `server/index.mjs` 要 `import ../shared/consoleBanner.mjs` 并读 `../package.json` 取启动横幅的名称与版本，容器内两者都不存在、模块加载即 ENOENT（该文件自己的注释已写明「不能只拷 server/」，Dockerfile 没跟上）。补齐 `shared/` 与 `package.json` 两行 COPY
- 修复导入的组件在左侧组件库里显示大小失控：同一批设备有的撑爆格子、有的只剩一条细缝
  - 根因是**图元根标签带着源文件的固有像素尺寸**。组件库把 `ComponentDefinition.icon` 用 `v-html` 直接注入一个 30×30 的格子（`ComponentPanel.vue` 的 `.component-icon`），手写图元一律只写 `viewBox`、不带宽高，SVG 便按容器缩放；而素材文件的根标签是 `width="937px" height="367px"`（主通风风道）、`width="610px" height="232px"`（采煤机）、`width="28px" height="36px"`（火）这类原尺寸值，注入后各按自己的大小渲染，30×30 的格子自然失控。**批次一用 `icon/` 缩略图时全是 40×40，所以没暴露；批次二改取 `real/` 原始比例后集中爆发**
  - 修法两路并举：① 导入时去掉根 `<svg>` 的 `width`/`height`（规范化第 4 步，新增 `stripIntrinsicSize()`），只留 `viewBox`——这是根因修复，121 个图元已全部重新生成；② 在 `component-panel.scss` 补 `.component-icon svg { width: 100%; height: 100% }` 作为兜底，将来任何图标再带固有尺寸也不会撑爆格子
  - 去掉固有尺寸是安全的，已逐项确认消费方：画布渲染走 `iconBounds.buildTightSvg()`（它本来就会先清掉再按内容包围盒重写 viewBox/width/height）；`getIconBounds()` / `elementMotion.iconFrameOf()` 用 `getBBox()`，与宽高属性无关；核对页自己实现了同一套收紧逻辑
  - `validateSvg()` 新增两条自检（根标签不得残留 width/height），**加上当天就抓到一次真实回归**：初版实现用 `^<svg` 锚定行首，而去掉 XML 声明后字符串开头残留 `\r\n`，锚点全部失效——121 个图元一个都没剥掉。已改为匹配第一个 `<svg>` 标签（这些素材没有嵌套 `<svg>`）
  - 实测：`npx vitest run` 48 文件 / 408 用例全通过；`pnpm build`（vue-tsc + vite build）通过；ESLint 对改动文件 0 error 0 warning；121 个根标签逐一核对无 `width`/`height`、`viewBox` 全部保留

- 修复设备图标首次渲染不显示：拖入画布后图形为空，要等下一次无关重绘（例如再拖一个元素）才补画出来
  - 根因在 `useElementVisuals` 的 `iconVersion`：`getIconImage` 是**异步解码**的，首次求值必然拿不到 `image` 而返回 `null`（`v-image` 节点压根没创建），设计意图是 `onLoad` 回调递增 `iconVersion` 触发重绘。但这个 ref **只写不读**——全库检索只有定义与两处写入，没有任何读取点，也不在 composable 的返回对象里。Vue 的渲染依赖是在「渲染期间读 ref」时登记的，只写不读等于没写，于是「解码完成 → 重画」这条信号发到了一个没人订阅的 ref 上
  - 不是本次新增组件引入的问题：链路是共享的，所有设备图元的**首帧**都受影响；只是小图标（几百字节）常在本次渲染结束前就已 `complete`，而被导入的图元要按 512px 长边光栅化、解码更慢，窗口期大到肉眼必然看到
  - 修法对齐同目录 `ElementMotion.vue` 的既有手法（`rotors` computed 里的 `void imageVersion.value`）：在 `getIconImageConfig` 与 `getUserImageConfig` 各读一次，把调用方（`CanvasElements` / `PreviewStage` 的渲染）登记为依赖方；同时把 `iconVersion` 加进 composable 返回对象，避免它再次悄悄死掉
  - 新增 `src/core/canvas/useElementVisuals.test.ts`：用假 `Image`（微任务模拟「本帧之后才就绪」）断言 ① `getIconImageConfig` / `getUserImageConfig` 订阅 `iconVersion`（包进同步 `watchEffect`，递增后必须重跑）；② 位图就绪后返回非 null 且宽高为正的可绘配置。**已验证该测试能抓住回归**——临时撤掉订阅读取后，第 ① 条断言如期失败
  - 实测：`npx vitest run` 48 文件 / 408 用例全通过；`pnpm build`（vue-tsc + vite build）通过；`eslint` 对两个改动文件 0 error 0 warning
  - ⚠️ 用例数一度记错：本机沙箱写 `%TEMP%` 会偶发 `EPERM`，**`vitest run` 会被提前掐断**，末尾汇总显示 46~47 个文件 / 368~386 个用例，看起来「全绿」实则少跑了一到两个文件。可信口径是以 `--reporter=verbose` 重跑、确认汇总无 `Errors` 且逐文件列出与磁盘一致（本次实测 48 个文件与 `find` 结果逐一相符）。上一条「通用设备」记载里的 45/367 同为此因，已一并更正

- 宽屏（≥1700px）下删除 / 复制 / 粘贴没有任何可见工具栏入口——修窄屏折行时（`16924109`）把三个编辑按钮从顶部**直接删除**而非挪位，而它们的替代落点「更多」菜单在宽屏恰好被 `display: none` 隐藏（`toolbar.scss` 的 `min-width: 1700px` 规则），宽屏用户只剩快捷键 / 右键菜单 / 属性面板可用
  - 修复：复制/粘贴加回撤销/重做按钮组（配置数组 `editActions` + v-for，disabled 条件与「更多」菜单项一致），样式类 `edit-action` 与「更多」菜单**互斥显示**——≥1700px 平铺、低于该宽度隐藏并走「更多」菜单，复用 `toolbar-secondary` 已确立的断点模式，不加剧 1200px 级窗口的宽度压力
  - 删除按钮按用户反馈（使用频率高）**常显不收纳**：所有宽度下都在撤销/重做旁显示，disabled 条件为未选中元素且未选中连线；同时恢复随 `16924109` 一起丢失的悬停红色效果（`.btn-delete` hover/focus 淡红底 + 红边红字，:active 加深为 40% 混合；`ToolIcon` 走 `stroke="currentColor"`，`color` 变红即图标跟随，无需对 svg 特判）
  - 行数门槛自查：删除按钮直接写三段重复模板会把 `Toolbar.vue` 顶到 412 行（超 400），重构为配置数组 + v-for 后 399 行
  - 行数检查脚本 `scripts/check-long-files.ps1` 一直在少算行数，已改为精确计数并内置 `src/industrial/**` 例外
  - 根因是用了 `(Get-Content | Measure-Object -Line).Lines`：该 cmdlet **不计空行**，对纯 LF 文件漏得更多——2026-10-13 实测同一批文件少算 3~25 行（`src/core/canvas/faceLighting.ts` 报 85、实际 110；`src/core/canvas/iconImage.ts` 报 31、实际 40）。本仓库行尾本就混用（`industrial/**` 是 CRLF、新写的画布文件是 LF），两种都会失真
  - 后果不是数字难看而是**守卫失效**：全量精确重扫时真实超限 3 个文件，脚本只报出 1 个——被漏掉的是 `src/stores/projectStore.ts`（实际 415，脚本读 369）与 `server/index.mjs`（实际 409，脚本读 374）。两者都是既有欠账、非本次改动引入，故本次只修脚本、不顺手拆它们（另行处理）
  - 计数改用 `[System.IO.File]::ReadAllLines().Count`，与行尾风格无关；已在 6 个文件上与真实换行符数逐一比对（CRLF 与 LF 两类各含），另 3 个文件与 `wc -l` 交叉核对，数值完全一致
  - 例外改为机械判定：新增 `-Exempt` 参数（默认 `src/industrial/*`），命中即不参与门槛，并在输出末尾报出跳过数量（当前 18 个）——例外必须可见，否则会变成静默豁免。`src/industrial/coal/index.ts` 实际 470 行，按此例外放行
  - AGENTS.md 同步明确门槛的**适用范围**：只针对本次改动新增或触及的文件；脚本报出的既有超限文件不阻塞无关提交，但必须在当次汇报里如实列出，不许默默略过


- 登录页与预览页头部在亮色主题下仍是暗色皮肤：这两页样式当初按暗色写死（`login.scss` 与 `preview-header.scss` 各零处主题变量），切到亮色时全站变亮、唯独登录页背景仍是 `#0b1020`、预览 HUD 仍是 `rgba(12,18,36,0.96)`，观感像「切换失效」。现把这两处色值抽成 `variables.scss` 里成对的 `--login-*` / `--hud-*` 变量并补亮色取值（浅底深字，品牌青退化为强调色），页面样式改为消费变量；登录页的光晕、网格、扫描线在亮色下同步减弱，避免淡背景上糊出脏色
- 构建：vite rollupOptions manualChunks 拆分 vendor chunk（element-plus / konva / vue 各自成块），降低首屏产物体积
- 亮色主题下画布背景仍是黑色：画布底色与网格色是工程级配置，默认值按暗色主题写死（`#1e1e1e` / `#2a2a2a`）且随工程持久化，编辑器/预览把它渲染成内联样式后优先级高于主题变量，切到亮色时全站变亮唯独画布留在近黑的旧底色。现默认值改为空串 =「未自定义，跟随主题」——编辑器与预览的画布底色、网格颜色随亮暗主题自动切换（CSS 变量 `--bg-canvas` / `--grid-color`）；加载工程时把等于旧暗色默认值的记录迁移为空串（`normalizeCanvasConfig`，编辑器/预览装载入口共用，幂等），用户显式选过的其它颜色原样保留；画布配置对话框两个取色器增加「留空跟随亮暗主题」提示，清除取色即恢复跟随主题（清除产生的 null 统一归一为空串）。示例工程同步改为跟随主题
- 编辑器工具栏窄屏「按钮掉下来」：Element Plus 2.14 把水平按钮组改成了 `inline-block + float:left` 的老式实现，窗口不够宽时 flex 挤压按钮组、浮动按钮像文字一样折行，堆成两三行并溢出 52px 工具栏压到标签栏。现将按钮组统一恢复为 `inline-flex` 布局（组内永不折行）；窄于 1700px 进入紧凑模式——次要操作（复制/粘贴/删除、主题切换、画布配置、导入导出）收进「⋯ 更多」下拉菜单，发布/保存/预览只留图标（名称经 tooltip 悬停可见），用户胶囊只留首字头像（全名与角色经 title 悬停可见），项目名超长省略号截断，极窄窗口横向滚动兜底，工具栏在任意宽度下保持单行
- 用户胶囊角色显示丢失：`el-dropdown` 会向触发元素透传 `role="button"` 属性，`UserChip` 恰好声明了同名 `role` prop 而被覆盖（Vue 将透传属性匹配到同名 prop），导致首页与编辑器的用户头像配色失效、角色徽标不显示、悬停提示里角色一律是「用户」。prop 更名 `userRole` 规避与 HTML `role` 属性的冲突，头像按角色着色（admin 红 / engineer 橙 / operator 青 / viewer 蓝）与角色徽标恢复正常
- 历史查询服务端窗口聚合缺失：前端趋势图长跨度（24h/7天）已按 `agg/window` 请求服务端聚合，但 `GET /api/history/query` 直接忽略该参数、全量回传原始点（7天1秒采样约60万点），服务端全文件解析排序、前端再抽稀，慢且费内存。现 `querySamples` 支持 `agg=min/avg/max + windowMs`——边读边按窗口（epoch 对齐）归约，内存只保留窗口数；仍超 `maxPoints` 时再均匀抽稀兜底；非法参数回落普通查询不报错，旧前端兼容
- 用户胶囊里同一个词上下显示两遍：种子账号（`admin`→管理员、`engineer`→工程师、`operator`→操作员、`viewer`→观察员）的 `displayName` 就等于角色标签，右侧叠成「管理员 / 管理员」两行同词，且头像首字也取自它，分不清哪个是身份、哪个是权限。现 `UserChip` 增加 `nameText`（显示名优先、回落用户名）与 `showRole`（角色标签与显示名同字时整行不渲染），真实姓名账号（如「张三」/操作员）不受影响仍显示两行；`title` 悬停提示保留 `用户名 · 角色` 便于区分

### 功能

- 补齐 C/D 两类共 **11 个功能型组件**（基础图形与装饰之外的最后一批缺口），组件总数由 166 增至 **177**
  - **C 类·功能组件**：文字（`text`）、进度条（`progress-bar`）、报表（`report-table`）、网格图（`grid-chart`）、表格（`filter-table`）、雷达图（`chart-radar`）、日期（`date`）、时间（`clock`）；**D 类·富媒体**：视频（`video`）、网页（`iframe`）、超文本（`super-text`）。至此源配置 166 项里除「研发中」组与「其它」组定制贴图外全部落地
  - **渲染路径分三路，按"谁需要 DOM"分流**：① 文字用 Konva 原生 `Text`（矢量、随画布缩放，且要与名称/数值的素文本保持同一套命中与拖拽行为——overlay 是 `pointer-events: none` 的，扛不了交互）；② 雷达图并入既有 ECharts 链路（按需注册 `RadarChart` + `RadarComponent`）；③ 其余 9 个挂件新建 `widget/WidgetElement.vue` 统一渲染。覆盖层由 `ChartOverlay.vue` 泛化为 `HtmlOverlay.vue`，编辑器与预览页两处同步接入
  - **挂件内部字号/内边距都乘了画布 zoom**：overlay 容器的尺寸是按 zoom 放大后的，但 CSS 的 px 不跟着缩放，不乘的话缩小画布时字会相对变大。预览页传 `readonly`，挂件内的搜索输入等交互在运行端禁用
  - **Konva 侧不再画 overlay 类元素的图标**：这 13 个类型（4 图表 + 9 挂件）+ `text` 都带 `icon`，若走图标路径会在 overlay 底下多画一张缩略图。`useElementVisuals` 增 `isOverlayElement()` 与 `HTML_OVERLAY_TYPES` 清单，与 `HtmlOverlay.vue` 的类型表保持一致——**新增 DOM 承载的组件时两处必须同步改**
  - 雷达图与饼图同样要处理「全 0 退化成一条线」，用占位多边形保持布局稳定；非有限值（NaN/Infinity）压成 0 再判断是否落入占位分支
  - 源产品把日期/时间/视频/网页/超文本列在「基础组件」下，沿用该口径；数据展示类（进度条/报表/网格图/表格/雷达图）进「图表组件」
  - **WidgetElement.vue 445 行**，走 `src/industrial/*` 的行数例外（与本目录其他定义/渲染类长文件同口径）。若后续要拆，建议把报表/网格图/表格三块独立成 SFC，并把取数 computed 下沉为 composable
  - 未做：源配置里横管/竖管/导航（PNG 源文件）、以及「其它」组定制贴图维持不导入
  - 验证：**48 个测试文件逐文件单跑全通过、0 失败，共 421 个用例**；`pnpm build`（vue-tsc + vite build）通过；ESLint 对 12 个改动文件 0 error 1 warning（`v-html` 与组件库图标注入同一信任模型——内容是用户在本工程里配的，非外部输入）；`check-long-files.ps1` 通过，例外跳过数由 35 增至 38
  - ⚠️ 沙箱 `vitest run` 的 EPERM 掐断频率高到**整批跑都凑不齐 48 个**（多轮 + 补跑也不收敛）。已改用逐文件单跑汇总：可靠但慢（约 9 分钟），且汇总脚本必须先剥 ANSI 色码再解析，否则全部误判为失败

- 补齐对照源配置后发现漏加的两段：**基础图形 7 个** 与 **装饰组件 10 个**，组件总数由 149 增至 **166**
  - 前几轮只做了配置里 `devices` 那一段（通用/电力/主运输/水/洗选/热力/主通风/综采共 121 台），`basics`（基础组件 15 项）、`图表组件`（8 项）、`装饰组件`（12 项）三段被整体漏掉。经逐项对照，源配置共 166 项，此前已加 121、有等价物 4 项，**真正缺口 41 项**；本次补掉其中成本最低的 17 项，其余 24 项见下方「未做」
  - **基础图形 7 个**（`src/industrial/basic/shapes.ts`，新增 `basic` 分组内置项）：矩形 / 圆 / 三角 / 横线 / 竖线 / 虚横线 / 虚竖线。源产品这 7 项只给了 PNG 缩略图（`base0~2.png`、`hr1/2.png`、`dashed1/2.png`）、没有矢量源，故**手绘成 `currentColor` 线条稿**而非贴图——任意缩放不虚、能跟随元素状态变色、与仓库既有手写图元同一套口径（viewBox 0 0 100 100、stroke-width 2.6）。与 `CustomComponentDialog.vue` 的 `SHAPES` 是两套东西不要合并：那边给用户自建组件用、颜色由用户指定（写死 `stroke="#xxxxxx"`），这边必须走 `currentColor` 才能被状态色替换
  - **装饰组件 10 个**（新分组 `deco`，走素材导入链路）：按钮 / 背景一 / 背景2 / 标题一 / 标题二 / 直通 / 弯通 / 三通 / 四通，另含源产品列在「基础组件」下的箭头（`base_arrow.svg`）——它与装饰同属贴图类素材，故并入本组。导航 / 横管 / 竖管三项**未纳入**：源文件是 PNG（`_desc00.png` 118KB、`hg.png`、`sg.png`），且源配置里横管与竖管的 `src` 都错指到 `_desc09.svg`
  - 这 10 个同样走 `buildAssetComponents` 的 state 契约（接不接数据源都可，不接就按默认色显示）
  - 未做（待定，成本高于本次）：**文字**、**进度条**、**报表**、**网格图**、**雷达图**、**表格**、**日期**、**时间**——前六个要写渲染逻辑或新图表类型，后两个要做成"活的"（实时走针）；以及**视频**、**网页(iframe)**、**超文本**——需要富媒体容器。源配置标注 `hidden` 的项（雷达图/表格/皮带/研发中组）与「其它」组的项目定制贴图维持不导入
  - 验证：`npx vitest run` 48 文件 / 408 用例全通过（沙箱 EPERM 仍会随机掐断，跑三轮全量 + 补跑漏掉的文件后确认 48 个无一遗漏）；`pnpm build`（vue-tsc + vite build）通过；ESLint 对改动文件 0 error 0 warning（`ComponentPanel.vue` 的 71 条告警仍在 30–99 行模板区，属存量）；`check-long-files.ps1` 通过，例外跳过数由 32 增至 35

- 补齐外部素材库的其余 7 个系统，组件总数由 41 个增至 **149 个**（其中素材导入 121 个）
  - **通用设备**（13，`general`）、**电力系统**（22，归入既有 `electrical`）、**主运输系统**（5，新分组 `transport`）、**水系统**（27，归入既有 `water`）、**洗选系统**（17，新分组 `wash`）、**热力系统**（22，新分组 `thermal`）、**主通风系统**（6，新分组 `ventilation`）、**综采系统**（9，归入既有 `coal`）。分组名与源产品一致；新增 4 个 `ComponentGroup` 成员，`ComponentInstance` 无 `group` 字段，故对既有工程数据零影响
  - **素材一律改取 `real/` 而非 `icon/`**：两套是同源图元，但 `icon/` 是把整张图缩放进 40×40 方画布的缩略图（描边被放大到 1/40 比例），`real/` 才是原始比例（viewBox 与配置里的 w/h 完全吻合，如采煤机 610×232、布袋除尘器 82×69）。缩略图那套会让导入设备的线宽明显重于其他图元。已连 `general` 一起重新生成，121 个图元线宽口径统一
  - **两处同名但 type 不同，互不覆盖**：`water` 组的「沉淀池」与手写 `SedimentTankDefinition` 同名，`coal` 组的「采煤机」与手写 `ShearerDefinition` 同名。registry 用 `Map.set`，同 type 会静默覆盖——本次全部 121 个 type 均带系统前缀（`gen_`/`elec_`/`trans_`/`water_`/`wash_`/`thermal_`/`vent_`/`coal_`），已逐一核对与既有 28 个手写 type 零冲突，组内亦无同名
  - 源配置里 `hidden: true` 的条目未导入（雷达图、filterTable、`trans` 的皮带、「研发中」组的旋转/面板/弹窗）；「其它」组的管网与新增1~4 属项目定制贴图、无语义，同样未导入
  - 修掉导入脚本自身两个缺陷：① 参数解析把位于末尾的无值开关（`--scan`）置成 `undefined`，命令直接落到 "nothing to do"——带 `--report` 的调用会侥幸跑通，问题被掩盖；② 在 `.mjs` 里写了 TS 类型标注，一跑就 `SyntaxError`
  - 验证：`npx vitest run` 48 文件 / 408 用例全通过；`pnpm build`（vue-tsc + vite build）通过；ESLint 对 10 个改动文件 0 error 0 warning（`ComponentPanel.vue` 的 73 条告警全在第 30–99 行模板区，本次改动均在 119 行之后的 `<script>`，属存量）；`check-long-files.ps1` 通过，例外跳过数由 21 增至 32
  - ⚠️ **本机 `vitest run` 被沙箱 `%TEMP%` 写失败随机掐断的根因解法**：把 `TEMP`/`TMP` 重定向到仓库内可写目录即可一次跑全——`TEMP=<仓库>/.workbuddy/tmp TMP=<仓库>/.workbuddy/tmp npx vitest run`，实测 48 文件 / 408 用例全到、汇总无 `Errors`。此前三次全量分别只跑到 45/367、47/390、47/392（各漏 1~2 个文件且不报失败），数字不可信

- 新增「通用设备」组件分组（13 台：泵1 / 泵2 / 油泵 / 电磁阀 / 风机 / 防爆门 / 过滤容器 / 搅拌器 / 油桶 / 球机 / 水桶 / PLC / PLC2），图标由外部组态产品的素材库导入
  - 新增一次性导入工具 `scripts/import-subunit-assets.mjs` 与素材清单 `scripts/subunit-manifest.json`（记录 type ↔ 源文件 ↔ 面板名称，可追溯、可重跑）。素材是另一套产品导出的 Sketch 风格 SVG，直接内联有三个问题，故规范化四步：① 去 XML 声明 / `<title>` / `<desc>` / `id` / `version` / `xmlns:xlink`；② 去「带 `opacity` 但无任何可见 `fill`/`stroke`」的整幅底衬矩形——**它不可见却仍会进入 `getBBox()`**，会让 `iconBounds.buildTightSvg()` 拿到整幅方形包围盒、内容收紧整体失效；③ 主题色 `#57A9FB` → `currentColor`（不替换则状态变色对它完全无效，会恒定显示素材自带蓝）；④ 压成单行，减小内联体积
  - **刻意不处理 `transform`**：素材里成对出现的 `translate(-x,-y)` / `translate(x,y)` 互相抵消，残留偏移由 `getBBox()` 正确计入并被重写进 viewBox——手工清 transform 反而容易把真实几何偏移一并删掉。非主题色（指示灯绿、火焰红等 20 种）同样保留，它们承载语义且不会被状态色覆盖
  - viewBox 无需手工归一：`getIconBounds()` 会按内容包围盒重写，素材自带的 `40px×40px` 方形画布被自动收紧，素材面板给出的 102×50 等默认尺寸可直接采用
  - 状态契约统一为单一 `state` 变量（0 停机 / 1 运行 / 2 报警），组装逻辑下沉到 `src/industrial/assetComponents.ts`（后续系统复用同一入口）：这批图元出厂不带语义，逐台发明 `speed`/`load`/`level` 会凭空造出上百个数据源里并不存在的变量，而改绑只需在数据绑定面板操作。`severity` 一律显式声明——按 `src/types/scada.ts` 的约定，不声明会按颜色兜底推断，停机态会被误判成报警而刷满报警面板
  - 面板接入：`ComponentGroup` 增 `'general'`，`BASIC_GROUPS` 中排在「基础组件」之后。分组只存在于组件定义层、不进元素实例（`ComponentInstance` 无 `group` 字段），故**对既有工程数据零影响**
  - 这批图元是单色线条稿（无 `data-face` 标注），`faceLighting.styleIcon()` 会原样放行——2D 与 2.5D 下外观一致，与已迁移 6 台的面基图元共存（迁移可分批，见 `docs/2.5D_ILLUSTRATION_GUIDE.md`）
  - 素材扫描实测：264 个 SVG / 33 个 PNG；262 个规范化干净（仅 `test.svg` / `test2.svg` 为无 `<svg>` 根的垃圾文件，未纳入清单）；123 个命中隐形底衬矩形；2 个含 `<style>`（即上述垃圾文件）；29 个含非主题色（集中在未采用的装饰组件与火焰/指示灯图元）；清单项 0 缺失
  - 配套 `--preview` 模式与 `scripts/subunit-preview.mjs`（模板拆出，主脚本保持在 400 行门槛内）：生成图元核对页，页内 JS 是 `iconBounds.measure()` / `buildTightSvg()` 与 `currentColor` 替换的忠实移植（浏览器里真跑 `getBBox`），按元素默认尺寸列出每台设备的默认/运行/报警三色，供「看真东西」——这三类问题（画不出来、包围盒收紧失效、变色不生效）静态检查与单测都抓不到
  - 验证：`npx vitest run` 47 文件 / 405 用例全通过；`pnpm build`（vue-tsc + vite build）通过；`scripts/check-long-files.ps1` 通过（超限的两项 `src/stores/projectStore.ts` 415 / `server/index.mjs` 409 均是既有欠账，非本次引入；本次新增的 3 个 `src/industrial/**` 文件走该脚本内置例外，当前共跳过 21 个）
  - **面板与画布中的实际观感尚未由人眼确认**：本机沙箱内无法启动无头浏览器（Chrome 启动被拦截、无输出即终止），按既定约定不为此下载浏览器运行时。核对页已生成，可在自己的浏览器打开；或在编辑器「基础组件」页签下查看「通用设备」分组（需重启 dev server 让新组件注册生效）
  - 未做（待后续批次）：电力 / 主运输 / 水 / 洗选 / 热力 / 主通风 / 综采各系统设备，以及图表缺口（进度条 / 报表 / 网格图）与纯文本组件
- 设备在运转状态下会「动」起来——采煤机的两个截割滚筒与掘进机的截割头随截齿旋转、皮带输送机的带面沿输送方向滚动，转速与流向由绑定点位的实时值决定
  - 绕不开的约束：设备图标是 `new Image()` 把整段 SVG 光栅化后的**一张位图**，Konva 无法让位图里的某个圆单独旋转。因此把可动件（滚筒/截割头的截齿、带面标记）从主图标里拆出来，放进定义层的 `motion.rotors` / `motion.belts`，渲染时按与主图标**同一套 contain 变换**换算坐标摆回原位——代价是图形定义要写两处（静态机身 + 可动件），改图形时需同步，已在该字段注释里标注
  - 新增 `src/core/canvas/elementMotion.ts`（几何纯函数）+ `ElementMotion.vue`（可动件层）：`makeIconFrame` / `placeRotor` / `buildBeltConfig` 可脱离浏览器单测（坐标映射是最易错的一环），`getRotorConfigs` / `getBeltConfigs` 在 SVG 测量不可用时返回空数组——宁可暂不画可动件，也不能靠猜坐标把滚筒摆到机身外面
  - 角度是**逐帧积分**（`angle += 角速度 × dt`）而不是「时间 × 速率」：速度变化时姿态不跳变，停转时冻结在当前位置而非弹回 0°
  - 驱动与判停沿用既有口径：角速度 = `clamp(degPerUnit × |实时值|, 110, 400)`（上下限是防故障的——转速过高会被显示器采样成静止或倒转），带面流速 = `clamp(26 × |实时值|, 30, 120)`；**未绑定数据源视为运转**（组态阶段拖进来即可见效果，与管道「未绑定即流动」一致），**数据陈旧/脏值则停住**（与数值显示 `--` 同口径）；`driveVariable` / `threshold` / `degPerUnit` 均在定义层可配，并暴露「运转动效」布尔属性供逐元素关闭
  - 带面滚动用 `lineCap: 'butt'` 的竖向标记推进 `dashOffset`：圆头线帽会给每个短划两端各加半个线宽，短划被撑长后首尾相连，带面会糊成一条实线而看不出在动；标记高度取带面厚度（`bandHeight`，显式声明而非猜一个像素值）的 0.62，上下留出间隙才不会顶满带面
- 新增画布共享动画时钟 `src/core/canvas/animationClock.ts`：整块画布只跑一个 RAF、按引用计数启停（画面没有动效时零开销），回调收「距上一帧的毫秒数」而非帧序号——按帧计数会让动效速度随刷新率变化。管道流动改为消费本模块，顺带修掉一个真实缺陷：原来每帧固定 `flowOffset + 1`，在 120Hz 屏上流速会变成两倍（现按时间推进，60Hz 下数值与改造前等价）
- 组件定义同步：采煤机 / 掘进机 / 皮带输送机的可动件图元从 `icon` 移入 `motion`（不移除会出现「静止齿 + 转动齿」的重影），补「运转动效」开关属性；`ComponentDefinition` 增可选 `motion` 字段（`rotors` / `belts` / `driveVariable` / `threshold` / `degPerUnit`）。新增定义层自检单测：驱动变量必须真实存在于 `dataBindings` 且参与状态规则（否则会出现「线是停机的灰、却在转」）、可动件图元不得残留在静态图标里、旋转中心必须与该设备的某个圆同心、带面标记的厚度与位置必须与图标里的上下带边一致
- 编辑器与预览页两处渲染同步接入动效层
- 画布元素改为「纯图形」形态：元素只呈现设备自身的线稿，不套卡片底色、不描边，状态变化只改线条颜色（`getIconStrokeColor` 成为元素唯一的状态表达通道）
  - 删除 `elementChrome.ts` 的 `bodyShadowConfig` / `bodyFillConfig` / `bodyTopGlowConfig` 与 `CanvasElements.vue` 里对应的 `v-rect`，`isPureShapeMode` / `hasIntrinsicGraphic` 随之失去意义一并清理；名称条（`rgba(8,12,24,.72)` 填充块）与数值胶囊（带底色）本质上也是「元素上的背景色」，一并改为素文本 + 深色外发光（Konva 的 `Text` 不支持 CSS `text-shadow`，用 `shadow*` 系列实现）保证压在图形或网格上仍可读
  - 选中反馈不依赖卡片描边：选中框与 8 个锚点由 `v-transformer` 绑定选中节点列表绘制，去掉描边不会「选中看不见」；元素仍保留一层不可见命中矩形供点选 / 拖拽 / 变换
- 图标改为按「内容包围盒」长宽比适配（新增 `src/core/canvas/iconBounds.ts`）：组件 SVG 一律是 `viewBox="0 0 100 100"` 的方形画布，而图形往往只占其中一部分（采煤机实际只占 x6–94 / y46–80），渲染层却按正方形等比缩放，于是横向设备被压成居中一小块——实测采煤机拖入 176×96 后可见图形仅 56×23px、左右各留 45px 死区（管道因此一直被特判为走原生管身绘制，其他横向设备没享受同样处理）。现用离屏 SVG 的 `getBBox()` 测出内容包围盒（补偿最大 `stroke-width`/2——`getBBox` 不含描边），据此收紧 viewBox 并写入等比 `width`/`height`，渲染层再按内容长宽比 contain 进图形区。三个坑已实测并固化：只收紧 viewBox 会依赖浏览器按比例换算；`width`/`height` 取 viewBox 原尺寸则基准过小、放大发虚；故统一按 512px 长边基准。改造后可见图形面积提升 2.1×–6.1×（采煤机 79×32 → 168×69、汽轮机 68×26 → 168×64），缩放 0.45× 时仍保 71×29（改造前 30×12）
- 修复数值显示图元重影：`display` 类型既渲染内建图标（画着 "8.8" 的方框）又叠加实时数值大字，两者重叠；现由实时值单独承担，颜色跟随元素状态色
- 元素内部分区抽成纯函数（新增 `src/core/canvas/elementLayout.ts` + 同目录单测）：顶部数值区 / 中部图形区 / 底部名称区的高度原先散落在 `getLabelHeight` 的固定 16/26 与模板里的 +4/+12 魔法数字中，元素一缩小就互相挤压——固定条高在 0.6× 的采煤机上会把图形空间吃光、图标只剩 16×6px。现改为「按元素高度比例取值并夹在上下限之间」，图形可用高度不足时按「先撤数值、再撤名称」降级，保证设备图形永远有位置（H ≤ 40 撤数值、H ≤ 34 撤名称）；配 8 个单测覆盖拖入尺寸、降级边界与自适应比例。顺带修正 `DEFAULT_ELEMENT_COLOR` 注释与实现不符（实为薄荷色 `#8fe6d3`，注释写「中性灰」）
- 编辑器与预览页共用同一套元素外观配置，两处渲染同步修改——只改一边会导致预览画面与实际运行不一致
- 启动横幅升级为「LOGO + 名称 + 信息」的终端个人主页风格（参考 neofetch 布局），且**浏览器控制台、`pnpm dev` 前端终端、`pnpm server` 存储后端三处共用同一份布局**：从左到右依次为系统 LOGO 像素画、系统名称/副标题/版本、进程信息栏，底部 shell 提示符 + Star 引导语
  - 核心下沉到 `shared/consoleBanner.mjs`（纯 ESM，不碰 DOM/Vue/Pinia/Node）+ 同目录 `consoleBanner.d.mts` 补类型：Node 不能 import `.ts`，核心必须是 `.mjs` 才可能被前后端共用，否则两端各写一份、布局迟早漂移；`server/` 因此依赖仓库根的 `shared/`，分发时要连 `shared` 一起带上（已在服务端注释标注）
  - 三处渲染各管一段：浏览器用 `%c` + CSS（`src/utils/consoleBanner.ts`，名称取 `brandingStore` 默认品牌值）；`vite.config.ts` 与 `server/index.mjs` 用 SGR 24 位真彩色，能力判定收敛到核心的 `supportsColor()`（`NO_COLOR` / `FORCE_COLOR` / TTY；Windows 上额外要求 Windows Terminal 或 mintty 类宿主——传统 conhost（PowerShell 5.1）不处理 VT 序列，转义字符会被当正文打印成乱码）
  - 进程身份区分：前端横幅副标题结尾标「· 前端 Frontend」，后端标「· 后端 Backend」并在信息栏提示「前端界面请另开 pnpm dev」，提示符分别是 `visitor@` / `node@`；后端信息栏换成自身事实（Role / Listen / Data / CORS / Body / History / Auth / Health），前端技术栈信息作为 `FRONTEND_DETAILS` 导出给前端两处共用。原后端那行 `[scada-server] 已启动: …(配置详情)` 简化为只留启动确认——配置事实已进横幅，不再重复两遍。浏览器横幅的「前端 Frontend」后缀只加在横幅上，不改 `brandingStore` 的品牌副标题（它同时用于浏览器标签页标题）
  - 底部引导语中英各一行：英文 `If … give it a Star ⭐` 下跟中文「如果 … 对你有帮助，欢迎点个 Star ⭐ 支持这个项目。」——不拼成一行是因为 CJK 按 2 列算，拼起来超 130 显示列，窄终端必然折行
  - LOGO 由 `public/logo.svg`（管道 + 设备线稿）按 32×32 网格光栅化：描边字符 `a` 用品牌主色 `#00d4aa`、形状内部 `b` 用同色暗调 `#006b62`（细线稿在 32 列网格上认不出标识，填充后才像实心设备剪影），成模型时标记统一译成块字符 █ / ▒，两端观感一致
  - 分区按「显示列」定位而非字符串长度（`displayWidth`：CJK/全角/常见 emoji 记 2 列，终端与浏览器等宽字体一致）；三个易踩的坑已固化为注释与单测：背景必须用空格（句点是可见圆点，会把图案打成散点）、行尾空格不写进源码而由 `padEnd` 统一补齐（行尾空白易被改写且每行宽度必须一致，否则右侧分区逐行错位）、ANSI 的 ESC 用 `String.fromCharCode(27)` 运行时取（源码里不写真实控制字符也不写转义字面量）
  - 纯函数实现 + 15 个单测（`shared/consoleBanner.test.ts` 9 个覆盖核心布局与 ANSI/`NO_COLOR` 降级、`src/utils/consoleBanner.test.ts` 6 个覆盖浏览器 `%c` 渲染层）；`vitest.config.ts` 的 `include` 补上 `shared/**`（原为显式白名单，只收 `src/**` 与 `examples/**`，shared 下的测试不会被收集）

### 功能

- 亮/暗主题切换入口全站接入：原先只有编辑器工具栏能切主题，首页、预览页、登录页都没有入口——用户从首页进来想切亮色，必须先随便打开一个工程进编辑器。现抽取 `ThemeToggle` 组件（默认渲染 Element Plus 图标按钮，预览 HUD 与登录页经作用域插槽复用同一套语义）接入三处：首页顶栏（圆形按钮，与系统设置胶囊同高并列）、预览页 HUD 右侧（emoji 风格，与同排的报警/锁定按钮一致）、登录页右上角浮动玻璃圆钮；编辑器工具栏原按钮与窄屏「更多」菜单项一并改用它，图标（表示当前主题）、提示文案（表示点击后的目标）与切换动作收敛到 `useThemeToggle` 单一来源，不再各处各写一份三元表达式

- 元素叠放次序调整：编辑器右键组件新增「上移一层 / 下移一层」，可精细调整同画布内元素的前后遮挡关系（如把标注提到最上、把背景图压到最下）；已在最顶层/最底层时对应菜单项置灰；操作计入撤销栈（z 序实现为 `canvasStore.moveElementForward/Backward` 并配单测）
- 站点品牌自定义：首页「系统设置 → 站点品牌」（仅管理员）可修改平台名称 / 副标题 / 图标（位图自动居中裁剪缩放为 256×256 PNG、SVG 原样保留），保存后浏览器标签页标题与 favicon 全站即时生效，登录页 / 编辑器 / 预览页同步展示，同一套代码无需重新构建即可部署为「A组态」「B组态」。远程模式新增公开 `GET /api/branding`（未登录可读，数据落 `u/global/` 全局命名空间不随用户隔离）与仅 admin 可写的 `PUT /api/branding`；本地回落模式走存储抽象全局键 `site:branding`（不参与用户命名空间），配置损坏时自动回落默认品牌
- 启动横幅：`pnpm dev` 与 `pnpm server` 启动时终端打印项目名称 + 版本分隔线横幅（Vite 经 `startupBannerPlugin`，存储后端在 listen 回调输出）；前端加载后浏览器控制台同样打印「项目名 + 版本」徽标，名称/版本由 `vite.config.ts` 的 `define` 从 `package.json` 注入（`__APP_NAME__` / `__APP_VERSION__`），单一来源不重复维护
- 元素渲染风格（2D 平面 / 2.5D 立体感）升为**工程级设置**：切换入口唯一落在编辑器工具栏，改动随工程保存与发布，运行端（预览页）只读跟随、不提供切换按钮——原先是会话级偏好（`uiStore.viewMode`），刷新或把预览链接分享出去后展示风格会丢失，且预览头部还有个 2D/3D 切换按钮，运行期可被随意改掉，「编辑所见 = 运行所见」无法保证
- 设备图元开始按「面基 + 光照」统一风格（样板批次）：新增 `src/core/canvas/faceLighting.ts`——`FACE_STYLE` token 表（top/front/side/cap 四类朝向，两端只用 `stop-opacity` 区分明暗）与后处理器 `bakeLighting()` / `flattenFaces()` / `styleIcon()`；图标渲染管线（`iconImage.ts`）改为**先按风格展开光照、再替换 `currentColor`**，缓存键加入风格维度（同一 `type|color` 在两种风格下不是同一个 SVG）。本批迁移 6 台形态各异的设备——储罐与沉淀池（立式/锥底圆柱，筒身 + 顶盖）、泵（蜗壳盘面 + 进/出水管道）、阀门（阀体双斜面 + 手轮）、电机（机体 + 接线盒 + 联轴器）、变压器（线圈盘面）——全部保留各自原有轮廓，只把「面」标出来交给光照，因此设备仍然一眼可辨，但由「平的线条」变成「受光的实体」。**迁移是分批的**：`styleIcon()` 对不含 `data-*` 标注的线条稿原样返回，未迁移的 20 余个组件在两种风格下观感与改造前完全一致，两种画法可以共存

### 优化

- 首页顶栏三个控件去掉 1px 描边：主题切换圆钮、系统设置胶囊、用户胶囊原先都靠 `border: 1px solid var(--border-primary)` 勾轮廓，用户反馈胶囊外圈那道边多余。现三处统一去边框（主题切换是 `el-button`，需显式 `border: none` 而非删声明，否则回落 Element Plus 默认边框），hover 反馈由「描边变色」改为 `box-shadow` 光环 + 位移。去边框后暗色下靠半透明白叠加层仍能看出轮廓，亮色下顶栏本就是白底、那层白叠加会完全糊掉按钮，故补一级实底 `--bg-tertiary`（浅灰，与白色顶栏可区分）、hover 改用亮度微调。顺带修正主题切换按钮的亮色底色：`html[data-theme='light']` 那条原先取 `--bg-secondary`，而亮色下 secondary 正是顶栏底色 `#ffffff`，等于把按钮画成与顶栏同色（注释声称「保证轮廓可见」但实际无效）。`UserChip` 是共用组件，编辑器工具栏的用户胶囊同步失去边框
- 右键菜单视觉升级（对齐悬浮工具条设计语言）：深色胶囊圆角 10px + 品牌青描边 + 深阴影，菜单项悬停高亮圆角化，图标独立灰阶层级；新增分组分隔线能力——「复制 / 存为模板 ‖ 上移 / 下移一层 ‖ 删除 / 锁定」三组视觉分区，亮暗主题均走 CSS 变量适配
- 首页去掉欢迎区与项目网格末尾重复的「新建工程」入口：欢迎区只保留「导入」，新建统一走项目卡片流末尾的「＋ 新建工程」幽灵卡片，无项目时的空状态引导按钮保留，页面不再同时出现两个相同入口
- 顶栏「系统设置」与「用户」两个胶囊高低不齐：系统设置胶囊写死 `height: 34px`，用户胶囊由 32px 头像加上下各 5px padding 撑到 44px，并排差 10px 肉眼可见。新增共享尺寸变量 `--chip-h: 40px`（`variables.scss`，亮暗主题共用）两者各自消费，不再各写各的数值；用户胶囊改为固定高度、上下不 padding 靠 `align-items` 居中，32px 头像上下各留 3px
- 首页顶栏系统设置图标偏小且风格不搭：原用 emoji 字符 `⚙`，Windows 下走 Segoe UI Emoji 渲染成带阴影的彩色齿轮，与全站 Element Plus 扁平线性图标（同一行的下拉 caret 即是）明显不搭，且 22px 圆底里只能排到 12px、显小。改为已全局注册的 Element Plus `Setting` 线性图标（随 `currentColor` 变色），圆底 22→24px、字号 12→15px，并补 `flex: none` 防止被 flex 压扁

### 重构与清理

- `dashboard.scss` 先拆分再加功能：该文件原 533 行已超 AGENTS.md 的 500 行阈值，本次新增顶栏主题按钮样式前，先把项目卡片与缩略图相关样式（`.project-grid`、`.project-card`、`.thumb*`、`.node`、`.pipe`、`.card-*`、`.ghost-*`、`.demo-btn`、`.rename-input`）整体搬到新建的 `project-card.scss`，由首页一并 `import` 保持全局作用域（这些 class 被 `ProjectCard.vue` 与首页幽灵卡片共用，不能收进组件 scoped）。拆分后 343 + 221 行，样式零改动
- 冗余/重复代码专项清理（对外行为不变，全量测试通过）：删除死代码——前端平行账号体系 `src/auth/userLibrary.ts`/`password.ts`（鉴权早已走服务端，只保留登录页用的种子账号常量 `seedUsers.ts`）、三个 store 无人调用的 `toJSON()`、DataSourceManager 与 deviceStore 重复维护的数据快照及 `getData/getDeviceData/getLastError` 死方法、无引用的浮动工具条 FloatingActions 组件与 composable；预览页渲染与编辑器统一口径——图表 overlay 直接复用 `ChartOverlay` 组件、实时值胶囊改用 `elementChrome` 共享配置（修复同一图元在编辑器与预览数值位置不一致）、删除复制粘贴的重复图标绘制；WebSocket/OpcUa 网关适配器抽公共基类 `BaseWebSocketAdapter`（连接生命周期/重连/断开下沉，子类只留握手与解析）；连接状态→文案/Tag 类型/指示灯映射抽取 `src/status/connection.ts` 供首页/预览头部/数据源对话框/点位表四处共用；复制/删除选中元素收敛到 `useEditClipboard` 共享实现（右键菜单复用）；实体 ID 生成统一 `src/utils/id.ts` 工厂（时间戳+随机后缀，杜绝同毫秒批量创建撞 ID）；server 端 JSONL 读写抽 `lib/jsonl.mjs`（审计与通知日志共用，截断策略各自保留）、钉钉/企微机器人发送合并、headers 归一化与 HTTP 发送抽 `notify/common.mjs` 共用、清理文件拆分遗留的错位注释
- 删除 `dashboard.scss` 中重复且从未生效的 `.user-chip`：该文件经 `import` 全局引入（非 scoped），选择器权重低于 `UserChip.vue` 自身 scoped 规则，其 `padding`/`border-radius`/`font-size` 等声明实际从未生效——首页看到的药丸形圆角与间距都来自组件本身（改这段的人会白排查很久），只有 hover 背景真正漏了出来；且与 `toolbar.scss` 那份逐字重复近九成，属误导性死代码。删除后 hover 底色按原值（`var(--bg-tertiary)`）收进 `UserChip.vue` 作单一来源，视觉零变化；`toolbar.scss` 那份因需覆盖紧凑模式（`padding: 4px 8px`、圆角 4px）且是 scoped 不外泄，予以保留
- 移除 Three.js 实时 3D 预览，立体观感统一由 2.5D 承担：`docs/2.5D_ILLUSTRATION_GUIDE.md` 的判据本就把投影/侧面/高光这类**运行期不变化**的立体感划归 2D/2.5D（唯一入口是 `src/core/canvas/depthLayers.ts` 的三层配置），真 3D 只在需要转视角、真实前后遮挡、任意剖切、漫游巡检时才成立，而本项目的实际诉求不含这几项——实时渲染器是纯增重。删除 `src/core/scene3d/`（含 `use3DScene` / `sceneSync` / `deviceModels` / `assemblies` 及全部单测）、`src/views/preview/Preview3DStage.vue`、`scripts/seed-demo3d.mjs`、`ComponentDefinition.model3d` 字段、`vite.config.ts` 的 `chunk-3d` 分包规则与 `three` / `@types/three` 依赖；预览页移除 2D/3D 切换按钮与 `?view=3d` URL 状态。同时把编辑器画布与预览页共用的状态着色注释口径改为「编辑器 / 预览 2D 共用」，不再提及已不存在的 3D 视图
- 删除 `src/core/canvas/depthLayers.ts`，立体感从「元素背后」迁到「图标内部」：旧实现是给每个元素在背后铺一块压暗矩形（`shade(色,-0.35)`、元素同尺寸并偏移若干像素）+ 底部椭圆投影 + 顶部高光条——视觉读数是「一张平的线稿垫了一块深色板」，且那块矩形正是设计方向里明确要避免的「元素上的背景色块」。现改由面基图元自带的渐变与接触阴影表达体积，`CanvasElements.vue` / `PreviewStage.vue` 的三层背景色块与 `viewMode25d` / `is25d` 一并移除。2D / 2.5D 开关的语义随之明确为**光照开关**：`2d` = 面基平涂（关闭光照），`25d` = 面基 + 光照；可动件片段（`ElementMotion` / `getRotorConfigs`）按同一风格渲染，否则机身带光照、可动件是平涂，两者拼在一起会露馅

### 构建

- 提交信息收紧为「标题 ≤ 30 字符 + 细节入 CHANGELOG」，并加 `scripts/hooks/commit-msg` 钩子机械拦截（超长或未知前缀直接拒绝提交，`git commit --no-verify` 可临时绕过）
  - 起因：原约定只规定「一句话说明」，既没有长度上限、也没有「正文」这个位置，细节（理由 / 文件清单 / 指标 / 边界情况）被一路堆进标题——实测最近 30 条提交标题中位数约 150 字符、最长 1033 字符，且 30 条**全部没有正文**，`git log --oneline` 已不可读
  - 校验逻辑在 `scripts/commit-msg-check.mjs`（纯函数 + 13 个单测）：标题长度按「字符」计（一个汉字算 1），而 shell 的 `${#var}` / `wc -c` 在 UTF-8 下按字节算会把中文标题算成 3 倍，故钩子脚本只负责定位与转发
  - 启用（每个克隆执行一次）：`git config core.hooksPath scripts/hooks`；`vitest.config.ts` 的 `include` 相应补上 `scripts/**`（原只收 `src/**`、`shared/**` 与 `examples/**`）

## [0.0.4-261002] - 261002

### 修复

- 管道组件图形与流动虚线比例严重失调：虚线横贯元素全宽，而 SVG 图标按方形等比缩放把横向管件缩成居中一小块，视觉上像「虚线从一个小符号两侧探出一大截」。管道改为原生线条按元素尺寸绘制（上下管壁 + 两端法兰 + 管内流动虚线），任意宽高都对齐清晰；同时虚线颜色跟随状态色（流动青/静止灰）、流量为 0 或数据不可信时虚线停住不再冒充流动、属性面板的「管径」真实映射管身粗细；流动动画重绘范围收敛到单条虚线，不再整层画布跟随 RAF 每帧重算（编辑器与预览页一致）
- dev server 启动后浏览器报「无法访问此网站」：Clash Verge(mihomo) 的 TUN 模式会拦截所有连往 IPv6 回环 `::1` 的连接，而 Node 17+ 下 Vite 默认只监听 `[::1]`，浏览器 IPv6 被拦、IPv4 无人监听。`vite.config.ts` 显式绑定 `127.0.0.1` 走 IPv4 回环绕开拦截（TUN 不劫持 IPv4 回环流量），`/api` 代理目标同步改为 `127.0.0.1`，配置内注释写明原理与局域网联调的临时开启方式
- 纯图形模式（名称与实时数值都关闭）下组件只显示自身图形：去掉四周状态色描边与投影，选中反馈由画布变换器承担；无自绘图形的元素（如数值显示面板）仍保留卡片描边避免不可见；纯图形模式下图标按整块区域居中
- 关闭「显示实时数值」后组件顶部不再残留浅色胶囊底：顶部内层高光与数值胶囊位置重合，现随数值显示一起隐藏（编辑器与预览页一致）

### 功能

- 组件名称与实时数值拆分为两个独立开关（属性面板「显示」区分别控制，新拖入组件默认都不显示，只呈现图形主体）；旧画面的合并开关 `showLabel` 继续兼容回退，渲染效果不变；预览页同步按开关渲染，并修复了预览页名称重复绘制与不跟随开关的问题；移除工具栏中已失效的「显示名称与实时值」全局按钮（重构后点击无效果的死按钮）

## [0.0.3-260930] - 260930

### 优化

- 编辑器视觉升级：工具栏渐变与品牌顶线、组件卡片圆角与悬停抬升、分类 Tab 胶囊选中态、画面页签高亮描边、属性/组件面板统一面板头字距

- 首页工作台改版：欢迎摘要、工程数/已发布/数据源/未确认报警数据条；项目改为卡片流（发布徽章、画面数、快捷打开/预览/配置/发布），支持导入内置示例 Demo；空态引导与发布语义提示

### 新增

- 发布态：工程区分「工作副本」与「发布快照」。工具栏/首页可发布、取消发布；预览默认显示发布版（无发布版则回落草稿），\?source=draft\ 可预览工作副本。保存草稿不影响运行画面，需再次发布才生效；项目重命名/删除会同步发布快照

- 实时点位列表展示数据质量：每个点位带质量标签（正常/陈旧/无数据）与「Xs 前」相对上报时间（每秒自动刷新，悬停看完整时刻）；数据不可信时数值置灰，表头提示陈旧/无数据数量——把"知道数据不可信"从报警延伸到日常查看
- 点表补齐：新增「入库死区」字段（数值点变化幅度小于死区时不写历史，慢变量不再产生大量重复点，实时值与画面不受影响，CSV 含该列）；CSV 导入改为差异摘要确认（明确新增/更新/无变化数量，更新的点位保留原 id）；绑定反查从仅数据绑定扩展到**状态规则**与**报警定义**（递归解析 and/or 嵌套条件）
- 写值支持全类型并引入未登记点位策略：写值对话框按点表 `dataType` 切换输入（数值带量程 / 开关 / 文本，均预填当前值），`checkWriteAllowed` 增加类型一致性校验；工程级「未登记点位写值策略」三档可选（允许 / 提示后允许 / 禁止，默认允许兼容旧行为），在点表管理中设置、随工程保存；Mock 适配器写值支持非数值，写入后的游走与开关量自动兜底；所有拒绝与成功均写审计
- 历史/报警 CSV 导出与窗口聚合查询：服务端 `/api/history/query` 新增 `agg`（min/avg/max）与 `window`（毫秒）参数——7 天的 1 秒采样 60 万点聚合后只剩几百点，长跨度查询不再卡；趋势图弹窗新增聚合粒度选择（自动/原始/按分钟/按小时，自动按范围匹配）与「导出 CSV」；报警面板可导出报警记录（中文表头、带 BOM，Excel 直接打开）
- 示例工程：`examples/demo-project.json` 可直接导入——两张画面（工艺流程 + 趋势监控，含连线流动动画、数值显示、设定值、跳转按钮）与三种图表、4 条点表（含可写点位）、3 条带死区与延时的报警定义，数据源为内置 Mock 导入即可运行；配套 `examples/README.md` 说明导入方式与体验顺序，并由 `demoProject.test.ts` 在 CI 中校验工程结构不会与实现漂移
- 容器部署：新增 `Dockerfile`（前端 node 构建 → nginx 托管，`/api` 反代）、`Dockerfile.server`（存储后端）、`docker-compose.yml`（两服务 + 数据卷）、`docker/nginx.conf`、`.dockerignore`；`docker compose up -d --build` 一条命令起全站，数据落在 `scada-data` 卷
- 部署文档同步：DEPLOY 补齐账号体系（种子账号/角色门禁表/改口令）、用户命名空间与数据目录结构、完整接口一览（auth/history/notify/audit/storage）、历史保留期说明、容器部署章节与升级迁移注意事项；修正了"未内置多用户""无隔离"等过时表述
- 通信中断报警：链路断开或数据停更超过阈值（默认 30 秒）时，持续 5 秒后报出 critical 级「数据源通信 / 链路中断」报警，恢复后自动转入历史；复用报警引擎的延时机制，网络抖动不会误报
- 数据质量：每个点位带质量位（good/uncertain/stale/bad）——超时未刷新（默认 10 秒）或链路断开判为 stale，从未上报或脏值判为 bad；陈旧与脏值不参与报警判定（既不误触发也不误恢复）、不写入历史，画面数值显示 `--` 而不是把过期值摆上去；NaN/Infinity 脏值既不覆盖画面旧值也不入库
- 离线模式工程隔离：后端不在线时前端回落的 localStorage 也按用户命名空间（`u/<userId>/`）组织，与服务端 scope 语义一致，同浏览器切换账号不再互相看到工程；首次启用会把旧的 `scada_*` 本地数据复制到当前命名空间（旧键保留作回退，标志位保证只迁移一次）。会话缓存作为全局键不参与隔离，登出后仍能记住上次登录
- 历史数据本地降级：存储后端离线时，历史采样降级写入存储抽象（`history:<点位>:<日期>`，单日上限 2000 点并按用户隔离），趋势图查询同步读取本地分片——此前离线模式的历史只留在内存、刷新即失；趋势弹窗会提示当前历史来自服务端还是本机

### 优化

- 配置入口迁到首页：系统设置（通知通道、用户管理）在首页顶栏；项目级（数据源/报警/点表）在最近项目行的「配置」菜单，无需进画布。编辑器只保留画布工具、保存预览与账号菜单
- 工具栏信息架构：画布工具区只保留选择/连线/平移/撤销/缩放等编辑操作；报警配置、点表、通知通道、数据源收进「工程设置」下拉；用户管理收进账号菜单；编辑器不再常驻报警铃铛（预览页仍可看报警）

## [0.0.2-260929] - 260929

### 新增

- 实时点位列表：点表对话框新增「实时数据」页，列出数据源已推送的全部设备/变量、当前值，并标注是否已登记点表、单位与可写性，支持搜索
- 写值加固：下发前校验点表 `writable`（只读拒绝）与量程；输入后二次确认（当前值→目标值）；角色/锁定/只读/超范围均写审计
- 工程隔离：KV 存储与历史数据按登录用户分命名空间（`u/<userId>/`），不同账号的工程、自定义组件、设备模板、草稿、趋势历史互不可见。服务主密钥使用 `u/service/`。用户表/通知配置/审计仍为全局。注意：升级后旧数据仍在 DATA_DIR 根目录，需自行迁入对应用户目录或重新保存
- 点表管理：工程级 Tag 档案（设备/变量/描述/单位/类型/量程/可写/备注），支持新增编辑删除、CSV 导入导出（含表头别名与引号字段）、关键字搜索，并可反查该点位绑定了哪些画面元素。工具栏新增「点表管理」入口，随工程保存/加载/导出
- 通知发送记录：触发/恢复/测试/节流均落 `DATA_DIR/_notify_log.jsonl`（保留最近 500 条），通知对话框新增「发送记录」页，可刷新与清空，便于排查为何没收到消息
- 报警外发通知：支持 Webhook / 企业微信机器人 / 钉钉机器人（可加签）/ 邮件 SMTP / 短信 HTTP 网关五种通道。配置与密钥存服务端 `DATA_DIR/_notify.json`（工程师+ 可管理），报警触发/恢复按级别与时机扇出，同通道默认 60 秒节流，可对单通道做连通性测试。工具栏新增「通知通道」入口
- 后端账号/会话鉴权：`POST /api/auth/login` 发行会话 Token，口令 scrypt 哈希存 `DATA_DIR/_users.json`；用户管理 API（建号/改角色/改口令/删除，保留最后管理员）；角色门禁——存储写需工程师+，历史上报需操作员+，用户管理仅管理员；审计接口 `POST/GET /api/audit` 操作者由服务端会话注入不可伪造。可选 `AUTH_TOKEN` 作为服务主密钥。前端登录/用户管理/写值审计已切换到该接口
- 登录与角色：会话登录页（/login），角色「观察员 / 操作员 / 工程师 / 管理员」；工程师及以上可进编辑器，操作员及以上可写值（无权限写值会留审计「被拒绝」），管理员可管理用户（建号/改角色/改口令/删除，至少保留一名管理员）。口令 SHA-256+盐存储，审计操作者记为当前登录身份。种子账号 admin/engineer/operator（见登录页，生产请改口令）
- 设备模板：右键画布元素「存为模板」，打包图形尺寸/组件属性/数据绑定/状态规则；组件库「自定义组件」Tab 可拖入实例化（自动建议设备 ID，保留规则与绑定），支持删除模板。模板持久化到存储，与工程解耦，刷新后仍可用
- 组件库三分类 Tab：基础组件（基础/管道/电气/图表）、行业组件（煤矿/电厂/化工/水处理）、自定义组件，页内切换避免面板过长；自定义 Tab 空态仅提示「暂无自定义组件」
- 多画面导航：工程支持多张画面（页签新建/重命名/复制/删除，至少保留一张）；元素属性可配置「点击跳转」目标画面，预览运行时点击即切换；预览顶栏提供画面下拉，`/preview?project=&page=` 可指定起始画面。工程文件升级为 `pages[]` 结构（version 1.1），旧版单画布工程自动迁移为「主页」，顶层 canvas/connections/layers 仍作为兼容快照写出。切换画面会清空撤销栈，避免串页
- 写值安全闭环：运行态写值锁定（预览页一键锁定，锁定后拒绝一切下发并留痕"被拒绝"）；写值审计日志（时间/操作者/目标点位/写入值/成功失败与原因），随存储后端持久化、保留最近 500 条，预览页可查看与清空——写值从"只弹确认"升级为可追溯的危险操作
- MQTT 数据源（over WebSocket，浏览器直连 Broker 无需网关）：主题即设备（可配订阅过滤器与主题前缀），payload 支持扁平变量表与统一格式两种；写值发布到 `<设备>/set`（QoS 1），由现场侧 Node-RED/网关程序下发到设备；自动重连与凭据可选
- 历史数据落盘：存储后端新增轻量时序存储（按天分片 JSONL，保留期可配 `HISTORY_RETENTION_DAYS`，默认 30 天每日自动清理），接口 `POST /api/history/write` 批量追加、`GET /api/history/query` 区间查询（服务端抽稀到指定点数）；前端 historian 模块 5 秒批量上报（连续失败自动停用不影响画面），趋势图弹窗新增时间范围切换（实时/1 小时/24 小时/7 天，历史范围 30 秒自动刷新）——刷新页面后不再丢失历史曲线
- 图表组件（ECharts）：新增趋势图/柱状图/饼图三种画布图元，拖入后绑定设备变量即可上图；折线/柱状每条绑定是一个系列，饼图每条绑定是一个扇区；趋势图取自历史缓冲、可配显示点数，超限时均匀抽稀保留首尾；渲染用 HTML overlay 叠加 Konva 画布（编辑态指针穿透，拖拽/缩放/选中交互不变），按需引入控制产物体积
- 数值显示图元支持工程量换算：显示值 = 原始值 × 倍率 + 偏移（如原始 1100 配倍率 0.001 即显示 1.1 千米），倍率缺省按 1 处理、旧画面行为不变；属性面板数字属性支持自定义步进（此前写死 1，无法输入 0.001 类倍率）
- 报警解耦：新增工程级独立报警定义（绑定设备+变量，不依赖画布元素），支持死区（回差抑制临界抖动）与延时触发（过滤瞬时毛刺）；判定下沉到纯函数 `alarmEngine`（时间戳推进而非定时器，断数期间保持现状不误恢复）；报警定义随工程保存/加载/导入导出，报警历史按工程持久化到存储后端，跨会话可追溯
- 报警配置对话框：列表管理（新增/编辑/删除/启用开关），条件支持比较与区间，实时预览设备候选变量；工具栏新增入口
- 写值通道（控制下行）：`DataSourceAdapter` 新增可选 `write()`，Mock/WebSocket 适配器实现（Mock 直接生效，WebSocket 发送 `{type:'write'}` 命令帧）；新增「设定值」组件，预览页点击后输入数值并确认即可向绑定变量下发，未绑定/不支持写值时给出明确提示
- 预览页接入报警铃铛（含未确认数量徽标）与趋势图：点击已绑定变量的元素即可查看近期曲线
- 编辑会话数据安全：每 30 秒自动写入草稿，再次进入编辑器时提示恢复，关闭标签页前触发浏览器离开确认
- 数据源配置随工程持久化：保存、加载、导出、导入均携带 `dataSource` 字段，不再每次打开都要重填地址
- 预览页支持 `/preview?project=工程名` 直接打开，工具栏「预览」自动带上工程参数
- 预览页加载工程失败时给出明确提示，不再静默白屏
- 报警中心：报警判定下沉到 `alarmStore`，独立于 UI 组件持续刷新；状态规则新增 `severity` 字段（正常/预警/报警），内置组件规则按语义标注，阀门关闭与设备停机一律判为正常
- 报警记录：支持单条/批量确认，条件恢复后自动转入历史并保留最近 100 条
- 趋势图：X 轴按真实时间戳映射（原按数组下标，采样不均时失真），新增时间刻度与空数据态提示
- Mock 数据改为带惯性的均值回复随机游走，趋势图呈现斜坡与平台，不再逐帧跳变
- 历史数据采集：按设备+变量维护最多 300 点的环形缓冲区，趋势图弹窗实时刷新
- 属性面板绑定行新增趋势图入口
- 工具栏铃铛按钮与报警数量徽章
- LICENSE（MIT）
- ESLint 配置（`eslint.config.js`）与配套依赖，`pnpm lint` 恢复可用
- 存储后端（server/index.mjs，零依赖 Node KV 服务）：项目/自定义组件/主题持久化到服务端文件，前端启动自动探测（在线用远程、离线回落 localStorage）
- 数据源配置对话框新增实时数据视图：展示全部设备的变量名与当前值
- 自定义组件：组件库面板"+"创建（名称/基础形状/尺寸/线条颜色），注册进分组并可拖入画布，持久化到浏览器；支持编辑与删除
- 连线属性编辑器：选中连线可切换类型（直线/折线/曲线，自动重算路径）与编辑样式（颜色/线宽/流动动画/流速/方向）
- 数据绑定编辑：属性面板可直接添加/删除绑定变量
- 画布导出图片（PNG）
- 主题体系升级：引入 Element Plus 官方暗色变量（html.dark），主题在全部页面（含首页）一致生效
- 组件库两列网格卡片布局
- 首页"打开项目"卡片可用，最近项目显示真实修改时间
- 项目重命名：编辑器点击项目名称、首页双击项目名就地重命名（含存储键迁移与重名保护）
- 编辑器 Logo 点击返回主页（含未保存确认）
- 404 路由兜底：未知路径回首页

### 修复

- `pnpm lint` 在 ESLint 9.39 下崩溃：`eslint-plugin-vue@9.0.0` 调用的 `Linter.getRules()` 已被 flat config 禁用，升级至 ^9.33.0；同步修复配置——显式注册 `@typescript-eslint` 插件与 TS parser，`.ts` 与 `.vue` 拆成两个配置块避免 parser 互相覆盖，关闭与 TS 版规则冲突的基础 `no-unused-vars`
- 状态规则表达式不再用 `Function` 执行：改为零依赖的受限解析器（仅比较/逻辑/四则与白名单数学函数），杜绝导入工程文件在浏览器执行任意代码与变量名注入；字符串变量首次支持 `status == "run"` 文本比较，求值失败仍按 false 兜底
- 报警徽标在弹层关闭后冻结：报警判定原本写在 popover 内的组件里，组件随弹层销毁而停摆，现已改由 store 驱动
- 元素锁定被误当作"不参与报警"：锁定仅用于防止误拖拽，不再影响运行时报警判定
- 报警判定依赖颜色字符串反推是否为报警，自定义规则会漏报/误报，改为显式的 severity 字段
- 报警在值恢复正常后直接从列表消失无法追溯，现保留历史记录
- 趋势图 SVG 缺少 viewBox 却设置了 `width: 100%`，画布横向拉伸导致折线与坐标轴错位
- 趋势图定时器重复创建导致句柄泄漏
- Mock 数据逐次独立抽样导致报警列表每秒闪烁、趋势图呈白噪声锯齿
- `pnpm lint` 因缺少 eslint 依赖与配置文件而无法运行；ESLint v9 已移除 `--ext`，脚本同步调整
- 数据源配置从未落盘：它只存在于对话框组件内部，保存工程时不写入、重开后丢失，导致运行时无配置可用
- 预览页数据源硬编码 mock：改为按工程保存的配置连接，编辑器里配的 WebSocket / HTTP 轮询 / OPC UA 在运行视图正式生效
- 预览页刷新后画面丢失：原先依赖内存中的工程名取数，直开或刷新会退化到默认的「未命名项目」
- 未保存标记恒为 false、返回主页从无保存提醒：`markDirty()` 此前没有任何调用点，现统一收口到历史快照，并用基线区分"打开工程时的初始状态"与"真实编辑改动"
- 撤销与重做不会标记工程为已修改，导致改动被静默丢失
- 浏览器崩溃或误关标签页会丢失全部编辑内容，现由自动草稿兜底
- 打开或导入其它工程后数据源不跟随切换：现监听工程配置变化自动重连
- 新建项目残留上一项目的画布元素与连线，一保存即覆盖原工程
- 首页表格行背景未适配暗色
- 状态规则表达式逻辑运算符支持大小写 AND/OR
- 测试文件 import 路径错误导致测试套件无法加载
- 连线模式下组件拖拽劫持端口拖拽，连线无法建立
- 实时状态着色因元素 ID 与数据源设备 Key 不匹配而永不生效
- 组件库/属性面板内容过多被裁切且无法滚动
- 首页最近项目"最后修改"恒显示"未知"
- 暗色模式下拉浮层、表格行、属性面板按钮/输入框/滑杆手柄等亮色残留

### 清理

- 拆分预览页与工具栏：`preview/` 下出 `PreviewHeader` / `PreviewStage` / `useWriteValue`，`toolbar/` 下出 `useEditClipboard` / `useProjectActions` / `useToolbarShortcuts`，长视图与长工具栏降到 160～380 行，行为不变
- 拆分 PropertyPanel（约 640 行 → 外壳 170 行）：连线属性、元素几何/组件属性、导航与数据绑定拆到 `components/layout/property/` 子组件，行为不变
- 预览页不再重复实现 `getElementColor` / `getElementValueText` / `getLabelHeight` / `getIconImageConfig` / `isLayerVisible`，改为与编辑器共用 `useElementVisuals`（顺带补齐运行视图图标此前缺失的 `listening: false`，减少命中检测开销）
- CHANGELOG `[Unreleased]` 中重复堆砌的多个「### 修复」区块合并去重
- `node_modules` 移出 git 跟踪；移除未使用的类型导入、死代码文件与冗余字段
- 重构 ScadaCanvas.vue（987 → 497 行）：逻辑拆分为视口/网格/元素渲染/框选/连线/拖拽 6 个组合式函数

### 文档

- 新增 `docs/USER_GUIDE.md` 使用说明书与 `AGENTS.md` AI 编码代理工作指南
- README 特性清单同步至实际实现状态

### 测试

- 新增 severity 解析与 alarmStore 共 13 个用例（报警判定、恢复入历史、确认、级别排序、数据源推送自动刷新）

## [0.0.1] - 260531

- 项目初始骨架：编辑器/预览/首页三页面、Konva 画布、组件面板、状态引擎、Mock 数据源框架、图层与连线数据模型及文档
