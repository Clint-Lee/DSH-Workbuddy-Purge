# 快速上手（5 分钟）

本仓库是一个 DSH 插件包，装好后给你两样东西：

1. **WorkBuddy 模型池** —— 把你本机已登录的 WorkBuddy 账号接进 DSH，按积分自动轮换；
2. **提示清洗 / 演练台**（`packages/dsh-purge`）—— 可选的系统提示处理子包。

---

## 前提

- Windows，已装 **DeepSeek Harness**（桌面端）并能正常打开
- 已装 **WorkBuddy 桌面端**，并且**登录过至少一个账号**（插件只读它的登录态，不另开登录流程）
- Node.js ≥ 22（`node -v` 确认）

---

## 第 1 步：把仓库拿到本地

```powershell
git clone https://github.com/Libaoyun/DSH-Workbuddy-Purge.git
cd DSH-Workbuddy-Purge
```

记住这个目录的**绝对路径**，例如 `D:\DSH-Workbuddy-Purge`。

---

## 第 2 步：把两个包链进 DSH

DSH 的插件目录是 `%USERPROFILE%\.dsh\plugins\`。用链接指向仓库（不要复制，方便以后 `git pull` 更新）：

```powershell
$repo = "D:\DSH-Workbuddy-Purge"          # ← 改成你上一步的实际路径

# 模型池（主包）
cmd /c rmdir "$env:USERPROFILE\.dsh\plugins\dsh-workbuddy-xdpool" 2>$null
New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\plugins\dsh-workbuddy-xdpool" -Target $repo

# 提示清洗（子包）
cmd /c rmdir "$env:USERPROFILE\.dsh\plugins\dsh-purge" 2>$null
New-Item -ItemType Junction -Path "$env:USERPROFILE\.dsh\plugins\dsh-purge" -Target "$repo\packages\dsh-purge"
```

---

## 第 3 步：让 profile 认识这两个包

编辑 `%USERPROFILE%\.dsh\profiles\desktop\package.json`，确保 `dependencies` 和 `bundles` 都有这两项：

```json
{
  "dependencies": {
    "dsh-purge": "file:../../plugins/dsh-purge",
    "dsh-workbuddy-xdpool": "file:../../plugins/dsh-workbuddy-xdpool"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-purge",
        "dsh-workbuddy-xdpool"
      ]
    }
  }
}
```

然后在 profile 的 `node_modules` 里放两个同样的链接：

```powershell
$repo = "D:\DSH-Workbuddy-Purge"
$nm   = "$env:USERPROFILE\.dsh\profiles\desktop\node_modules"
cmd /c rmdir "$nm\dsh-workbuddy-xdpool" 2>$null
cmd /c rmdir "$nm\dsh-purge" 2>$null
New-Item -ItemType Junction -Path "$nm\dsh-workbuddy-xdpool" -Target $repo
New-Item -ItemType Junction -Path "$nm\dsh-purge" -Target "$repo\packages\dsh-purge"
```

---

## 第 4 步：重启 DSH 并选模型

1. **完全退出** DeepSeek Harness（托盘图标也要退），再重新打开；
2. 打开设置，左侧应多出 **WorkBuddy XD Pool** 卡片，能看到账号和积分；
3. 在模型选择里选 `WorkBuddy XD Pool（国内版）` 下的任意模型，发一句话测试。

> 插件在 host 进程启动时一次性加载，**改完文件必须重启**，热改不生效。

---

## 常见问题

**卡片显示找不到 WorkBuddy / 没有账号**
WorkBuddy 没登录过，或装在插件没探测到的路径。设环境变量指向它：

```powershell
[Environment]::SetEnvironmentVariable("WORKBUDDY_APP_EXECUTABLE",
  "D:\你的路径\WorkBuddy\WorkBuddy.exe", "User")
```
然后重启 DSH。

**第一轮回复慢 1–2 秒**
正常。若系统提示被上游内容过滤拦下，插件会自动重建请求体重发（最多多两次），成功后记住该形状，
之后每轮直达。日志里能看到 `resending from the gateway whitelist` / `in-band instructions accepted`。

**报 11128 / 渠道验证失败**
见 [docs/incident-11128.md](docs/incident-11128.md)，那里有完整的原因和自愈逻辑说明。

**想更新**
```powershell
cd D:\DSH-Workbuddy-Purge
git pull
```
然后重启 DSH 即可（链接不用重建）。
