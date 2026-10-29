# 接手文档（HANDOFF）

> 给下一台设备上的自己/协作者。状态截至 **2026-10-28 23:5x**。
> 读这份就知道：仓库在哪、装好后是什么状态、哪些事做完了、哪些还没做完、下一步点哪里。

---

## 1. 仓库与远端

| 项 | 值 |
| --- | --- |
| 本地路径 | `D:\Extends\DSHProj\Demo\dsh-workbuddy-xdpool` |
| 远端 | `https://github.com/Libaoyun/DSH-Workbuddy-Purge` |
| 分支 | `main` |
| 结构 | 根包 `dsh-workbuddy-xdpool`（模型池）+ `packages/dsh-purge`（破甲） |

旧的两个上游仓库仍在本地，**不要删**，是回滚点：

- `D:\Extends\antigravityProj\Pojia\dsh-workbuddy-xdpool`（1.8.3）
- `D:\Extends\antigravityProj\Pojia\dsh-purge`（1.1.71）

## 2. 装到 DSH 的关键事实（踩过的坑）

1. **两个包各带自己的 `cordis.patch.yml`，不能合并成一份。**
   DSH 校验 patch 条目的 `name` 必须与目标条目**完全同名**；写成 `dsh-workbuddy-xdpool/purge`
   会被判 `name mismatch` 并跳过（实测报错：`patch: name mismatch for "dsh-purge"`）。
   所以 purge 必须作为可解析的包名 `dsh-purge` 存在。

2. **需要两处链接 × 两个包 = 4 条 junction。**

   ```
   ~/.dsh/plugins/dsh-workbuddy-xdpool                        -> <repo>
   ~/.dsh/plugins/dsh-purge                                   -> <repo>\packages\dsh-purge
   ~/.dsh/profiles/desktop/node_modules/dsh-workbuddy-xdpool   -> <repo>
   ~/.dsh/profiles/desktop/node_modules/dsh-purge              -> <repo>\packages\dsh-purge
   ```

3. **改完必须完全退出 DSH 再开。** 插件在 host 进程启动时一次性加载，热改文件不生效。

4. **本机 pnpm 装不齐依赖，`tsdown` 跑不起来。**
   `pnpm install` 会失败在 `@deepseek-ai/dsh-invariants` / `dsh-session` 的版本上（registry 上
   没有 `>=0.1.5 <0.2.0-0` 的版本）。
   → 所以 `lib/*.js` 是**手工同步**的：改 `src` 之后，必须把等价改动**手动落进 `lib/index.js`
   与 `lib/client.js`**，否则 DSH 加载的还是旧的。

## 3. 已完成

| 事项 | 说明 |
| --- | --- |
| 11128 渠道验证修复 | 两级触发点：`developer` 角色 + 指令内容被过滤。三级自愈，见 `docs/incident-11128.md` |
| 合并成单仓库 | purge 整体进 `packages/dsh-purge`，源码未改，LICENSE/署名保留 |
| QUICKSTART.md | 首次使用五步 |
| NOTICE.md | 归属与许可（含 purge 作者声明照录） |
| docs/incident-11128.md | 故障复盘（证据表 + 复现命令） |
| probe/ | 取证脚本，`probe/README.md` 说明哪些需要自己生成数据 |
| README 重写 | 明确写成「两个子系统」，补上 purge 破甲一节 |

## 4. 未完成 / 待办

### 4.1 卡片样式（1.8.7 已重排，旧的建议是错的，见下）

`src/client/styles.ts` 是 token 驱动的视觉语言，**功能与 class 名一个没动**。

1.8.7 的结论，先说最容易被误判的一条：**「把卡片调深一点」不是这个问题的解**。
1.8.6 按 12% 灰把整块面板染色，颜色确实分开了，但整页更像线框图——每个元素
都被染色，就没有任何东西比别的东西更重。真正的修法是**结构**，不是明度：

- **一个面，不是五个盒子**。整列是一块连续面板（白底 / 暗色 `layer-2`），
  四周一条边，内部用细分隔线分区。用户能看出「这里是一个物件」。
- **灰只给选中和被测量的东西**：选中的模式芯片、总计划面、悬停行。其余是白。
- **投影清零**，只留 1px 顶部高光。每块卡片各自浮起 = 廉价。
- **不要在卡片里再放卡片**（账号行、模型列表都踩过）。层级差用细分隔线表达。
- **内部凹陷块**（自动化）在白面板上会像贴了块灰砖，改成细线小节。

文案层面：界面不再出现包名。标题是 `WorkBuddy 积分池`，健康提示不再拼接
`status.shim.baseUrl`（那串里含 `/plugins/dsh-workbuddy-xdpool`）。

> ⚠️ **上一版这里写的「用 `@media (prefers-color-scheme:light)` 覆盖」是错的，别照做。**
> 实测 DSH 的主题落在文档属性上，不是媒体查询：主题 presenter 写
> `html{color-scheme}`，再给 `<body>` **加** `data-ds-dark-theme`，亮色就是「没有这个属性」。
> DSH 自己所有 `--dsw-*` 样式表都是这个写法（`body[data-ds-dark-theme] .x{...}` 盖在亮色基础上）。
> 用媒体查询的话，用户在 DSH 里把主题钉死成暗色、而系统是亮色时，卡片会被刷成浅色夹在深色页面里。

1.8.6 的做法与结论：

- **亮色是基准，暗色覆盖**：`body[data-ds-dark-theme]` / `html[data-ds-dark-theme]` 里重设同一批 token。
- **亮色卡片 12%、暗色 7%**：亮色 `layer-1/2/3` 全是 `#fff`，7% 只到 3% 灰；暗色 `layer-2` 已是 `#2c2c2e`，12% 会冲淡。
- **抬起的方向两套主题相反**：暗色「抬起 = 往标签色混」，亮色「抬起 = 用回 `layer-3` 的纯白」，否则选中的分段控件比轨道还暗，看着像坑。
- **状态色的真名**：`--dsw-alias-state-warn-primary`（不是 `warning`）；`*-subtle` 系列**根本不存在**，原来引用它们等于永远走兜底值。填充/文字/胶囊文字三种角色分别用 `--wbx-ok`、`-ink`、`-pill-ink`。
- **tint 要混进卡片色**，不能混进透明：半透明琥珀落在胶囊里会合成近乎实心色，上面的字直接消失。

验证不是靠眼睛：`qa-card.mjs` 用 Chromium 无头 + 真实 token 值渲染亮/暗两版，算 41 个文字角色的对比度（正文 ≥4.5、大字 ≥3），当前全部通过。

已知仍未做：`packages/dsh-purge` 自己的那张卡（`client.js`，507KB）没有按这套 token 语言整理过，亮色下它的观感还是独立的。

### 4.2 GitHub contributors 显示两个人

`https://github.com/Libaoyun/DSH-Workbuddy-Purge/graphs/contributors` 会列出
**XDTrees/aosi526** 和 **Libaoyun** 两个人，因为历史里保留了 85 个上游提交
（68 个 `aosi526`、17 个 `XDAGZ`、1 个 `Libaoyun`）。

**要只剩一个 contributor，必须重写历史**，把 86 个提交压成一个由 `Libaoyun` 提交的初始提交，
然后 force push：

```powershell
cd <repo>
# 1) 备份（已建过 backup-before-squash 分支，可复用或重建）
git branch backup-before-squash

# 2) 压成一个提交（保留工作树，重置历史）
git checkout --orphan clean-main
git add -A
git -c user.name="Libaoyun" -c user.email="你的邮箱" commit -m "init: DSH Workbuddy × Purge"

# 3) 替换 main 并强推
git branch -D main
git branch -m main
git push -f origin main
```

注意：
- force push 后远端历史不可恢复，本地 `backup-before-squash` 分支是唯一退路，确认没问题再删。
- 压成一个提交会丢失上游 1.8.3 / 1.1.71 的逐条变更记录。若想保留可读历史，代价是 contributors 仍显示上游作者——二者不可兼得。
- GitHub 的 contributor 缓存需要几分钟到几小时才刷新。

### 4.3 其它

- `lib/index.d.ts` 未随源码更新（`tsdown` 跑不了），类型层面可能与 `src` 有偏差；运行不受影响。
- `packages/dsh-purge` 内的 `PNPM` 相关产物未动，其自带 `.github/workflows` 也未改。
- 合并后**未在干净环境验证过一遍安装流程**（只在本机验证过）。QUICKSTART 的第 2–3 步建议在新设备上按文档走一遍，有偏差就回来修文档。

## 5. 验证清单（改完必跑）

```powershell
# 语法
node --check lib/index.js
node --check lib/client.js

# 池子活着（正式实例默认 19387）
Invoke-RestMethod http://127.0.0.1:19387/plugins/dsh-workbuddy-xdpool/status | Select accounts,region,shim

# 端到端：真 shim + 真上游（源码侧）
node probe/shim-e2e.mjs
node probe/inband-e2e.mjs   # 需先按 probe/README.md 生成 probe/data/failing-request.json
```

## 6. 危险操作提醒

- **不要用 `Get-Process | Where-Object {...} | Stop-Process` 这种宽条件杀进程**，
  本机同时跑着正式实例（用户正在用）和测试实例，宽条件会误杀。
  只按明确 PID 停：`Stop-Process -Id <pid>`。
- 测试用隔离 profile（复制 `profiles/desktop` 后改 `node_modules` 链接），**不要直接在正式 profile 上试**。
- 用 `Set-Content -Encoding UTF8` 写给 DSH 的 `package.json` 会带 BOM，DSH 的
  `JSON.parse` 会直接报错。写这类文件用：

  ```powershell
  [System.IO.File]::WriteAllText($p, $json, (New-Object System.Text.UTF8Encoding($false)))
  ```
