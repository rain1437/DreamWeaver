# ============================================================================
#  DreamWeaver · 幻梦织者 —— 一键发布到 GitHub
# ----------------------------------------------------------------------------
#  用法（在项目根目录）：
#     publish.cmd -Repo https://github.com/你的用户名/dreamweaver.git
#
#  或直接用 PowerShell（若被执行策略拦住，见 README 里的几种解法）：
#     powershell -NoProfile -ExecutionPolicy Bypass -File .\publish.ps1 -Repo <地址>
#
#  参数：
#     -Repo      要推送到的仓库地址（必填）
#     -Message   提交信息（默认「更新 DreamWeaver」）
#     -UserName  提交者名字（仅在仓库未配置身份时使用）
#     -UserEmail 提交者邮箱（同上）
#     -SkipTests 跳过结构自检（赶时间时用）
#
#  流程：构建 → 自检 → 初始化/提交 → 关联远程 → 推送，最后告诉你 Pages 怎么开。
# ============================================================================
param(
  [Parameter(Mandatory=$true)][string]$Repo,
  [string]$Message = '更新 DreamWeaver',
  [string]$UserName,
  [string]$UserEmail,
  [switch]$SkipTests
)

# 注意两点（都是踩过的坑）：
#   1) 不要把辅助函数命名为 Git —— PowerShell 命令名不区分大小写，
#      `function Git` 会遮蔽 git.exe，函数内部再调 git 就变成无限递归自己，直接栈溢出。
#      （这里用 Invoke-Git，并且只用解析出的 git 完整路径调用。）
#   2) 不要设 $ErrorActionPreference='Stop' —— git 会把正常信息写进 stderr，
#      设成 Stop 会被当成致命错误，脚本会在「提交」那一步莫名中断。
$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Say([string]$t, [string]$c = 'Gray') { Write-Host $t -ForegroundColor $c }
function Bad([string]$t) { Write-Host $t -ForegroundColor Red }
function Warn([string]$t) { Write-Host $t -ForegroundColor Yellow }

# ---- 定位真正的 git.exe（绕开任何同名函数/别名） ----
$script:GIT = $null
$gi = Get-Command git -CommandType Application -ErrorAction SilentlyContinue
if ($gi) { $script:GIT = ($gi | Select-Object -First 1).Source }
else {
  $gi = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($gi -and $gi.Source) { $script:GIT = $gi.Source }
}

# 统一包装：永不抛异常，输出与退出码都拿回来
# 注意：参数名不能叫 $Args —— 那是 PowerShell 的自动变量，会吞掉传入的参数。
function Invoke-GitRaw([string[]]$ArgList) {
  $out = & $script:GIT @ArgList 2>&1
  $code = $LASTEXITCODE
  $text = (($out | ForEach-Object { "$_" }) -join "`n")
  return [pscustomobject]@{ Ok = ($code -eq 0); Code = $code; Text = $text }
}
function Git-Text([string[]]$ArgList) { return ((Invoke-GitRaw $ArgList).Text).Trim() }

Write-Host ''
Say ('=' * 62) 'DarkGray'
Say ' DreamWeaver · 幻梦织者 —— 发布到 GitHub' 'Cyan'
Say ('=' * 62) 'DarkGray'

# ---------------------------------------------------------------- 0) 前置检查
if (-not $script:GIT) {
  Bad '✘ 没有找到 git。请先安装：https://git-scm.com/download/win'
  Bad '   安装后重开一个窗口再执行（PATH 需要刷新）'
  exit 1
}
Say ("  · git: " + $script:GIT) 'DarkGray'

if (-not (Test-Path 'build.js')) {
  Bad '✘ 请在项目根目录执行（当前目录下看不到 build.js）'
  Bad '   提示：解压后应该是 DreamWeaver-app\ 这一层，不要进到更里层'
  exit 1
}
if ($Repo -notmatch '^https?://.+\.git$') {
  Warn "⚠ 仓库地址不像 https://...git ：$Repo（如果确定没错可以继续）"
}

# ------------------------------------------------------------ 1) 构建产物
Say "`n[1/6] 生成产物（单文件版 + 网页版）" 'Cyan'
node build.js
if ($LASTEXITCODE -ne 0) { Bad '✘ 构建失败，已中止（原因见上）'; exit 1 }

# ------------------------------------------------------------ 2) 结构自检
if (-not $SkipTests) {
  Say "`n[2/6] 自检（结构规范）" 'Cyan'
  node verify.js
  if ($LASTEXITCODE -ne 0) { Bad '✘ 自检未通过，已中止（确认没问题可加 -SkipTests）'; exit 1 }
} else {
  Say "`n[2/6] 已跳过自检（-SkipTests）" 'DarkGray'
}

# ------------------------------------------------------------ 3) 准备仓库
Say "`n[3/6] 准备 git 仓库" 'Cyan'
if (-not (Test-Path '.git')) {
  $r = Invoke-GitRaw @('init')
  if (-not $r.Ok) { Bad ('✘ git init 失败：' + $r.Text); exit 1 }
  Warn '  · 已初始化新仓库（.git）'
} else {
  Say '  · 已有 git 仓库，沿用'
}

# 换行符策略：避免几十条 LF/CRLF 警告刷屏（只影响工作区，不影响仓库内容）
foreach ($kv in @(@('core.autocrlf','false'), @('core.safecrlf','false'), @('core.quotepath','false'))) {
  Invoke-GitRaw @('config', $kv[0], $kv[1]) | Out-Null
}

# 提交身份：只写进本仓库（不动你的全局配置）
$curName  = Git-Text @('config', '--get', 'user.name')
$curEmail = Git-Text @('config', '--get', 'user.email')
if (-not $curName) {
  $n = if ($UserName) { $UserName } else { 'DreamWeaver' }
  Invoke-GitRaw @('config', 'user.name', $n) | Out-Null
  Warn "  · 本仓库提交者名字设为「$n」（想改：git config user.name 你的名字）"
}
if (-not $curEmail) {
  $e = if ($UserEmail) { $UserEmail } else { 'noreply@example.com' }
  Invoke-GitRaw @('config', 'user.email', $e) | Out-Null
  Warn "  · 本仓库提交者邮箱设为 $e（想改：git config user.email 你的邮箱）"
}

# ------------------------------------------------------------ 4) 提交
Say "`n[4/6] 提交改动" 'Cyan'
$add = Invoke-GitRaw @('add', '-A')
if (-not $add.Ok) { Bad ('✘ git add 失败：' + $add.Text); exit 1 }

$hasHead = (Invoke-GitRaw @('rev-parse', '--verify', 'HEAD')).Ok
$stagedLines = @()
if ($hasHead) {
  $stagedLines = @((Git-Text @('diff', '--cached', '--name-only')) -split "`r?`n" | Where-Object { $_ })
}

if (-not $hasHead) {
  $c = Invoke-GitRaw @('-c', 'commit.gpgsign=false', 'commit', '-m', $Message)
  if (-not $c.Ok) { Bad ('✘ 首次提交失败：' + $c.Text); exit 1 }
  Say '  · 已创建首次提交' 'Green'
} elseif ($stagedLines.Count -gt 0) {
  $c = Invoke-GitRaw @('-c', 'commit.gpgsign=false', 'commit', '-m', $Message)
  if (-not $c.Ok) { Bad ('✘ 提交失败：' + $c.Text); exit 1 }
  Say ("  · 已提交 " + $stagedLines.Count + " 个文件的改动") 'Green'
} else {
  Say '  · 没有新改动，跳过提交'
}
Say ('  · 当前 commit：' + (Git-Text @('rev-parse', '--short', 'HEAD')))

Invoke-GitRaw @('branch', '-M', 'main') | Out-Null

# ------------------------------------------------------------ 5) 关联远程
Say "`n[5/6] 关联远程仓库" 'Cyan'
$remotes = @((Git-Text @('remote')) -split "`r?`n" | Where-Object { $_ })
if ($remotes -contains 'origin') {
  Invoke-GitRaw @('remote', 'set-url', 'origin', $Repo) | Out-Null
  Say "  · origin 已更新 → $Repo"
} else {
  $r = Invoke-GitRaw @('remote', 'add', 'origin', $Repo)
  if (-not $r.Ok) { Bad ('✘ 添加远程失败：' + $r.Text); exit 1 }
  Say "  · origin → $Repo"
}

# ------------------------------------------------------------ 6) 推送
Say "`n[6/6] 推送到 GitHub" 'Cyan'
Say '  （第一次会弹出浏览器让你登录 GitHub 授权，走完即可）' 'DarkGray'
$p = Invoke-GitRaw @('push', '-u', 'origin', 'main')
if (-not $p.Ok) {
  Bad "`n✘ 推送失败。常见原因与解法："
  Write-Host $p.Text -ForegroundColor DarkGray
  Say ''
  Say '  · 仓库还不存在 → 先到 GitHub 网页 New repository' 'Yellow'
  Say '    名字建议短英文（会成为网址的一部分），不要勾 Add a README' 'Yellow'
  Say '  · 远程已有内容（建库时勾了 README）→ 先合并再推：' 'Yellow'
  Say '      git pull --rebase origin main' 'Gray'
  Say '      git push -u origin main' 'Gray'
  Say '  · 登录/权限失败 → 重新执行一次，或确认用的是正确的 GitHub 账号' 'Yellow'
  exit 1
}

$slug = $Repo -replace '^https?://github\.com/', '' -replace '\.git$', ''
$user = ($slug -split '/')[0]
$proj = ($slug -split '/')[1]

Write-Host ''
Say '✓ 推送完成，代码已经上 GitHub 了' 'Green'
Say "`n只剩两步（只需做一次）："
Say ('  1. 打开  https://github.com/' + $slug + '/settings/pages') 'Cyan'
Say '     Build and deployment → Source 选 「GitHub Actions」'
Say '  2. 等 Actions 跑完（约 1 分钟），你的 App 就上线了：'
Write-Host ''
Say ("     https://$user.github.io/$proj/") 'Cyan'
Write-Host ''
Say '  手机上打开这个地址 → 浏览器菜单「安装应用 / 添加到主屏幕」，' 'Gray'
Say '  桌面会出现星月图标，点开即全屏运行，断网也能进。' 'Gray'
Write-Host ''
