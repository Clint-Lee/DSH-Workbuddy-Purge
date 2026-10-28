# DeepSeek Harness (DSH) 接入 WorkBuddy XD Pool 完整配置教程
> **功能简介**：将本地登录过的 WorkBuddy 桌面端账号转化为 DeepSeek Harness 的模型池，支持自动容错轮换与故障转移，并附带后台全自动签到和每日任务赚积分，实现免费/低成本在 DSH 中调用各类主流大模型。

---
## 准备工作
在配置前，请确保目标电脑已具备以下环境：
1. **已安装并登录 WorkBuddy 桌面端**（国内版或国际版均可；若有多账号，在桌面客户端中依次切换登录一遍，插件即可自动捕获凭据快照）。
2. **已安装并运行过 DeepSeek Harness 桌面端**（确保本地已生成 `~/.dsh/` 配置目录）。
3. **系统环境**：已安装 Git、Node.js 与 `pnpm`（若未安装 pnpm，可通过 `npm install -g pnpm` 安装）。

---
## 详细安装与配置步骤

### 步骤一：拉取 GitHub 仓库到本地
打开终端（PowerShell 或 CMD），进入你想存放项目的目录（例如 `D:\Projects\`），克隆仓库：
```powershell
git clone https://github.com/XDTrees/dsh-workbuddy-xdpool.git
```
> **说明**：仓库中已内置预编译好的构建产物（`lib/` 目录），克隆完成后**无需**执行手动编译或单独运行命令。

### 步骤二：将插件关联到 DSH 插件目录（创建软链接/Junction）
以 Windows PowerShell 为例，执行以下命令将刚克隆的目录软链到 DSH 的全局插件目录：
```powershell
# 请将 Target 路径替换为你实际克隆该项目的绝对路径
New-Item -ItemType Junction -Path "$HOME\.dsh\plugins\dsh-workbuddy-xdpool" -Target "D:\你的克隆路径\dsh-workbuddy-xdpool"
```

### 步骤三：在 DSH 桌面端配置中注册插件
打开文件：`C:\Users\<你的电脑用户名>\.dsh\profiles\desktop\package.json`
在 `dependencies` 和 `dsh.profile.bundles` 中分别追加 `dsh-workbuddy-xdpool`，修改后示例如下：
```json
{
  "name": "dsh-profile-desktop",
  "private": true,
  "dependencies": {
    "dsh-workbuddy-xdpool": "file:../../plugins/dsh-workbuddy-xdpool"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-workbuddy-xdpool"
      ]
    }
  }
}
```
> **提示**：若你之前安装过其他插件（如 `dsh-purge`），请保留原有依赖，在数组和对象末尾加上逗号继续追加即可。

### 步骤四：安装并同步插件依赖
在 PowerShell 中进入 DSH desktop 目录，运行 `pnpm install`：
```powershell
cd $HOME\.dsh\profiles\desktop
pnpm install
```
* **常见提示**：控制台若出现 `WARN Issues with peer dependencies found (missing peer @deepseek-ai/cordis)` 属于正常现象，因为 cordis 是 DSH 宿主环境自带的核心。
* 只要输出显示 `added ... done` 即代表安装成功。

### 步骤五：完全重启 DeepSeek Harness
1. 彻底退出当前正在运行的 DeepSeek Harness 客户端（若托盘区有图标也右键彻底退出）。
2. 重新启动 DeepSeek Harness。

### 步骤六：DSH 界面配置与勾选模型（关键必做）
1. **打开设置面板**：在 DSH 界面点击左下角齿轮或按快捷键 `Ctrl + Alt + ,`，顶部标签页会新增一个 **`XD Pool`**，点击进入。
2. **调整运行设置**：
   * **版本选择**：根据你登录的账号选择【国内版】或【国际版】。
   * **账号使用方式**：建议点击选择 **【每对话固定 (推荐)】**（保护上下文缓存，提速且省额度）或 **【先花快到期的】**。
   * **积分自动化**：点击设置为 **【开启】**（插件后台每日自动做任务领积分、自动打卡签到）。
3. **勾选并启用模型（最关键一步）**：
   * 向下滚动到 **“模型”** 区域（默认通常显示为 `已启用 0 / 17`）。
   * 勾选你想要在 DSH 聊天中调用的模型，推荐勾选：
     * ☑ **`Hy3` (免费)**：0 积分消耗，无限免费使用。
     * ☑ **`Deepseek-V4.1-Flash`**：0.11x 低倍率，100 万上下文。
     * ☑ **`Deepseek-V4-Pro`**：0.51x 积分，推理和逻辑能力更强。
     * ☑ **`Hy4 preview`**：0.29x 积分，腾讯混元最新预览版。
     * ☑ **`GLM-5.3`**：代码和复杂任务综合表现突出。
   * 若有识别图片需求，勾选对应模型右侧的 **☑ 图片输入**。
   * **重要**：勾选完成后，**必须点击右上角的【保存】按钮**！

### 步骤七：在聊天中选择模型开始使用
1. 返回 DSH 聊天对话主界面。
2. 点击输入框上方的**模型切换器**。
3. 展开并选择提供商 **`WorkBuddy XD Pool（国内版）`** 下的对应模型（如 `Deepseek-V4.1-Flash` 或 `Hy3`）。
4. 正常发起提问或写代码，此时请求将自动消耗 WorkBuddy 的积分与免费额度！
