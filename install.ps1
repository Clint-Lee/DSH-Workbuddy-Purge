# ==============================================================================
#  DSH WorkBuddy 插件安装脚本（可重复运行 / 无 BOM / 兼容空格与中文路径）
# ==============================================================================
#  与原版相比修掉的坑（均为实测复现）：
#   1. Set-Content -Encoding utf8 在 Windows PowerShell 5.1 会写入 UTF-8 BOM，
#      DSH 用 JSON.parse 读 profile 会直接抛 "Unexpected token '﻿'" 而打不开。
#      这里统一用 .NET WriteAllText + UTF8Encoding($false) 写无 BOM 文件。
#   2. 当 profile 的 dsh.profile.bundles 是空数组时，原版 if(-not $bundles) 判定
#      为真，随后 Add-Member 同名属性会抛 MemberAlreadyExists 而中断安装。
#      这里改成"读出来、补进去、整体写回"，不做成员操作。
#   3. 原版用 New-Item Junction 覆盖已有链接依赖 cmd /c rmdir，路径含空格或
#      中文时容易失败。这里用 .NET Directory.Delete 精确删除重解析点。
#   4. 原版不校验 JSON 就宣告成功。这里写完立刻回读校验，失败即报错回滚。
#   5. 新增：DSH 是否安装、版本是否在插件支持区间、WorkBuddy 登录态、备份。
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'

function Write-Step($m) { Write-Host ">> $m" -ForegroundColor Yellow }
function Write-Ok($m)   { Write-Host "   [OK] $m" -ForegroundColor Green }
function Write-Warn2($m){ Write-Host "   [!] $m" -ForegroundColor Yellow }
function Write-Err($m)  { Write-Host "   [X] $m" -ForegroundColor Red }

function Write-Utf8NoBom([string]$path, [string]$text) {
    $dir = Split-Path -Parent $path
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

# 删除一个重解析点（junction/symlink）。只删链接本身，绝不动目标目录内容。
function Remove-Link([string]$path) {
    if (-not (Test-Path -LiteralPath $path)) { return }
    $item = Get-Item -LiteralPath $path -Force
    if ($item.LinkType -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        try { [System.IO.Directory]::Delete($path, $false) }
        catch { cmd /c rmdir "$path" 2>$null | Out-Null }
    } else {
        # 真实目录/文件：不擅自删除，改名归档，避免误删用户数据
        $bak = "$path.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Move-Item -LiteralPath $path -Destination $bak -Force
        Write-Warn2 "已存在同名真实目录，已改名为 $(Split-Path $bak -Leaf)"
    }
}

function New-Junction([string]$link, [string]$target) {
    Remove-Link $link
    New-Item -ItemType Junction -Path $link -Target $target -ErrorAction Stop | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DeepSeek Harness - WorkBuddy 插件安装程序" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# ── 0. 自检：插件包完整性 ─────────────────────────────────────────────────────
$repoDir = $PSScriptRoot
$mainEntry = Join-Path $repoDir 'lib\client.js'
$mainIndex = Join-Path $repoDir 'lib\index.js'
$purgeDir  = Join-Path $repoDir 'packages\dsh-purge'
$purgeEntry = Join-Path $purgeDir 'client.js'

$missing = @()
foreach ($f in @($mainEntry, $mainIndex)) { if (-not (Test-Path -LiteralPath $f)) { $missing += $f } }
if (-not (Test-Path -LiteralPath $purgeEntry)) { $missing += $purgeEntry }

if ($missing.Count -gt 0) {
    Write-Err "插件包不完整，缺少以下文件："
    $missing | ForEach-Object { Write-Host "        $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "   可能原因：解压不完整（请用资源管理器完整解压），或只解压了部分文件。" -ForegroundColor Yellow
    Write-Host "   请重新解压整个压缩包后再运行本脚本。" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车退出"
    exit 1
}
Write-Ok "插件包完整（$repoDir）"

# ── 1. 自检：DSH 是否安装 ────────────────────────────────────────────────────
$dshHome = Join-Path $env:USERPROFILE '.dsh'
if (-not (Test-Path -LiteralPath $dshHome)) {
    Write-Err "未检测到 DeepSeek Harness 配置目录：$dshHome"
    Write-Host ""
    Write-Host "   请先安装并【至少打开运行一次】DeepSeek Harness，再回来运行本脚本。" -ForegroundColor Yellow
    Write-Host "   下载地址：https://github.com/deepseek-ai/DeepSeek-Harness/releases" -ForegroundColor Gray
    Write-Host ""
    Read-Host "按回车退出"
    exit 1
}

$desktopProfile  = Join-Path $dshHome 'profiles\desktop'
$pluginsDir      = Join-Path $dshHome 'plugins'
$nodeModulesDir  = Join-Path $desktopProfile 'node_modules'
$packageJsonPath = Join-Path $desktopProfile 'package.json'

if (-not (Test-Path -LiteralPath $desktopProfile)) {
    Write-Err "未检测到 desktop profile：$desktopProfile"
    Write-Host "   这说明 DSH 已安装但从未成功启动过。请先完整打开一次 DSH 再重试。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit 1
}
Write-Ok "已检测到 DSH 配置目录"

# ── 2. 自检：DSH 版本是否在插件支持区间 ──────────────────────────────────────
# 插件 package.json 声明 engines.dsh = ">=0.1.5-rc.1 <0.3.0"
$dshExe = $null
foreach ($cand in @(
    (Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness\DeepSeek Harness.exe'),
    'D:\Software\DeepseekHarness\DeepSeek Harness.exe',
    (Join-Path ${env:ProgramFiles} 'DeepSeek Harness\DeepSeek Harness.exe')
)) {
    if ($cand -and (Test-Path -LiteralPath $cand)) { $dshExe = $cand; break }
}
if ($dshExe) {
    $ver = (Get-Item -LiteralPath $dshExe).VersionInfo.FileVersion
    Write-Ok "DSH 版本：$ver（插件支持 >=0.1.5-rc.1 <0.3.0）"
    $m = [regex]::Match([string]$ver, '^(\d+)\.(\d+)')
    if ($m.Success) {
        $maj = [int]$m.Groups[1].Value; $min = [int]$m.Groups[2].Value
        if ($maj -eq 0 -and $min -lt 1) { Write-Warn2 "DSH 版本偏旧，插件可能无法加载；建议升级到 0.2.x" }
        elseif ($maj -ge 1 -or $min -ge 3) { Write-Warn2 "DSH 版本超出插件支持范围，可能不兼容；请留意后续更新" }
    }
} else {
    Write-Warn2 "未在常见路径找到 DSH 主程序，跳过版本校验（不影响安装）"
}

# ── 3. 自检：WorkBuddy 是否装过并登录过 ──────────────────────────────────────
$wbFound = $false
foreach ($cand in @(
    (Join-Path $env:LOCALAPPDATA 'Programs\WorkBuddy'),
    (Join-Path $env:LOCALAPPDATA 'WorkBuddy'),
    (Join-Path $env:APPDATA 'WorkBuddy'),
    (Join-Path $env:APPDATA 'WorkBuddy AI')
)) {
    if ($cand -and (Test-Path -LiteralPath $cand)) { $wbFound = $true; break }
}
if ($wbFound) { Write-Ok "已检测到 WorkBuddy 数据目录" }
else {
    Write-Warn2 "未检测到 WorkBuddy，插件装好后会显示「无账号」"
    Write-Host "       请先安装 WorkBuddy 桌面端并登录至少一个账号，再用 DSH。" -ForegroundColor Gray
}

Write-Host ""
Write-Step "1/3 建立插件软链接"

if (-not (Test-Path -LiteralPath $pluginsDir)) { New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null }
if (-not (Test-Path -LiteralPath $nodeModulesDir)) { New-Item -ItemType Directory -Path $nodeModulesDir -Force | Out-Null }

New-Junction (Join-Path $pluginsDir 'dsh-workbuddy-xdpool') $repoDir
Write-Ok "dsh-workbuddy-xdpool -> $repoDir"

New-Junction (Join-Path $pluginsDir 'dsh-purge') $purgeDir
Write-Ok "dsh-purge -> $purgeDir"

New-Junction (Join-Path $nodeModulesDir 'dsh-workbuddy-xdpool') $repoDir
Write-Ok "node_modules/dsh-workbuddy-xdpool"

New-Junction (Join-Path $nodeModulesDir 'dsh-purge') $purgeDir
Write-Ok "node_modules/dsh-purge"

# 升级清理：旧版本可能留下指向其他目录的残留。
# 只处理“本插件名 + .bak-时间戳”这种我们自己产生的备份，绝不碰用户其他插件。
$stalePatterns = @('dsh-workbuddy-xdpool.bak-*', 'dsh-purge.bak-*')
$staleCount = 0
foreach ($dir in @($nodeModulesDir, $pluginsDir)) {
    foreach ($pattern in $stalePatterns) {
        Get-ChildItem -LiteralPath $dir -Filter $pattern -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
                $staleCount += 1
            } catch { }
        }
    }
}
if ($staleCount -gt 0) { Write-Ok "已清理 $staleCount 个旧版本残留备份" }

Write-Host ""
Write-Step "2/3 注册到 DSH profile"

# 备份现有 profile
if (Test-Path -LiteralPath $packageJsonPath) {
    $bakPath = "$packageJsonPath.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $packageJsonPath -Destination $bakPath -Force
    Write-Ok "已备份原配置 -> $(Split-Path $bakPath -Leaf)"
}

# 读出（容忍 BOM 与空文件），补齐字段，整体写回。全程不做 Add-Member。
$profileObj = $null
if (Test-Path -LiteralPath $packageJsonPath) {
    $raw = [System.IO.File]::ReadAllText($packageJsonPath)
    $raw = $raw.TrimStart([char]0xFEFF)          # 关键：去掉可能存在的 BOM
    if ($raw.Trim().Length -gt 0) {
        try { $profileObj = $raw | ConvertFrom-Json }
        catch {
            Write-Warn2 "现有 profile 无法解析，将重建（原文件已备份）"
            $profileObj = $null
        }
    }
}
if ($null -eq $profileObj) {
    $profileObj = [PSCustomObject]@{ name = 'dsh-profile-desktop'; private = $true }
}

# --- dependencies ---
$deps = @{}
if ($profileObj.PSObject.Properties['dependencies'] -and $profileObj.dependencies) {
    $profileObj.dependencies.PSObject.Properties | ForEach-Object { $deps[$_.Name] = $_.Value }
}
$deps['dsh-workbuddy-xdpool'] = 'file:../../plugins/dsh-workbuddy-xdpool'
$deps['dsh-purge']            = 'file:../../plugins/dsh-purge'

# --- dsh.profile.bundles ---
# Order matters for readability, not for loading: the two official bundles first,
# then ours. Existing entries are kept (so another plugin's entry is not silently
# dropped), but the result is normalised instead of appending to whatever order
# the previous version of this script happened to leave behind.
$existingBundles = @()
try { $existingBundles = @($profileObj.dsh.profile.bundles) } catch { }
$seen    = New-Object System.Collections.Generic.HashSet[string]
$bundles = New-Object System.Collections.Generic.List[string]
foreach ($b in @('@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-purge', 'dsh-workbuddy-xdpool')) {
    if ($seen.Add($b)) { $bundles.Add($b) }
}
# Anything else the profile already had keeps its relative order at the end.
foreach ($b in $existingBundles) {
    $name = [string]$b
    if ($name -and $seen.Add($name)) { $bundles.Add($name) }
}

$out = [ordered]@{
    name         = if ($profileObj.PSObject.Properties['name']) { $profileObj.name } else { 'dsh-profile-desktop' }
    private      = $true
    dependencies = $deps
    dsh          = @{ profile = @{ bundles = @($bundles) } }
}
$json = $out | ConvertTo-Json -Depth 12
Write-Utf8NoBom $packageJsonPath $json

# 立即回读校验：DSH 用 JSON.parse，任何 BOM/语法问题都要在这里暴露，而不是等用户发现
$verifyRaw = [System.IO.File]::ReadAllText($packageJsonPath)
if ($verifyRaw.Length -gt 0 -and $verifyRaw[0] -eq [char]0xFEFF) {
    Write-Err "写入的配置文件带 BOM，DSH 将无法解析。已中止。"
    Read-Host "按回车退出"
    exit 1
}
try {
    $check = $verifyRaw | ConvertFrom-Json
    $okBundles = @($check.dsh.profile.bundles)
    if ($okBundles -notcontains 'dsh-workbuddy-xdpool') { throw 'bundles 缺少 dsh-workbuddy-xdpool' }
    if ($okBundles -notcontains 'dsh-purge')            { throw 'bundles 缺少 dsh-purge' }
    Write-Ok "配置已写入并校验通过（无 BOM，bundles 共 $($okBundles.Count) 项）"
} catch {
    Write-Err "配置校验失败：$($_.Exception.Message)"
    Write-Host "   原配置已备份，可手动还原后反馈问题。" -ForegroundColor Yellow
    Read-Host "按回车退出"
    exit 1
}

Write-Host ""
Write-Step "3/3 检查 DSH 是否正在运行"
$running = @(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like '*DeepSeek*Harness*' })
if ($running.Count -gt 0) {
    Write-Warn2 "检测到 DSH 正在运行（$($running.Count) 个进程）"
    Write-Host "       插件只在 DSH 启动时加载。请【完全退出】DSH 后重新打开，" -ForegroundColor Yellow
    Write-Host "       包括右下角托盘图标（右键 → 退出），否则新插件不会生效。" -ForegroundColor Yellow
} else {
    Write-Ok "DSH 未在运行，可以直接打开"
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   安装完成！" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "接下来：" -ForegroundColor Cyan
Write-Host "  1. 完全退出 DSH（含托盘图标），重新打开"
Write-Host "  2. 确保 WorkBuddy 桌面端已登录至少一个账号"
Write-Host "  3. 打开 DSH 设置 → 左侧出现「WorkBuddy 积分池」面板"
Write-Host "  4. 对话界面右上角选择 WorkBuddy 模型即可使用"
Write-Host ""
Write-Host "如果设置里没有出现面板：" -ForegroundColor Gray
Write-Host "  - 确认是「完全退出」而不是关窗口（托盘图标也要退）" -ForegroundColor Gray
Write-Host "  - 重新运行本脚本一次，脚本会重新建立链接" -ForegroundColor Gray
Write-Host "  - 仍不行请把本窗口截图发给提供者" -ForegroundColor Gray
Write-Host ""
Read-Host "按回车关闭"
