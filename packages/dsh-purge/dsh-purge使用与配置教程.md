# DeepSeek Harness (DSH) 插件 dsh-purge 使用与配置教程
> **功能简介**：`dsh-purge` 是专为 DeepSeek Harness 设计的本地增强插件，主要用于**解除官方模型的软拒答与系统提示词限制**、**绕过文件与命令执行的频繁审批弹窗**、提供**会话无损回退（`/rewind`）**，并内置安全评测演练台与 20+ 项扩展技能。

---

## ⚡ 极速安装（最简单推荐：Win + R 一键运行）
如果目标电脑已装好 DeepSeek Harness 官方桌面客户端（0.2.x 版本），无需手动克隆代码或配置环境，按快捷键 **`Win + R`** 打开运行窗口，直接粘贴以下协议链接并回车：

```text
dsh://plugin/install?id=dsh-purge&name=dsh-purge&version=1.1.66&repo=YuJunZhiXue%2Fdsh-purge&permissions=%E7%B3%BB%E7%BB%9F%E6%8F%90%E7%A4%BA%E8%AF%8D%E6%B3%A8%E5%85%A5%2C%E6%9C%AC%E6%9C%BA%E8%A1%A5%E4%B8%81%2C%E8%AE%BE%E7%BD%AE%E9%A1%B5&downloadUrl=https%3A%2F%2Fgithub.com%2FYuJunZhiXue%2Fdsh-purge%2Farchive%2Frefs%2Fheads%2Fmaster.tar.gz
```
*客户端会自动拉取包完成安装，安装完成后直接跳到下方的 [重启与激活补丁](#重启与激活补丁关键步骤) 即可。*

---

## 🛠️ 本地源码安装（若需拉取 GitHub 仓库）
若要在新电脑拉取源码进行二次开发、修改提示词或本地调试，请按以下步骤操作：

### 步骤 1：克隆 GitHub 项目到本地
在终端中进入存放工程的目录（如 `D:\Projects\`）执行克隆：
```powershell
git clone https://github.com/YuJunZhiXue/dsh-purge.git
cd dsh-purge
```
*(注：该插件由 DSH 桌面端作为模块直接加载，**无需**在本地额外运行 `npm run dev` 启动服务)*

### 步骤 2：将插件关联到 DSH 桌面端
*以下两种关联方式任选其一：*

* **方式 A：命令行一键关联（若已配置 dsh 环境变量）**
  在 `dsh-purge` 项目根目录下运行：
  ```powershell
  dsh plugin --profile desktop add .
  ```
  *(若提示找不到 dsh，可直接调用 DSH 安装目录内置命令，如：`& "D:\Softwares\DSHarness\resources\runtime\cli\bin\dsh.cmd" plugin --profile desktop add .`)*

* **方式 B：手动软链接配置（100% 成功，无需配环境变量）**
  1. 创建目录联接（将本地工程软链至 DSH 插件目录）：
     ```powershell
     New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dsh\plugins"
     cmd /c mklink /J "$env:USERPROFILE\.dsh\plugins\dsh-purge" "$PWD"
     ```
  2. 修改 `$env:USERPROFILE\.dsh\profiles\desktop\package.json`（**必须无 BOM UTF-8 保存**）：
     ```json
     {
       "name": "dsh-profile-desktop",
       "private": true,
       "dependencies": {
         "dsh-purge": "file:../../plugins/dsh-purge"
       },
       "dsh": {
         "profile": {
           "bundles": [
             "@deepseek-ai/dsh-base",
             "@deepseek-ai/dsh-web-app",
             "dsh-purge"
           ]
         }
       }
     }
     ```
  3. 执行安装依赖：
     ```powershell
     cd "$env:USERPROFILE\.dsh\profiles\desktop"
     pnpm install
     ```

---

## 🔄 重启与激活补丁（关键步骤）
> ⚠️ 插件装好后尚未修改底层内核文件，必须执行以下两步触发实际注入：

1. **完全退出并重启 DSH 客户端**：
   查看屏幕右下角 **Windows 系统托盘**，右键 DSH 图标选择 **“退出”**，然后重新启动软件（不要只点右上角 ×）。
2. **在界面点击「应用」**：
   - 打开任意对话，点击会话标题右侧新增的 **`dsh-purge`** 按钮展开侧栏；
   - 在「清洗」页面点击 **「应用」**（或在输入框发送 `/purge apply`）；
   - 补丁打入成功后，**客户端会自动重启一次**。

---

## ✅ 验证是否生效
重启后新建一轮对话进行测试：
1. **测试人设**：向它提问 `你是谁？`，若不再回答“我是 DeepSeek 的 AI 助手...”，说明人设已成功剥离。
2. **测试状态**：在输入框发送 `/purge status`，检查是否输出补丁清单（核心显示 `72/74` 即成功）。
3. **免审批测试**：输入框左侧权限标签会自动变为 **`完全权限`**，执行系统命令和读写文件时不再频繁弹窗阻断。

---

## 📌 常用操作与一键还原
* **无损撤回**：聊天发送 `/rewind`（或点输入框旁回退按钮），可将上一轮提问放回输入框重新编辑发送。
* **一键恢复原版**：聊天发送 `/purge revert`（或在侧栏点「还原」），会自动使用备份文件恢复官方纯净状态。
