# 本机环境与已知坑（诊断细节）

> 本文件是 [AGENTS.md](../AGENTS.md)「环境与已知坑」的**外移层**：正文只保留任何机器、任何 agent 都必须遵循的动作与判据，这里收录「出现该症状时才需要读」的完整诊断过程、根因与本机实测值。
> 为什么拆：AGENTS.md 属于会被自动加载的标准文件，Codex 一类代理按 `project_doc_max_bytes`（默认 32 KiB，根到当前目录**合并计算**）**从尾部静默截断**。长篇事故复盘留在正文里＝排在预算末端，最先丢；丢掉的恰好是别人不会补写第二遍的经验。

条目分两类：**通用**（任何 Windows/Git Bash 环境都可能命中，含判据与命令）与 **〔本机值〕**（只有特定的机器成立，换环境当线索用，不要照抄）。

## 全量测试被沙箱掐断（静默少跑文件）

正文保留的是判据：「汇总行有 `Errors` 即视为本次没跑过；逐文件列表要和磁盘比对一致」。这里是被掐断那一侧的根因与考古过程。

- 症状：`vitest run` 末尾汇总出现 `Errors`，形如 `EPERM: operation not permitted, open 'C:\Users\...\AppData\Local\Temp\...\web\<hash>'`，同时 `Test Files` / `Tests` 比真实值少——实测同一次全量在 45~47 个文件之间跳动，而磁盘上当时实际有 48 个。**少跑的文件不报失败**，只看绿灯会漏。
- 根因解法：把 `TEMP`/`TMP` 重定向到可写目录，多数情况下能一次跑全：
  ```bash
  TEMP=<仓库>/.workbuddy/tmp TMP=<仓库>/.workbuddy/tmp npx vitest run
  ```
  （`pnpm build` 同理。）实测重定向后 48 文件 / 408 用例全到、汇总无 `Errors`。
- ⚠️ 重定向**并不稳定**：`.workbuddy` 自身可能被沙箱管控，改重定向到仓库外目录（如 `D:/tmp-wb`）也同样随机命中。**可靠做法是多轮全量 + 补跑漏掉的文件**，直到逐文件列表与磁盘一致——实测最多跑三轮 + 三次补跑才覆盖全 48 个。
- 核对逐文件列表用 `npx vitest run --reporter=verbose`；与磁盘比对的取法：
  ```bash
  git ls-files | grep -c '\.test\.ts$'   # 2026-10-19 实测 = 65
  ```
- 写进 CHANGELOG 的「实测用例数」必须来自完整运行，别直接抄被掐断那次的数字。

## dev server 打不开：`::1` 回环被 TUN 拦（〔本机值〕）

- `vite.config.ts` 的 `server.host: '127.0.0.1'` 绑定**勿删**。Clash Verge（mihomo）TUN 模式会拦截本机 IPv6 回环 `::1` 的 TCP 连接，删掉该绑定后 Node 17+ 的 Vite 只监听 `[::1]`，复发「服务已启动但浏览器打不开」。
- 该症状**像 node_modules 损坏，别被误导**。先用 `node -e` 分别测 `127.0.0.1` 与 `::1` 的回环连通性再判断：
  ```bash
  node -e "require('net').connect(5173,'::1').on('error',e=>console.log('::1 FAIL',e.code)).on('connect',()=>console.log('::1 ok'))"
  ```

## Git Bash 里误建保留设备名文件

正文保留的是预防动作（丢弃输出用 `> /dev/null`，绝不写 `> nul`）。这里是「已经建出来了」之后的处置结论。

- **〔本机〕这类文件一旦建出来就删不掉**：实测 `rm` / `mv` / `cmd del "\\?\…"` / Node `fs.unlink` / .NET `File.Delete` / Win32 `DeleteFileW` / 改写 DACL / NT 层 `NtCreateFile` **全部失败**，错误码集中在 `ERROR_ACCESS_DENIED(5)` 与 `0x800704B0 指定的设备名无效`；**脱离沙箱后同样失败**，拦截来源未确证（疑似安全软件或系统对保留设备名的规则）。所以预防是唯一可靠策略，别指望事后清理、更别把它当普通文件反复重试删除。
- **判断它是否还在，别用 `exists`**：`os.path.exists('D:\...\nul')` **恒为 True**（裸路径被解析成 NUL 设备，永远「存在」）。可靠判据只有两条：① 目录列举里有没有这一项；② `GetFileAttributesW('\\?\<绝对路径>\nul')` 是否返回 `0xFFFFFFFF / err=3`。
- `.gitignore` 已忽略这类名字，避免误入提交。
- 同类保留名：`con` / `aux` / `prn` / `com1`~`com9` / `lpt1`~`lpt9`。

## 控制台中文乱码（代码页不匹配）

正文保留的是结论：乱码只影响终端显示，**不会污染代码或提交内容**，别因为看到乱码就去"修"文件；校验中文不要相信控制台渲染。

- 症状：终端里中文显示成 `???` 或 U+FFFD 替换符（如 `git log`、`Select-String` 读中文文件、命令里写中文字面量）。
- 成因：控制台代码页为 〔本机值〕936(GB2312)，而 git/node 等原生工具输出 UTF-8，PowerShell 5.1 的命令行也按 ANSI 代码页解析。
- 修法：**确认存在此问题后**，在命令开头加两行即可（控制台本就是 UTF-8 的环境不需要加，别无条件套用）：
  ```powershell
  $OutputEncoding=[Text.Encoding]::UTF8; [Console]::OutputEncoding=[Text.Encoding]::UTF8
  ```
- 中文内容校验的可靠取法：用 `node -e` 读原始字节并打印码点。反例——`Get-Content | ConvertFrom-Json` 会因字节被改写而直接报解析错；`git show | Select-String` 还会把相邻两行显示成一行（曾据此误判 CSS 注释吞掉了声明）。
- 多语句 PowerShell 一律写进临时 `.ps1` 用 `-File` 执行；内联 `-Command` 会把 `$_`、`-Filter` 这类符号吞掉。

## git 推送（〔本机值〕）

- 报 `SSL_ERROR_SYSCALL`：github.com 被网络重置，走本地代理推送：
  `git -c http.proxy=http://127.0.0.1:7897 push origin dev`（端口以实际代理为准）。
- 推送失败**不要连续重试**：提交保留在本地即可，等一段时间再试一次，仍失败就留到下次推送，避免浪费时间和触发网络风控。

## git 反复弹「CredentialHelperSelector」凭据助手选择框（〔本机值〕，已修）

勾选 "Always use this from now on" 也照弹。**这条在本机已应用完毕，正常情况不需要再动**；记录下来是为了换机器或重装后复发时能一次修对，不要照着再改一遍自己的配置。

- 成因：WorkBuddy 便携版 Git 的 system 配置（`D:/WorkBuddy/resources/vendor/PortableGit/etc/gitconfig`）写死了 `credential.helper = helper-selector`，而弹窗里的选择只会**追加**到 global，列表于是成了 `[helper-selector, manager]`——弹窗程序排在第一位，每次取凭据都会先调用它。
- 机制（通用）：`credential.helper` 是**多值**键，按 `system → global → local` **依次尝试**直到拿到用户名+密码；**取空值会清空此前累积的列表**。`credential.helperselector.selected` 只决定弹窗的默认选中项，**不能阻止弹窗**。
- 修法（改 user 级 `~/.gitconfig`）：在 `[credential]` 段**先写一条空值、再写 manager**，顺序不能反（反了会把 manager 一起清掉，变成没有 helper）：
  ```ini
  [credential]
  	helper =
  	helper = !"D:/WorkBuddy/resources/vendor/PortableGit/mingw64/bin/git-credential-manager.exe"
  ```
- 只对便携版 Git 生效；独立版（`C:\Program Files\Git`）的 system 本就是 `manager`，不会弹。
