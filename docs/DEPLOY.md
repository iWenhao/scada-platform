# 部署指南

本文说明如何把 SCADA Platform 部署到生产环境：前端静态资源 + 存储后端（`server/index.mjs`）。

- 本地开发 / 界面操作请看 [USER_GUIDE.md](./USER_GUIDE.md)
- 架构与二次开发请看 [README.md](../README.md)
- 环境变量清单见根目录 [.env.example](../.env.example)

---

## 1. 架构与角色

| 组件 | 是什么 | 怎么跑 |
|------|--------|--------|
| 前端 | Vue 3 + Vite 构建出的静态文件 | 任意静态托管（Nginx / CDN / 对象存储） |
| 存储后端 | 零依赖 Node 服务：KV 存储（项目/自定义组件/设备模板/草稿）+ 时序历史 + 账号会话 + 通知外发 + 审计 | `node server/index.mjs` |
| 实时数据 | 浏览器直连 WebSocket / HTTP / OPC UA 网关 / MQTT Broker | 不经过存储后端，与本文无关 |

前端通过相对路径 `/api/**`（可配置）访问存储后端。后端不在线时，前端会回落到浏览器 localStorage：
组态编辑仍可用，历史采样转为本机暂存，但项目不落服务端、也不跨设备同步。

```
浏览器 ──► 静态托管 (dist/)
  │
  ├─► GET/POST /api/**  ──► 存储后端 (node server/index.mjs)
  │                          ├─ KV 存储   u/<userId>/*.json
  │                          ├─ 时序历史   u/<userId>/history/
  │                          └─ 全局       _users.json / _sessions.json
  │                                       _notify.json / _notify_log.jsonl / _audit.jsonl
  │
  └─► ws://... / http://... / mqtt  ──► 你的实时数据源 / OPC UA 网关 / MQTT Broker
```

---

## 2. 前置要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 18 | 构建与运行存储后端 |
| pnpm | ≥ 8（推荐 10+） | 安装依赖、构建前端 |
| Nginx | 任意近期稳定版 | 示例配置用；也可换成 Caddy / Apache |

在构建机上：

```bash
pnpm install
pnpm build          # 产出 dist/，含 vue-tsc 类型检查
```

---

## 3. 场景 A：同机同域（推荐起步）

前端和存储后端在同一台机器、同一域名。浏览器只访问一个站点，无 CORS。

### 3.1 启动存储后端

```bash
# 在项目根目录
PORT=5174 \
DATA_DIR=/var/lib/scada/data \
AUTH_TOKEN=change-me \
CORS_ORIGIN=https://scada.example.com \
HISTORY_RETENTION_DAYS=30 \
node server/index.mjs
```

说明：

- `DATA_DIR` 指到系统盘以外或独立数据目录，方便备份/挂卷
- `AUTH_TOKEN` 是**服务主密钥**（可选）：设置后该 Token 拥有全部权限，用于探针/CI/无浏览器场景。日常访问用登录会话（见 §5.4），不要把主密钥分发给操作员
- 同域反代时 `CORS_ORIGIN` 可随意（不会用到预检），但建议仍写上前端站点
- `HISTORY_RETENTION_DAYS` 控制时序历史保留天数，超期分片每日自动清理
- **首次启动会自动创建种子账号** `admin/engineer/operator/viewer`，四个账号共用一个**随机初始口令**，只在首启那次的日志里打印一次（详见 §5.4，登录后必须改）

验证：

```bash
curl -sS http://127.0.0.1:5174/api/health
# 未设 AUTH_TOKEN: {"data":{"status":"ok"}}
# 已设 AUTH_TOKEN 且不带头: {"error":{"code":"unauthorized","message":"请先登录"}}  (HTTP 401)

curl -sS -H "Authorization: Bearer change-me" http://127.0.0.1:5174/api/health
# {"data":{"status":"ok"}}

# 登录取会话 Token（种子账号，仅首次验证用）
# 口令取首启日志里「初始口令:」那一行的值；部署时用 SEED_PASSWORD 固定过就用你设定的那个
curl -sS -X POST http://127.0.0.1:5174/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"<初始口令>"}'
# {"data":{"token":"...","expiresAt":...,"user":{...}}}
```

### 3.2 前端构建

同域部署时 API 根路径保持默认 `/api` 即可，**不需要**改 `VITE_API_BASE`。

若启用了鉴权，构建时注入 Token（会打进 JS，见 §6 安全说明）：

```bash
VITE_API_TOKEN=change-me pnpm build
```

### 3.3 Nginx 示例

```nginx
server {
    listen 80;
    server_name scada.example.com;

    # 前端静态资源
    root /var/www/scada/dist;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 存储后端反代
    location /api/ {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 项目 JSON 可能较大
        client_max_body_size 25m;
        proxy_read_timeout 60s;
    }
}
```

把 `dist/` 拷到 `/var/www/scada/dist`，`nginx -s reload` 后访问 `https://scada.example.com`。

### 3.4 systemd 托管存储后端（可选但推荐）

`/etc/systemd/system/scada-server.service`：

```ini
[Unit]
Description=SCADA Platform storage server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/scada-platform
ExecStart=/usr/bin/node server/index.mjs
Environment=PORT=5174
Environment=DATA_DIR=/var/lib/scada/data
Environment=AUTH_TOKEN=change-me
Environment=CORS_ORIGIN=https://scada.example.com
Environment=MAX_BODY_BYTES=20971520
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now scada-server
systemctl status scada-server
```

---

## 4. 场景 B：前后端分开部署（分机或分域）

前端在 CDN / 静态托管，存储后端在另一台机器或另一个域名。

### 4.1 后端

在 API 机器上启动（同 §3.1），`CORS_ORIGIN` **必须**写前端站点：

```bash
PORT=5174 \
DATA_DIR=/var/lib/scada/data \
AUTH_TOKEN=change-me \
CORS_ORIGIN=https://scada.example.com \
node server/index.mjs
```

多个前端来源用逗号分隔：

```bash
CORS_ORIGIN=https://scada.example.com,https://scada-admin.example.com
```

### 4.2 前端构建

把 API 根路径指到后端完整地址：

```bash
VITE_API_BASE=https://api.example.com/api \
VITE_API_TOKEN=change-me \
pnpm build
```

| 变量 | 示例 | 说明 |
|------|------|------|
| `VITE_API_BASE` | `https://api.example.com/api` | 不要漏末尾的 `/api`；结尾 `/` 会被自动去掉 |
| `VITE_API_TOKEN` | 与后端 `AUTH_TOKEN` 一致 | 后端未开鉴权则留空 |

### 4.3 API 机器上的 Nginx（可选）

若希望 API 也走 443，可在 API 机再套一层反代：

```nginx
server {
    listen 443 ssl;
    server_name api.example.com;
    # ssl_certificate ...;

    location /api/ {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 25m;
    }
}
```

### 4.4 验证

```bash
# 健康检查（带 Token）
curl -sS -H "Authorization: Bearer change-me" https://api.example.com/api/health

# 跨域预检（Origin 需在 CORS_ORIGIN 内）
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: https://scada.example.com" \
  -H "Access-Control-Request-Method: PUT" \
  https://api.example.com/api/storage/set
# 响应头应含 access-control-allow-origin: https://scada.example.com
```

浏览器打开前端 → 开发者工具 Network，刷新后应看到 `/api/health` 为 200，存储读写走远程而不是 localStorage。

---

## 5. 环境变量参考

### 前端（`pnpm build` 时注入）

| 变量 | 默认 | 说明 |
|------|------|------|
| `VITE_API_BASE` | `/api` | 存储 API 根路径。同源反代保持默认；跨域填完整地址 |
| `VITE_API_TOKEN` | 空 | Bearer Token，与后端 `AUTH_TOKEN` 一致 |

### 后端（`node server/index.mjs`）

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `5174` | 监听端口 |
| `HOST` | `127.0.0.1` | 监听地址，默认只本机可访问；容器/局域网部署改 `0.0.0.0` |
| `DATA_DIR` | `<项目>/server/data` | 数据目录：用户空间 `u/<userId>/` + 全局 `_*.json` |
| `MAX_BODY_BYTES` | `20971520`（20MB） | 单次写入上限，超出返回 413 |
| `CORS_ORIGIN` | `*` | 允许的跨域来源，逗号分隔；生产不要用 `*` |
| `AUTH_TOKEN` | 空 | 可选**服务主密钥**（Bearer），设置后拥有全部权限；登录会话仍可用 |
| `SEED_PASSWORD` | 空 | 仅**首次启动**建种子账号时生效；留空则随机生成并打印在启动日志（见 §5.4）。已有 `_users.json` 时不改口令 |
| `HISTORY_RETENTION_DAYS` | `30` | 时序历史保留天数，超期分片每日自动清理；`0` 表示不清理 |
| `NOTIFY_ALLOW_PRIVATE` | `0` | 通知外发是否放行内网/回环地址；默认拦截防 SSRF，现场 webhook 确在内网时设 `1` |
| `NOTIFY_TIMEOUT_MS` | `10000` | 通知 HTTP 请求超时（毫秒），非正数回落默认值 |
| `SMTP_REJECT_UNAUTHORIZED` | `1` | SMTP 是否校验服务器证书；自签证书邮件服务器设 `0` |

### 5.3 接口一览

**响应只有两种形状**（服务端唯一出口 `server/lib/http.mjs` 的 `sendData` / `sendFail`，前端唯一入口 `src/api/client.ts` 的 `apiFetch`）：

| 情形 | HTTP | 响应体 |
|------|------|--------|
| 成功 | 2xx | `{ "data": <负载>, "meta": { … } }` — `meta` 为空时整个键省略 |
| 失败 | 4xx / 5xx | `{ "error": { "code": "<机器码>", "message": "<中文说明>" } }` |

- **成功与否只看 HTTP 状态码**，响应体里不再有 `ok` 字段，也不再有「200 但 body 带 error」这种要拆开才知道结果的情况。
- `data` 这个键**永远存在**（无负载时是 `null`）；etag、分页统计、写入条数这类附属信息一律放 `meta`，不混进 `data`。
- `code` 是稳定英文机器码，客户端按它分支；`message` 是给人看的中文，改措辞不该改逻辑。前端拿不到信封时（反向代理返回 HTML、进程刚崩）回落成 `http_error`。
- 5xx 的 `message` 固定为「服务内部错误」——fs 错误的原始 message 带绝对路径，不回显给客户端，详情进服务端日志。

常见错误码：

| code | HTTP | 含义 |
|------|------|------|
| `unauthorized` | 401 | 未登录 / 会话过期 |
| `login_failed` | 401 | 用户名或口令错误（也用于账号被限流，避免枚举） |
| `forbidden` | 403 | 角色不足 |
| `not_found` | 404 | 路径未匹配 |
| `invalid_json` | 400 | 请求体不是合法 JSON |
| `invalid_key` | 400 | 缺少 `key` 参数或 key 非法/过长 |
| `payload_too_large` | 413 | 请求体超过 `MAX_BODY_BYTES` |
| `key_exists` | 409 | `?mode=create` 撞名，未覆盖 |
| `version_stale` | 409 | `?ifMatch=` 版本落后，工程在别处被改过 |
| `username_exists` / `last_admin` | 409 | 用户名重复 / 不能删掉或降级最后一名管理员 |
| `user_not_found` | 404 | 用户不存在 |
| `password_too_short` / `old_password_incorrect` | 400 | 新口令过短 / 旧口令不对 |
| `channel_not_found` | 400 | 测试/外发时该通道未配置 |
| `channel_send_failed` | 502 | 通知外发失败（`meta` 带通道 id 与名称） |
| `internal_error` | 500 | 服务内部错误 |

| 方法 | 路径 | 说明 | 所需角色 |
|------|------|------|----------|
| GET | `/api/health` | 健康检查 → `data:{ status:"ok" }` | 无 |
| POST | `/api/auth/login` | 登录，`data` 为 `{ token, expiresAt, user }` | 无 |
| POST | `/api/auth/logout` | 注销当前会话 | 登录 |
| GET | `/api/auth/me` | 当前登录用户与角色 | 登录 |
| POST | `/api/auth/password` | 修改自己的口令 | 登录 |
| GET/POST/PUT/DELETE | `/api/auth/users` | 用户管理（列/建/改/删） | admin |
| GET/PUT | `/api/notify/channels` | 通知通道配置（Webhook/企微/钉钉/邮件/短信） | engineer+ |
| POST | `/api/notify/test` | 对某通道做连通性测试 | engineer+ |
| GET/DELETE | `/api/notify/log` | 通知发送记录（最近 500 条） | engineer+ |
| POST | `/api/notify/send` | 服务端主动外发（报警扇出） | 内部 |
| POST/GET | `/api/audit` | 写值审计（写入/查询），操作者由会话注入、不可伪造 | 登录 |
| GET | `/api/keys` | 列出**当前用户空间**的全部 key → `data: string[]` | 登录 |
| GET | `/api/storage/get?key=` | 读取 → `data` 为文本值，`meta.etag` 为版本指纹 | 登录 |
| PUT | `/api/storage/set?key=` | 写入（body 为文本）→ `meta.etag` 为新版本；`?mode=create` 撞名回 409 `key_exists`，`?ifMatch=` 版本落后回 409 `version_stale` | engineer+ |
| DELETE | `/api/storage/remove?key=` | 删除 | engineer+ |
| GET | `/api/storage/projects?limit=&offset=&keyword=` | 工程列表分页摘要 → `data` 为摘要数组，`meta` 带 `total` / `publishedTotal` / `matchedTotal` | 登录 |
| POST | `/api/history/write` | 批量追加时序采样 → `meta.written` 为写入点数 | operator+ |
| GET | `/api/history/query?key=&from=&to=&maxPoints=` | 区间查询（服务端抽稀）→ `data` 为采样数组 | 登录 |

说明：

- 未登录访问受保护接口返回 401 `unauthorized`；角色不足返回 403 `forbidden`
- 持有 `AUTH_TOKEN`（服务主密钥）时跳过角色检查，按全权限处理
- `OPTIONS` 预检永不鉴权

### 5.4 账号与角色

首次启动（`DATA_DIR/_users.json` 不存在）写入四个种子账号，**共用同一个随机初始口令**：

| 用户名 | 角色 |
|--------|------|
| `admin` | 管理员 |
| `engineer` | 工程师 |
| `operator` | 操作员 |
| `viewer` | 观察员 |

- 口令由 `randomBytes(9)` 生成，**只在首启那次的日志里打印一次**，不落任何文件、也不经接口回显——部署时把这一行抄进密码管理工具
- 想固定口令：首启前设 `SEED_PASSWORD`（见 `.env.example`），留空即随机
- 日志已丢失（如容器重建）时口令无法找回，只能删 `_users.json` 让服务重新播种；种子 id 固定为 `usr_seed_0..3`，工程数据在 `u/<userId>/` 下按 id 存放，所以重新播种后原有工程仍可访问
- **上线后必须改口令**（用户管理界面或 `/api/auth/password`）

角色能力（等级 `viewer < operator < engineer < admin`）：

| 能力 | viewer | operator | engineer | admin |
|------|:------:|:--------:|:--------:|:-----:|
| 查看画面/报警/趋势 | ✅ | ✅ | ✅ | ✅ |
| 进入编辑器 | — | — | ✅ | ✅ |
| 下发写值 | — | ✅ | ✅ | ✅ |
| 上报历史数据 | — | ✅ | ✅ | ✅ |
| 保存工程/改数据源 | — | — | ✅ | ✅ |
| 通知通道配置 | — | — | ✅ | ✅ |
| 用户管理 | — | — | — | ✅ |

约束：口令以 scrypt 哈希存 `DATA_DIR/_users.json`，永不回传前端；最后一名 admin 不能被降级或删除；删除用户会同时踢掉其全部会话。

### 5.5 数据目录结构

```
DATA_DIR/
├── u/<userId>/                 用户命名空间（登录用户各自的工程与历史）
│   ├── scada_project_*.json    工程（含 pages[] 多画面、点表、报警定义、数据源配置）
│   ├── scada_components.json   自定义组件
│   ├── scada_template_*.json   设备模板
│   ├── scada_draft_*           未保存草稿
│   └── history/                时序历史 <key>.<YYYYMMDD>.jsonl
├── u/anonymous/                未登录/匿名访问的空间
├── u/service/                  持有 AUTH_TOKEN 主密钥时写入的空间
├── _users.json                 账号表（全局，scrypt 哈希）
├── _sessions.json              会话表（全局，带 TTL；只存令牌的 SHA-256 摘要，不存明文令牌）
├── _notify.json                通知通道配置（全局）
├── _notify_log.jsonl           通知发送记录（全局，最近 500 条）
├── _audit.jsonl                写值审计（全局，最近 500 条）
└── .lock                       单实例锁（见 §5.6，运行期文件，不要纳入备份）
```

备份时整目录打包即可。注意 `_*.json` / `_*.jsonl` 为**全局**数据，不随用户空间隔离。

磁盘只落摘要意味着：拿到 `DATA_DIR` 的备份不等于拿到可用的登录凭证。代价是**升级到摘要版本后，旧版留下的明文会话一律作废**，在线用户需重新登录一次（启动时该文件会被就地改写成摘要格式，明文不再留在盘上）。

### 5.6 单实例约束

**一份 `DATA_DIR` 只允许一个后端实例。** 这不是建议而是启动时的硬性检查：进程启动会抢 `DATA_DIR/.lock`，抢不到就打印原因并以退出码 1 结束。

为什么要挡：服务里的写入串行化是**进程内**的（同路径的原子替换排在一个 `Map` 里），账号表与会话表在启动时读进内存、之后整份回写。两个实例共用一个数据目录时的表现不是报错而是静默丢数据——A 登录的会话 B 不认、两份内存账号表互相覆盖 `_users.json`、创建键的存在性检查与替换之间有竞态窗口。换端口绕不开：两个实例可以各绑一个端口指向同一个 `DATA_DIR`。

判活规则（`server/lib/singleInstanceLock.mjs`）：

| 磁盘上的锁 | 判定 | 依据 |
| --- | --- | --- |
| 同机 + 持锁 pid 还在 | 拒绝启动 | pid 是最可靠的存活证据 |
| 同机 + 持锁 pid 已退出 | **立刻接管**，不等陈旧窗口 | 崩溃/`kill -9` 后重启不必干等；实测 238ms 起服务 |
| 跨机（共享卷）+ 心跳 60 秒内更新过 | 拒绝启动 | 对方的 pid 在本机无意义，只能用心跳 |
| 心跳超 60 秒没更新 | 接管 | 兼作 crash 残留与 pid 复用的兜底 |
| 内容半截/无法解析 | 接管 | 续期途中被杀留下的坏文件 |

持锁进程每 15 秒续一次心跳（`updatedAt`）；正常退出（含端口占用导致启动失败）会删掉锁，异常退出留下的锁由上面的接管规则处理。

边界说清楚，免得误以为它代替了数据库：这是**启动门禁，不是 fencing token**。抢到锁后若进程被挂起超过 60 秒，另一个实例可能判定锁已失效并接管，此时旧进程只停止续期并在日志里报错（`单实例锁已被其它进程接管`），不会熔断正在进行的写入——文件系统层给不出真正的隔离手段。确实要多实例并发，请换数据库；给每个实例各配一份独立 `DATA_DIR` 虽然能绕过这把锁，但代价是两份数据从此各自漂移，不再有"同一个站点"。

---

## 6. 生产加固清单

上线前逐项确认：

- [ ] **改掉种子口令**：四个账号首启时共用同一个随机口令，必须逐个改成各自独立的口令（用户管理界面或 `/api/auth/password`），否则任一账号泄露等于四账号全泄露
- [ ] **账号收敛**：删除不再使用的账号；确认至少保留一名 admin
- [ ] **服务主密钥**：如设置 `AUTH_TOKEN`，用强随机值并妥善保管，**不要**注入前端构建（日常用登录会话）
- [ ] **CORS**：`CORS_ORIGIN` 只列真实前端站点，不再使用 `*`
- [ ] **HTTPS**：Nginx 配好证书；只开 80 会把会话 Token 与口令明文暴露在网络上
- [ ] **数据持久化**：`DATA_DIR` 在独立目录/挂卷；纳入备份（含 `u/<userId>/` 与全局 `_*.json`）
- [ ] **请求体上限**：`MAX_BODY_BYTES` 与 Nginx `client_max_body_size` 匹配（建议 Nginx 略大）
- [ ] **历史保留期**：按磁盘容量设定 `HISTORY_RETENTION_DAYS`（点位多、采样密时需评估：1 个点位 1 秒采样约 86400 行/天）
- [ ] **通知密钥**：Webhook/企微/钉钉/邮件 SMTP/短信网关的密钥存服务端 `_notify.json`，不要写进前端或镜像
- [ ] **进程守护**：systemd / 容器重启策略（`Restart=on-failure`）
- [ ] **单实例**：一份 `DATA_DIR` 只跑一个后端（启动会抢 `DATA_DIR/.lock`，见 §5.6）。**副本数 >1 属于未支持部署**，`replicas` 保持 1、挂卷不要开 `ReadWriteMany` 给多个 Pod
- [ ] **健康检查**：对 `/api/health` 做监控；后端挂了前端会回落 localStorage，用户可能"能打开但保存不生效、历史只在本机"
- [ ] **防火墙**：5174 只对本机或内网开放；对外只暴露 80/443

### 关于 `VITE_API_TOKEN` 的定位

它是**服务主密钥**，构建后会打进前端 JS，任何浏览器用户都能读到。因此只适合：

- 内网可信环境、无人值守探针、CI 校验

日常使用请走**登录会话**：操作员用自己的账号登录，服务端按角色授权，审计记录里的操作者由会话注入、无法伪造。需要按用户隔离项目时，登录会话本身就是隔离依据（见 §5.5）。

---

## 7. 容器部署（Docker Compose）

仓库已附带编排文件，一条命令起全站：

```bash
docker compose up -d --build
# 浏览器打开 http://localhost:8080
# 首次启动会创建种子账号（见 §5.4，务必改口令）
```

### 7.1 服务构成

| 服务 | 镜像来源 | 职责 | 端口 |
|------|----------|------|------|
| `web` | `Dockerfile`（node 构建 → nginx 托管） | 静态资源 + `/api` 反代 | 宿主 `8080` → 容器 80 |
| `server` | `Dockerfile.server`（node:20-alpine） | 存储后端：KV / 时序历史 / 账号会话 / 通知 / 审计 | 仅容器网络内 5174 |

数据在命名卷 `scada-data`（挂载到 `server` 的 `/data`），**重建或升级容器不丢数据**。

### 7.2 常用操作

```bash
docker compose logs -f server      # 看后端日志（种子账号提示、清理记录）
docker compose ps                  # 健康检查状态
docker compose down                # 停止（保留卷）
docker compose down -v             # 停止并删除卷（会清空账号与工程！）

# 备份：直接打包卷内容
docker run --rm -v scada-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/scada-data-$(date +%F).tar.gz -C /data .
```

### 7.3 生产化调整

1. **改端口/域名**：编辑 `docker-compose.yml` 的 `ports` 与 `CORS_ORIGIN`
2. **HTTPS**：在 `web` 前加一层反代（Traefik / Caddy / 宿主 Nginx），不要在容器内配证书
3. **前后端分域**：`web` 的 build-arg 改 `VITE_API_BASE: https://api.example.com/api`，`server` 的 `CORS_ORIGIN` 写前端站点，并暴露 `server` 端口
4. **密钥**：`AUTH_TOKEN`、通知通道密钥通过环境变量注入，**不要**写进镜像或提交到仓库
5. **资源**：点位多、采样密时给 `server` 加内存限制并评估 `HISTORY_RETENTION_DAYS`（见 §6 清单）

> 说明：这套编排文件**尚未在实际 Docker 环境跑过**（编写时所在机器未安装 Docker），首次使用请留意构建日志。若构建失败，优先检查两处：`pnpm-workspace.yaml` 是否被正确 COPY（它声明了依赖构建脚本白名单，缺失会导致 `pnpm install` 失败）；`corepack prepare pnpm@11` 是否可用（可改成你本地的 pnpm 大版本）。

---

## 8. 常见问题

**Q1：打开页面正常，但换电脑/清缓存后项目丢了？**  
存储后端没连上，前端回落了 localStorage。检查 `/api/health` 是否 200，以及浏览器 Network 里该请求是否指向你部署的 API。

**Q2：`/api/health` 返回 401？**  
后端设置了 `AUTH_TOKEN`。前端构建时注入相同的 `VITE_API_TOKEN`，或 curl 时带上 `Authorization: Bearer <token>`。

**Q3：跨域被浏览器拦截？**  
分域部署时核对两处：前端 `VITE_API_BASE` 是否为完整 API 地址；后端 `CORS_ORIGIN` 是否包含**当前页面**的 Origin（协议+域名+端口都要对）。

**Q4：保存报 413 / payload too large？**  
项目 JSON 超过 `MAX_BODY_BYTES`，同时调大后端变量和 Nginx `client_max_body_size`。

**Q5：换账号登录后看不到之前的工程？**  
这是预期行为：工程、自定义组件、设备模板、草稿与时序历史都按**用户命名空间**（`u/<userId>/`）隔离，不同账号互不可见。确认登录的是同一个账号；若数据是升级前的旧文件，它可能还留在 `DATA_DIR` 根目录，需要人工迁入对应用户目录。

**Q6：后端离线时历史曲线还在吗？**  
在，但只存本机：前端会把采样降级写入 localStorage（同样按用户隔离），趋势图会提示"后端离线，历史暂存本机"。重新连上服务端后，新采样走服务端，本机暂存不会自动回传。

**Q7：后端日志出现「拒绝启动：另一个实例正持有该数据目录的锁」，且 systemd/容器反复重启失败？**  
先确认是不是真有两个实例指向同一个 `DATA_DIR`（常见于手工起了一个、服务守护又起了一个；或副本数被调到 >1）。只该留一个，另一个的 `DATA_DIR` 换掉或停掉。  
若确认持锁进程早已不存在（机器重启后 pid 被别的进程复用，或锁文件被外部工具改坏），直接删掉 `DATA_DIR/.lock` 再启动——锁只是启动门禁，删它不会丢任何数据，服务下一次启动会重新创建。判活与接管规则见 §5.6。

---

## 9. 升级与回滚

1. 构建产物：`pnpm build` → 替换静态目录里的 `dist/`（可先拷到 `dist.prev` 备份）
2. 后端：停服务 → 更新代码 → 起服务。数据在 `DATA_DIR`，不随代码删除
3. 回滚：静态目录换回旧 `dist/`；后端换回旧代码即可。数据格式兼容保留：
   - 工程文件为 `version 1.1`（`pages[]` 多画面结构）；旧版单画布工程在加载时**自动迁移**为「主页」
   - 时序历史为按天分片 JSONL，向后兼容
   - 从"无用户隔离"的旧版本升级时，`DATA_DIR` 根目录的旧 KV 数据**不会**自动迁入用户空间，需人工移入 `u/<userId>/` 或重新保存一次
