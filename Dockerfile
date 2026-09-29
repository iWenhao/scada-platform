# 前端镜像：构建静态资源并用 Nginx 托管（含 /api 反代到存储后端）
# 注意：pnpm-workspace.yaml 必须与 package.json 一起 COPY——
# 它声明了 esbuild/@parcel/watcher/vue-demi 的构建脚本白名单，缺失会导致安装失败。
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# 同源反代（docker-compose 默认）保持 /api；前后端不同域时用 build-arg 覆盖
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
# 日常用登录会话，不要注入服务主密钥；CI/探针场景才需要
# ARG VITE_API_TOKEN
# ENV VITE_API_TOKEN=$VITE_API_TOKEN

RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
