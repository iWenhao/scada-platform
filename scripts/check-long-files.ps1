# 统计 src/** 与 server/** 下源码文件行数，列出超过各自阈值的文件。
#
# 用途：AGENTS.md「收尾硬性检查」要求的自检脚本。
# 阈值按文件类型区分（与 AGENTS.md 约定一致）：
#   *.vue / *.ts / *.mjs : 400 行
#   *.scss              : 500 行
# 数据/图标定义类长文件（industrial/** 组件目录等）属例外，看到后自行判断是否豁免。
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

param(
  # 要统计的根目录
  [string[]]$Roots = @('src', 'server')
)

# 扩展名 -> 行数阈值
$limits = @{
  '.vue'  = 400
  '.ts'   = 400
  '.mjs'  = 400
  '.scss' = 500
}

$results = foreach ($root in $Roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -Path $root -Recurse -File -Include *.ts, *.vue, *.mjs, *.scss |
    Where-Object { $limits.ContainsKey($_.Extension) } |
    ForEach-Object {
      $limit = $limits[$_.Extension]
      $lines = (Get-Content -LiteralPath $_.FullName | Measure-Object -Line).Lines
      [PSCustomObject]@{
        Lines = $lines
        Limit = $limit
        Path  = $_.FullName
      }
    }
}

$overLimit = $results |
  Where-Object { $_.Lines -gt $_.Limit } |
  Sort-Object Lines -Descending

if ($overLimit) {
  Write-Host '以下文件超过行数阈值（AGENTS.md 要求当次拆完再提交）：'
  $overLimit | Format-Table -AutoSize
} else {
  Write-Host 'OK: 所有文件均在阈值以内。'
}