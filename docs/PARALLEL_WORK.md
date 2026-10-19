# 并行改动（多会话 / 多 Agent 同时动本仓库）

> 本文件是 [AGENTS.md](../AGENTS.md)「工作流约定」的外移层：单人开发时不需要读这里，只有**多个会话 / 多个 Agent 同时动同一个仓库**时才需要按本文三层判据隔离工作。

## 三层隔离判据（能用上一层就不往下一层退）

### 1. 环境有原生 worktree 隔离（首选）

派子任务时能指定「隔离的工作树」这类参数 → 直接用，通常还会自动清理没改动的副本。

### 2. 没有原生能力 → 手工开 worktree

```bash
git worktree add ../scada-wt-<slug> -b wt/<slug> dev   # 新目录 + 新分支，dev 仍归主工作树
cd ../scada-wt-<slug> && pnpm install                  # node_modules/ 不跟着工作树走
# ... 干活 ...
git worktree remove ../scada-wt-<slug>                 # 分支留着等合并
git worktree prune                                     # 全清完再 prune
```

- git 禁止同一个分支被两个工作树同时检出（实测 `fatal: 'dev' is already used by worktree`），所以每个并行工作树必须各自 `-b` 新分支、最后逐层合回 `dev`。

### 3. 连独立目录都不方便（同一工作树跑多个会话）

三条硬规矩：

1. **按模块切分工**：一个会话只碰 `src/industrial/**`，另一个只碰 `server/**`，不要重叠
2. **绝不 `git add -A` / `git commit -a`**：只 `git add` 自己动过的文件
3. **开工先 `git status --short`**：把他人的改动原样留着不动

> 为什么第 2 条是硬规矩：`git add` 拿的是**当时整个工作树的快照**，会把他人的 WIP 卷进自己的提交。本项目发生过另一会话的 4 个文件混进来、靠提交后 `git show --stat` 才确认没被带进去。

## worktree 管不了的两类冲突（必须手动错开）

工作树只隔离**磁盘编辑与暂存区**，两类东西它管不了：

### ① 语义冲突

两边用不同方式改同一个函数；`CHANGELOG.md` 的 `[Unreleased]` 每人都追加在同一位置——这是**必然冲突点**，合并时按提交时间手工接。

### ② git 之外的共享状态

本仓库三处必须逐个错开：

| 共享资源 | 错开方式 |
|---|---|
| `server/data/`（KV 存储 JSON） | 并行实例一律自备 `DATA_DIR`（如 `DATA_DIR=./.workbuddy/data-<slug>`），否则跨进程竞态写同一批 JSON |
| 端口 | `5173` 只归主工作树；并行实例用 `npx vite --port 5180` / `PORT=5178` |
| 浏览器登录会话 + localStorage | 并行实例用独立浏览器 profile 或无痕窗口，否则共用同一 localStorage 互相顶掉登录态 |
