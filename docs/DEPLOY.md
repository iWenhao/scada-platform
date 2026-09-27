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
| 存储后端 | 零依赖 Node KV 服务，项目/自定义组件/主题落盘为 JSON | `node server/index.mjs` |
| 实时数据 | 浏览器直连 WebSocket / HTTP / OPC UA 网关 | 不经过存储后端，与本文无关 |

前端通过相对路径 `/api/**`（可配置）访问存储后端。后端不在线时，前端会自动回落到浏览器 localStorage，组态编辑仍可用，但数据不落服务端。

```
浏览器 ──► 静态托管 (dist/)
  │
  ├─► GET /api/**  ──► 存储后端 (node server/index.mjs)
  │
  └─► ws://... / http://...  ──► 你的实时数据源 / OPC UA 网关
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
node server/index.mjs
```

说明：

- `DATA_DIR` 指到系统盘以外或独立数据目录，方便备份/挂卷
- `AUTH_TOKEN` **生产必填**；不设则任何人可读写存储接口
- 同域反代时 `CORS_ORIGIN` 可随意（不会用到预检），但建议仍写上前端站点

验证：

```bash
curl -sS http://127.0.0.1:5174/api/health
# 未设 AUTH_TOKEN: {"ok":true}
# 已设 AUTH_TOKEN 且不带头: {"error":"unauthorized"}  (HTTP 401)

curl -sS -H "Authorization: Bearer change-me" http://127.0.0.1:5174/api/health
# {"ok":true}
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
| `DATA_DIR` | `<项目>/server/data` | 数据目录，每个 key 一个 `*.json` |
| `MAX_BODY_BYTES` | `20971520`（20MB） | 单次写入上限，超出返回 413 |
| `CORS_ORIGIN` | `*` | 允许的跨域来源，逗号分隔；生产不要用 `*` |
| `AUTH_TOKEN` | 空 | 设置后启用 Bearer 鉴权；生产务必设置 |

### 接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 → `{ ok: true }` |
| GET | `/api/keys` | 列出全部 key |
| GET | `/api/storage/get?key=` | 读取 |
| PUT | `/api/storage/set?key=` | 写入（body 为文本） |
| DELETE | `/api/storage/remove?key=` | 删除 |

开启 `AUTH_TOKEN` 后，以上接口（含 health）都要求 `Authorization: Bearer <token>`；`OPTIONS` 预检不鉴权。

---

## 6. 生产加固清单

上线前逐项确认：

- [ ] **鉴权**：设置了强随机 `AUTH_TOKEN`，前端构建注入同一 `VITE_API_TOKEN`
- [ ] **CORS**：`CORS_ORIGIN` 只列真实前端站点，不再使用 `*`
- [ ] **HTTPS**：Nginx 配好证书；只开 80 会把 Token 明文暴露在网络上
- [ ] **数据持久化**：`DATA_DIR` 在独立目录/挂卷；纳入备份
- [ ] **请求体上限**：`MAX_BODY_BYTES` 与 Nginx `client_max_body_size` 匹配（建议 Nginx 略大）
- [ ] **进程守护**：systemd / 容器重启策略（`Restart=on-failure`）
- [ ] **健康检查**：对 `/api/health` 带 Token 做监控；后端挂了前端会回落 localStorage，用户可能“能打开但保存不生效”
- [ ] **防火墙**：5174 只对本机或内网开放；对外只暴露 80/443

### 关于前端 Token 的限制

`VITE_API_TOKEN` 构建后会打进前端 JS，能被浏览器用户读到。它适合：

- 内网组态、可信操作员访问
- 作为“共享口令”挡掉扫描器和无关来源

它**不是**多用户权限体系。若需要按用户隔离项目，请再加登录/会话接口（当前版本未内置）。

---

## 7. 容器部署要点

当前存储后端零依赖，没有附带 Dockerfile。若自行容器化，记住：

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

**Q5：`keys` 列表和别人混在一起了？**  
存储服务是**全局单命名空间**的 KV，没有多租户隔离。需要按用户/项目隔离时，应在 key 前缀上做约定，或等多用户版本。

---

## 9. 升级与回滚

1. 构建产物：`pnpm build` → 替换静态目录里的 `dist/`（可先拷到 `dist.prev` 备份）
2. 后端：停服务 → 更新代码 → 起服务。数据在 `DATA_DIR`，不随代码删除
3. 回滚：静态目录换回旧 `dist/`；后端换回旧代码即可，数据格式当前为纯 JSON 文本，兼容保留
