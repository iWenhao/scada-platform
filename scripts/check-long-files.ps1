# 统计 src/** 与 server/** 下源码文件行数，列出超过各自阈值的文件。
#
# 用途：AGENTS.md「收尾硬性检查」要求的自检脚本。
# 阈值按文件类型区分（与 AGENTS.md 约定一致）：
#   *.vue / *.ts / *.mjs : 400 行
#   *.scss              : 500 行
# 数据/图标定义类长文件（src/industrial/** 组件目录）属例外——已内置在下面的 $Exempt 参数里，
# 命中例外的文件不参与门槛，只在末尾报出跳过数量：例外必须可见，不能变成静默豁免。
#
# 用法（在仓库根目录执行）：
#   powershell -ExecutionPolicy Bypass -File scripts/check-long-files.ps1
#
# 注意：
#   1. 本脚本只读文件、不做任何修改；无超限文件时输出 OK 并退出。
#   2. 必须用 -Path 而非 -LiteralPath：与 -Include 搭配时 -LiteralPath 会让过滤失效，
#      把 .jsonl 之类的数据文件也算进来。
#   3. 另存为 .ps1 时必须带 UTF-8 BOM——PowerShell 5.1 默认按 ANSI 代码页读脚本，
#      无 BOM 的中文注释会被误解析成语法符号导致 ParserError。
#   4. 计数必须用 [System.IO.File]::ReadAllLines().Count，不要用
#      (Get-Content | Measure-Object -Line).Lines——后者不计空行，且对纯 LF 文件漏得更多
#      （2026-10-13 实测同一批文件少算 3~25 行，最差一例报 85、实际 110），会让接近阈值的
#      文件静默通过。本仓库行尾本就混用（industrial/** 是 CRLF、新写的画布文件是 LF），
#      两种都会失真，故计数必须与行尾风格无关。

param(
  # 要统计的根目录
  [string[]]$Roots = @('src', 'server'),

  # 例外路径（相对仓库根、正斜杠分隔，结尾 * 覆盖其下所有层级）：
  # 这些是数据/图标定义类长文件，行数随设备种类增长，不按逻辑文件处理。
  [string[]]$Exempt = @('src/industrial/*')
)

# 扩展名 -> 行数阈值
$limits = @{
  '.vue'  = 400
  '.ts'   = 400
  '.mjs'  = 400
  '.scss' = 500
}

$repoRoot = (Get-Location).Path
$skipped = 0

$results = foreach ($root in $Roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -Path $root -Recurse -File -Include *.ts, *.vue, *.mjs, *.scss |
    Where-Object { $limits.ContainsKey($_.Extension) } |
    ForEach-Object {
      # 归一成「相对仓库根 + 正斜杠」，再与例外模式比对（-like 默认不区分大小写）
      $rel = $_.FullName
      if ($rel.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $rel = $rel.Substring($repoRoot.Length)
      }
      $rel = $rel.TrimStart('\', '/').Replace('\', '/')

      $isExempt = $false
      foreach ($pattern in $Exempt) {
        if ($rel -like $pattern) { $isExempt = $true; break }
      }
      if ($isExempt) {
        $script:skipped++
        return
      }

      [PSCustomObject]@{
        Lines = [System.IO.File]::ReadAllLines($_.FullName).Count
        Limit = $limits[$_.Extension]
        Path  = $rel
      }
    }
}

$overLimit = $results |
  Where-Object { $_.Lines -gt $_.Limit } |
  Sort-Object Lines -Descending

if ($overLimit) {
  Write-Host '以下文件超过行数阈值（AGENTS.md 要求：属本次改动新增或触及的当次拆完再提交）：'
  $overLimit | Format-Table -AutoSize
} else {
  Write-Host 'OK: 所有文件均在阈值以内。'
}

if ($skipped -gt 0) {
  Write-Host ("（已按例外跳过 $skipped 个文件：" + ($Exempt -join ', ') + "）")
}