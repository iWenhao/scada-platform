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
- **首次启动会自动创建种子账号**并在日志里提示：`admin/engineer/operator/viewer`（口令见 §5.4，上线后必须改）

验证：

```bash
curl -sS http://127.0.0.1:5174/api/health
# 未设 AUTH_TOKEN: {"ok":true}
# 已设 AUTH_TOKEN 且不带头: {"error":"unauthorized"}  (HTTP 401)

curl -sS -H "Authorization: Bearer change-me" http://127.0.0.1:5174/api/health
# {"ok":true}

# 登录取会话 Token（种子账号，仅首次验证用）
curl -sS -X POST http://127.0.0.1:5174/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
# {"token":"...","user":{...}}
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
| `DATA_DIR` | `<项目>/server/data` | 数据目录：用户空间 `u/<userId>/` + 全局 `_*.json` |
| `MAX_BODY_BYTES` | `20971520`（20MB） | 单次写入上限，超出返回 413 |
| `CORS_ORIGIN` | `*` | 允许的跨域来源，逗号分隔；生产不要用 `*` |
| `AUTH_TOKEN` | 空 | 可选**服务主密钥**（Bearer），设置后拥有全部权限；登录会话仍可用 |
| `HISTORY_RETENTION_DAYS` | `30` | 时序历史保留天数，超期分片每日自动清理；`0` 表示不清理 |

### 5.3 接口一览

| 方法 | 路径 | 说明 | 所需角色 |
|------|------|------|----------|
| GET | `/api/health` | 健康检查 → `{ ok: true }` | 无 |
| POST | `/api/auth/login` | 登录，发行会话 Token | 无 |
| POST | `/api/auth/logout` | 注销当前会话 | 登录 |
| GET | `/api/auth/me` | 当前登录用户与角色 | 登录 |
| POST | `/api/auth/password` | 修改自己的口令 | 登录 |
| GET/POST/PUT/DELETE | `/api/auth/users` | 用户管理（列/建/改/删） | admin |
| GET/PUT | `/api/notify/channels` | 通知通道配置（Webhook/企微/钉钉/邮件/短信） | engineer+ |
| POST | `/api/notify/test` | 对某通道做连通性测试 | engineer+ |
| GET/DELETE | `/api/notify/log` | 通知发送记录（最近 500 条） | engineer+ |
| POST | `/api/notify/send` | 服务端主动外发（报警扇出） | 内部 |
| POST/GET | `/api/audit` | 写值审计（写入/查询），操作者由会话注入、不可伪造 | 登录 |
| GET | `/api/keys` | 列出**当前用户空间**的全部 key | 登录 |
| GET | `/api/storage/get?key=` | 读取 | 登录 |
| PUT | `/api/storage/set?key=` | 写入（body 为文本） | engineer+ |
| DELETE | `/api/storage/remove?key=` | 删除 | engineer+ |
| POST | `/api/history/write` | 批量追加时序采样 | operator+ |
| GET | `/api/history/query?key=&from=&to=&maxPoints=` | 区间查询（服务端抽稀） | 登录 |

说明：

- 未登录访问受保护接口返回 401；角色不足返回 403
- 持有 `AUTH_TOKEN`（服务主密钥）时跳过角色检查，按全权限处理
- `OPTIONS` 预检永不鉴权

### 5.4 账号与角色

首次启动写入种子账号（**上线后必须改口令**）：

| 用户名 | 角色 | 初始口令 |
|--------|------|----------|
| `admin` | 管理员 | `admin123` |
| `engineer` | 工程师 | `engineer123` |
| `operator` | 操作员 | `operator123` |
| `viewer` | 观察员 | `viewer123` |

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
├── _sessions.json              会话表（全局，带 TTL）
├── _notify.json                通知通道配置（全局）
├── _notify_log.jsonl           通知发送记录（全局，最近 500 条）
└── _audit.jsonl                写值审计（全局，最近 500 条）
```

备份时整目录打包即可。注意 `_*.json` / `_*.jsonl` 为**全局**数据，不随用户空间隔离。

---

## 6. 生产加固清单

上线前逐项确认：

- [ ] **改掉种子口令**：`admin/engineer/operator/viewer` 的初始口令必须全部改掉（用户管理界面或 `/api/auth/password`）
- [ ] **账号收敛**：删除不再使用的账号；确认至少保留一名 admin
- [ ] **服务主密钥**：如设置 `AUTH_TOKEN`，用强随机值并妥善保管，**不要**注入前端构建（日常用登录会话）
- [ ] **CORS**：`CORS_ORIGIN` 只列真实前端站点，不再使用 `*`
- [ ] **HTTPS**：Nginx 配好证书；只开 80 会把会话 Token 与口令明文暴露在网络上
- [ ] **数据持久化**：`DATA_DIR` 在独立目录/挂卷；纳入备份（含 `u/<userId>/` 与全局 `_*.json`）
- [ ] **请求体上限**：`MAX_BODY_BYTES` 与 Nginx `client_max_body_size` 匹配（建议 Nginx 略大）
- [ ] **历史保留期**：按磁盘容量设定 `HISTORY_RETENTION_DAYS`（点位多、采样密时需评估：1 个点位 1 秒采样约 86400 行/天）
- [ ] **通知密钥**：Webhook/企微/钉钉/邮件 SMTP/短信网关的密钥存服务端 `_notify.json`，不要写进前端或镜像
- [ ] **进程守护**：systemd / 容器重启策略（`Restart=on-failure`）
- [ ] **健康检查**：对 `/api/health` 做监控；后端挂了前端会回落 localStorage，用户可能"能打开但保存不生效、历史只在本机"
- [ ] **防火墙**：5174 只对本机或内网开放；对外只暴露 80/443

### 关于 `VITE_API_TOKEN` 的定位

它是**服务主密钥**，构建后会打进前端 JS，任何浏览器用户都能读到。因此只适合：

- 内网可信环境、无人值守探针、CI 校验

日常使用请走**登录会话**：操作员用自己的账号登录，服务端按角色授权，审计记录里的操作者由会话注入、无法伪造。需要按用户隔离项目时，登录会话本身就是隔离依据（见 §5.5）。

---

## 7. 容器部署要点

存储后端零依赖，易于容器化。仓库已附带 `Dockerfile` 与 `docker-compose.yml`（见下节），要点如下：

1. 镜像内保留 `server/`，启动命令 `node server/index.mjs`
2. `DATA_DIR` 指到卷挂载点，例如 `/data`，宿主机备份该目录
3. 端口映射 `5174`，或由容器网络内 Nginx/Ingress 转发
4. 环境变量通过编排文件注入（`AUTH_TOKEN` 不要写进镜像）

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

---

## 9. 升级与回滚

1. 构建产物：`pnpm build` → 替换静态目录里的 `dist/`（可先拷到 `dist.prev` 备份）
2. 后端：停服务 → 更新代码 → 起服务。数据在 `DATA_DIR`，不随代码删除
3. 回滚：静态目录换回旧 `dist/`；后端换回旧代码即可。数据格式兼容保留：
   - 工程文件为 `version 1.1`（`pages[]` 多画面结构）；旧版单画布工程在加载时**自动迁移**为「主页」
   - 时序历史为按天分片 JSONL，向后兼容
   - 从"无用户隔离"的旧版本升级时，`DATA_DIR` 根目录的旧 KV 数据**不会**自动迁入用户空间，需人工移入 `u/<userId>/` 或重新保存一次
